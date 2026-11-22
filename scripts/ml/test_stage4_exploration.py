"""AI mode must preserve unknown, isolation and one-test constraints."""
import contextlib
import copy
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image
import explore_stage4 as explore
from dataset_common import DEFAULT_RAW, write_json
from experiment_stage4 import PLAN, inference_schema, read_plan, seal, unseal
from stage2_common import PipelineBlocked, load_definitions, load_taxonomy


class ExplorationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.home, self.reports = self.root / 'control', self.root / 'reports'
        self.home.mkdir()
        self.categories, self.definitions = load_taxonomy(), load_definitions(DEFAULT_RAW)
        plan = read_plan(PLAN)
        plan['bootstrap'] = 2
        self.config = {'model': 'fixture', 'plan': plan, 'scored_classes': [c['name'] for c in self.categories if c['name'] != 'other']}
        self.rows, self.records = [], {}
        for split in ['train', 'val', 'test']:
            row = {'image_id': split, 'dataset_split': split, 'group_id': split, 'room': 'bedroom', 'file': 'images/fixture.jpg', 'sha256': 'fixture'}
            self.rows.append(row)
            risks = {d['risk_id']: {'present': 'unknown', 'visible': 'unknown', 'applicable': 'bedroom' in d['registry_rooms'],
                'severity': 'UNKNOWN', 'evidence': 'Insufficient visual evidence'} for d in self.definitions}
            self.records[split] = {'image_id': split, 'objects': [{'category': 'bed', 'bbox': {'xMin': .1, 'yMin': .1, 'xMax': .9, 'yMax': .9},
                'confidence': 1, 'evidence': 'AI visual reference'}], 'risks': risks}
            write_json(self.home / ('references_' + split + '.json'), seal({'images': [self.records[split]]}))
        owner = self
        class Fake(explore.AIPredictor):
            def predict(self, row, experiment):
                owner.called.append((row['dataset_split'], experiment['id']))
                self.calls += 1
                return {'status': 'success', **copy.deepcopy(owner.records[row['dataset_split']])}
        self.fake, self.called = Fake, []

    def run_action(self, action):
        with patch.object(explore, 'load_ready', return_value=(self.rows, self.config, 'fixture', self.categories, self.definitions)), \
             patch.object(explore, 'AIPredictor', self.fake), contextlib.redirect_stdout(io.StringIO()):
            return explore.run(action, 'fixture', self.home, self.reports)

    def test_no_HIGH_selects_objects_only_and_final_test_is_once(self):
        result = self.run_action('val')
        self.assertEqual(result['winner'], 'baseline')
        report = unseal(self.home / 'comparison.json')
        self.assertEqual(report['selection_basis'], 'objects_only_no_HIGH_positive_reference')
        self.assertFalse(report['official_accuracy'])
        self.assertTrue(all(split == 'val' for split, _ in self.called))
        self.assertEqual(len(self.called), 8)
        final = self.run_action('final-test')
        self.assertEqual(final['status'], 'exploratory_complete')
        self.assertEqual(self.called[-1], ('test', 'baseline'))
        self.assertEqual(self.run_action('final-test')['api_calls'], 0)
        self.assertEqual(self.run_action('val')['api_calls'], 0)
        self.assertEqual(len(self.called), 9)

    def test_validation_does_not_parse_test_reference(self):
        (self.home / 'references_test.json').write_text('not valid JSON', encoding='utf-8')
        self.assertEqual(self.run_action('val')['status'], 'validation_complete')

    def test_test_cannot_start_without_validation(self):
        with self.assertRaises(PipelineBlocked):
            self.run_action('final-test')
        self.assertFalse(self.called)

    def test_failure_configuration_is_not_eligible_even_with_higher_map(self):
        experiments = [{'id': 'a'}, {'id': 'b'}]
        results = {'a': {'status': 'incomplete', 'summary': {'high_positive': 0, 'map50': 1}},
                   'b': {'status': 'completed', 'summary': {'high_positive': 0, 'map50': .1}}}
        self.assertEqual(explore.choose(results, experiments)[0], 'b')
        self.assertIsNone(explore.choose({'a': results['a']}, experiments)[0])

    def test_AI_reference_never_invents_measurements_or_human_status(self):
        (self.root / 'images').mkdir()
        Image.new('RGB', (100, 100)).save(self.root / 'images/fixture.jpg')
        row = self.rows[0]
        record = explore.reference(row, {'objects': [['bed', 10, 10, 90, 90]], 'note': 'Floor outside frame'},
                                   self.categories, self.definitions, self.root)
        self.assertFalse(record['human_verified'])
        self.assertEqual(record['review_status'], 'ai_reference_not_human_verified')
        self.assertTrue(all(r['present'] == 'unknown' for r in record['risks'].values()))
        with self.assertRaises(ValueError):
            explore.reference(row, {'objects': [], 'note': 'Guess', 'known': {'RISK-004': False}},
                              self.categories, self.definitions, self.root)

    def test_serving_schema_prevents_measured_claims_without_cross_risk_mutation(self):
        schema = inference_schema(self.categories, self.definitions, 'bedroom', None, True)
        risks = schema['properties']['risks']['properties']
        self.assertEqual(risks['RISK-004']['properties']['present']['enum'], ['unknown'])
        self.assertEqual(risks['RISK-006']['properties']['applicable']['enum'], [False])
        self.assertIn('anyOf', risks['RISK-001']['properties']['present'])
        bathroom = inference_schema(self.categories, self.definitions, 'bathroom', ['RISK-006'], False)
        self.assertIn('anyOf', bathroom['properties']['risks']['properties']['RISK-006']['properties']['present'])
        self.assertEqual(risks['RISK-006']['properties']['applicable']['enum'], [False])


if __name__ == '__main__':
    unittest.main()
