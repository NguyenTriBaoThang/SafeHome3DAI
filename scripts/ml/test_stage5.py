"""Meaningful Stage 5 gates on synthetic temporary fixtures; no real training/approval."""
import contextlib
import copy
import io
import json
import random
import ast
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image
import import_verified
import test_baseline
import test_stage2
from dataset_common import sha256_file, write_json
from detector_stage5 import decode, unknown_risks
from experiment_stage4 import seal, unseal
from final_test_stage5 import final_test
from stage2_common import PipelineBlocked, digest, load_frozen
from stage5_common import export_bundle, inspect, load_training_bundle, read_plan, support
from train_detector import augment, train
from build_stage5_notebook import build


class Stage5Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        test_stage2.Stage2Tests.setUpClass.__func__(cls)

    def setUp(self):
        test_stage2.Stage2Tests.setUp(self)
        self.plan = read_plan()
        for key in self.plan['minimums']:
            if not key.startswith('risk_'):
                self.plan['minimums'][key] = 1
        self.plan['training']['bootstrap'] = 8
        self.plan_path = self.root / 'plan.json'
        write_json(self.plan_path, self.plan)
        self.stage4 = self.root / 'official-val.json'
        self.ai_protocol = self.root / 'no-ai-protocol.json'

    def approve_fixtures(self):
        test_stage2.Stage2Tests.approve_fixtures(self)

    def freeze(self):
        return test_stage2.Stage2Tests.freeze(self)

    def human_export(self, frozen):
        return test_baseline.BaselineWorkflowTests.human_export(self, frozen)

    def prepared(self):
        frozen = self.freeze()
        _, verified, _ = self.human_export(frozen)
        snapshot, rows, _, _ = load_frozen(frozen, self.raw, self.review)
        write_json(self.stage4, seal({'status': 'completed', 'winner': 'fixture',
            'ml_metrics': 'computed_from_verified_ground_truth', 'config': {'snapshot_sha256': digest(snapshot)},
            'results': {'fixture': {'status': 'completed', 'metrics': {'detection': {'map50': .5, 'classes': {'lamp': {'recall': .5, 'ap50': .5}}}}}}}))
        return frozen, verified, rows

    def inspect(self, frozen=None, verified=None):
        return inspect(self.raw, self.review, frozen or self.output / 'frozen', verified or self.root / 'missing.json',
                       self.stage4, self.ai_protocol, self.plan_path)

    def test_unreviewed_dataset_is_blocked_and_unlabeled_not_negative(self):
        report, context = self.inspect()
        self.assertFalse(report['training_permitted'])
        self.assertEqual(report['human_scene_eligible_images'], 0)
        self.assertTrue(all(row['additional_positive_images_needed'] == 50 and row['negative'] == 0 for row in report['risks']))
        with self.assertRaises(PipelineBlocked):
            export_bundle(report, context, self.raw, self.root / 'bundle')
        self.assertFalse((self.root / 'bundle').exists())

    def test_ready_export_contains_only_verified_train_val_and_no_test_annotations(self):
        frozen, verified, rows = self.prepared()
        report, context = self.inspect(frozen, verified)
        self.assertTrue(report['training_permitted'])
        self.assertEqual(report['eligible_classes'], ['lamp'])
        directory = self.root / 'bundle'
        bundle = export_bundle(report, context, self.raw, directory)
        loaded = load_training_bundle(directory / 'bundle.json', self.raw)
        self.assertEqual(bundle['images'], loaded['images'])
        self.assertEqual({row['dataset_split'] for row in bundle['images']}, {'train', 'val'})
        self.assertFalse(bundle['test_annotations_included'])
        self.assertTrue(all('risks' not in row for row in bundle['images']))
        self.assertEqual(set(bundle['class_to_model_id'].values()), {0})
        self.assertTrue(all('author' in row and 'license_url' in row for row in bundle['images']))

    def test_AI_agreement_cannot_establish_a_need_for_training(self):
        frozen, verified, _ = self.prepared()
        write_json(self.stage4, seal({'status': 'completed', 'winner': 'fixture', 'official_accuracy': False,
            'config': {'mode': 'AI_REFERENCE_EXPLORATORY'}}))
        report, _ = self.inspect(frozen, verified)
        self.assertFalse(report['training_permitted'])

    def test_stage4_test_score_cannot_trigger_training_or_tuning(self):
        frozen, verified, _ = self.prepared()
        comparison = unseal(self.stage4)
        comparison.pop('content_sha256')
        comparison['action'] = 'final-test'
        write_json(self.stage4, seal(comparison))
        self.assertFalse(self.inspect(frozen, verified)[0]['training_permitted'])

    def test_weak_unsupported_classes_do_not_justify_retraining_an_adequate_class(self):
        frozen, verified, _ = self.prepared()
        comparison = unseal(self.stage4)
        comparison.pop('content_sha256')
        comparison['results']['fixture']['metrics']['detection'].update(map50=.1,
            classes={'lamp': {'ap50': 1., 'recall': 1.}, 'bed': {'ap50': 0., 'recall': 0.}})
        write_json(self.stage4, seal(comparison))
        report, _ = self.inspect(frozen, verified)
        self.assertFalse(report['training_permitted'])
        self.assertFalse(report['stage4_object_improvement_needed'])
        self.assertEqual(report['stage4_object_evidence']['scoped_map50'], 1.)

    def test_previously_frozen_exploratory_test_group_cannot_become_train(self):
        frozen, verified, rows = self.prepared()
        row = next(row for row in rows if row['dataset_split'] == 'train')
        write_json(self.ai_protocol, seal({'config': {'mode': 'AI_REFERENCE_EXPLORATORY'}, 'membership': [{
            'image_id': row['image_id'], 'sha256': row['sha256'], 'dataset_split': 'test'}]}))
        report, _ = self.inspect(frozen, verified)
        self.assertFalse(report['training_permitted'])
        self.assertTrue(any('test group' in reason for reason in report['blockers']))

    def test_readiness_never_parses_test_annotation_semantics(self):
        frozen, verified, _ = self.prepared()
        original = import_verified.parse_task
        def scoped(task, row, *args):
            self.assertNotEqual(row['dataset_split'], 'test')
            return original(task, row, *args)
        with patch.object(import_verified, 'parse_task', side_effect=scoped):
            self.assertTrue(self.inspect(frozen, verified)[0]['training_permitted'])

    def test_unverified_bundle_rejected_before_any_torch_import(self):
        path = self.root / 'ai.json'
        write_json(path, seal({'kind': 'AI_REFERENCE_EXPLORATORY', 'images': []}))
        with patch.dict('sys.modules', {'torch': None}):
            with self.assertRaises(PipelineBlocked):
                train(path, self.raw, self.root / 'model', 'cpu')
        self.assertFalse((self.root / 'model').exists())

    def test_insufficient_class_and_test_injection_cannot_bypass_bundle_checks(self):
        frozen, verified, _ = self.prepared()
        report, context = self.inspect(frozen, verified)
        directory = self.root / 'bundle'
        bundle = export_bundle(report, context, self.raw, directory)
        test = bundle['test_membership'][0]
        modified = copy.deepcopy(bundle)
        modified['images'][0]['group_id'] = test['group_id']
        modified.pop('content_sha256', None)
        write_json(directory / 'bundle.json', seal(modified))
        with self.assertRaisesRegex(PipelineBlocked, 'Test identity/group'):
            load_training_bundle(directory / 'bundle.json', self.raw)
        bundle['plan']['minimums']['train_objects_per_class'] = 1000
        write_json(directory / 'bundle.json', seal(bundle))
        with self.assertRaisesRegex(PipelineBlocked, 'support'):
            load_training_bundle(directory / 'bundle.json', self.raw)

    def test_support_counts_positive_images_not_number_of_duplicate_boxes(self):
        rows = [{'image_id': 'a', 'group_id': 'same', 'dataset_split': 'train'},
                {'image_id': 'b', 'group_id': 'same', 'dataset_split': 'train'}]
        risks = {key: {'applicable': True, 'present': 'unknown'} for key in unknown_risks()}
        records = [{'image_id': row['image_id'], 'objects': [{'category': 'lamp'}] * 100, 'risks': risks} for row in rows]
        objects, risk = support(rows, records, [{'name': 'lamp', 'vietnamese_name': 'Lamp'}], read_plan())
        self.assertEqual(objects[0]['train_objects_per_class'], 200)
        self.assertEqual(objects[0]['train_positive_images_per_class'], 2)
        self.assertEqual(objects[0]['train_positive_groups_per_class'], 1)
        self.assertFalse(objects[0]['eligible'])
        self.assertTrue(all(item['positive'] == 0 and item['negative'] == 0 for item in risk))

    def test_decoder_uses_query_class_sigmoid_and_normalized_clipped_boxes(self):
        objects = decode([[0, 5], [4, 0]], [[.5, .5, .4, .2], [.05, .1, .4, .4]], ['bed', 'chair'])
        self.assertEqual([item['category'] for item in objects], ['chair', 'bed'])
        self.assertAlmostEqual(objects[0]['bbox']['xMin'], .3)
        self.assertEqual(objects[1]['bbox']['xMin'], 0)
        self.assertEqual(decode([[-1000]], [[.5, .5, .2, .2]], ['bed']), [])
        with self.assertRaises(ValueError):
            decode([[float('nan')]], [[.5, .5, .2, .2]], ['bed'])
        self.assertTrue(all(value['present'] == 'unknown' for value in unknown_risks().values()))

    def test_flip_updates_boxes_and_does_not_change_original_labels(self):
        original = [{'category': 'lamp', 'bbox': {'xMin': .1, 'yMin': .2, 'xMax': .4, 'yMax': .6}}]
        plan = {**self.plan['training'], 'horizontal_flip_probability': 1}
        _, mirrored = augment(Image.new('RGB', (20, 20)), original, random.Random(17), plan)
        self.assertAlmostEqual(mirrored[0]['bbox']['xMin'], .6)
        self.assertAlmostEqual(mirrored[0]['bbox']['xMax'], .9)
        self.assertEqual(original[0]['bbox']['xMin'], .1)

    def test_notebook_has_no_outputs_and_checks_data_before_install_or_training(self):
        path = build(self.root / 'notebook.ipynb')
        book = json.loads(path.read_text(encoding='utf-8'))
        sources = []
        for cell in book['cells']:
            self.assertIn('id', cell)
            if cell['cell_type'] == 'code':
                self.assertIsNone(cell['execution_count'])
                self.assertEqual(cell['outputs'], [])
                sources.append(''.join(cell['source']))
                ast.parse(sources[-1])
        joined = '\n'.join(sources)
        self.assertLess(joined.index('bundle = load_training_bundle'), joined.index("'pip', 'install'"))
        self.assertLess(joined.index('bundle = load_training_bundle'), joined.index('scripts/ml/train_detector.py'))

    def test_training_loop_runs_one_epoch_on_tiny_random_synthetic_model_only(self):
        # Exercise real processor, loss/backward, optimizer, val and safetensors
        # saving, without downloading weights or touching the user's data.
        import torch
        from transformers import RTDetrConfig, RTDetrResNetConfig, RTDetrForObjectDetection, RTDetrImageProcessor
        torch.set_num_threads(2)
        self.plan['training'].update(epochs=1, batch_size=2, image_size=64, patience=1)
        write_json(self.plan_path, self.plan)
        frozen, verified, _ = self.prepared()
        report, context = self.inspect(frozen, verified)
        directory = self.root / 'bundle'
        export_bundle(report, context, self.raw, directory)
        configuration = RTDetrConfig(backbone_config=RTDetrResNetConfig(embedding_size=16,
            hidden_sizes=[16, 32, 64, 128], depths=[1, 1, 1, 1], layer_type='basic', out_features=['stage2', 'stage3', 'stage4']),
            encoder_in_channels=[32, 64, 128], encoder_hidden_dim=32, encoder_ffn_dim=64, encoder_attention_heads=4,
            d_model=32, decoder_in_channels=[32, 32, 32], decoder_ffn_dim=64, decoder_layers=1,
            decoder_attention_heads=4, num_queries=10, num_denoising=5, num_labels=1, disable_custom_kernels=True)
        model = RTDetrForObjectDetection(configuration)
        processor = RTDetrImageProcessor(size={'height': 64, 'width': 64}, do_normalize=False, do_pad=False)
        with patch.object(RTDetrForObjectDetection, 'from_pretrained', return_value=model), \
             patch.object(RTDetrImageProcessor, 'from_pretrained', return_value=processor), \
             contextlib.redirect_stdout(io.StringIO()):
            result = train(directory / 'bundle.json', self.raw, self.root / 'synthetic-unit-model', 'cpu')
        self.assertEqual(result['status'], 'completed')
        self.assertEqual(result['epochs_completed'], 1)
        self.assertFalse(result['test_used_for_selection'])
        self.assertFalse(result['risk_classifier_trained'])
        self.assertTrue((self.root / 'synthetic-unit-model/best/model.safetensors').is_file())

    def test_completed_final_test_reuses_results_without_repeat_inference(self):
        frozen, verified, _ = self.prepared()
        report, context = self.inspect(frozen, verified)
        directory, run_dir, onnx_dir = self.root / 'bundle', self.root / 'model', self.root / 'onnx'
        export_bundle(report, context, self.raw, directory)
        bundle = directory / 'bundle.json'
        (run_dir / 'best').mkdir(parents=True)
        onnx_dir.mkdir()
        (onnx_dir / 'detector.onnx').write_bytes(b'SYNTHETIC UNIT FIXTURE; NOT A MODEL')
        run = {'kind': 'stage5_detector_training', 'status': 'completed', 'risk_classifier_trained': False,
            'bundle_sha256': sha256_file(bundle), 'checkpoint_sha256': {}, 'classes': ['lamp'], 'untrained_classes': [], 'plan': self.plan}
        write_json(run_dir / 'run.json', seal(run))
        metadata = {'parity_passed': True, 'training_run_sha256': sha256_file(run_dir / 'run.json'), 'training_bundle_sha256': sha256_file(bundle),
            'onnx_sha256': sha256_file(onnx_dir / 'detector.onnx'), 'classes': ['lamp'], 'confidence_threshold': self.plan['training']['confidence_threshold']}
        write_json(onnx_dir / 'export.json', seal(metadata))
        calls = []
        class Fixture:
            def __init__(self, *args): pass
            def __call__(self, image):
                calls.append(True)
                return []
        with patch('final_test_stage5.OnnxDetector', Fixture), contextlib.redirect_stdout(io.StringIO()):
            result = final_test(run_dir, onnx_dir, bundle, self.raw, self.review, frozen, verified, self.root / 'reports')
            count = len(calls)
            again = final_test(run_dir, onnx_dir, bundle, self.raw, self.review, frozen, verified, self.root / 'reports')
        self.assertGreater(count, 0)
        self.assertEqual(again['new_inferences'], 0)
        self.assertEqual(count, len(calls))
        self.assertIsNone(result['risk_metrics'])


if __name__ == '__main__':
    unittest.main()
