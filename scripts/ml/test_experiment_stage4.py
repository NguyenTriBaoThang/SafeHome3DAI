"""Stage 4 guards on synthetic temporary fixtures; no real labels/images/model calls."""
import contextlib
import copy
import io
import json
import unittest
from unittest.mock import patch

import import_verified
import test_baseline
import test_stage2
from dataset_common import write_json
from experiment_stage4 import PLAN, exemplars, read_plan, run_stage4, select_winner
from import_verified import import_labels
from stage2_common import PipelineBlocked, load_frozen


class ExperimentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        test_stage2.Stage2Tests.setUpClass.__func__(cls)

    def setUp(self):
        test_stage2.Stage2Tests.setUp(self)
        self.plan = read_plan(PLAN)
        self.plan["bootstrap"] = 8
        self.plan_path = self.root / "plan.json"
        write_json(self.plan_path, self.plan)
        self.requests = []

    def approve_fixtures(self):
        test_stage2.Stage2Tests.approve_fixtures(self)

    def freeze(self):
        return test_stage2.Stage2Tests.freeze(self)

    def human_export(self, frozen):
        return test_baseline.BaselineWorkflowTests.human_export(self, frozen)

    def baseline(self, request):
        return test_baseline.BaselineWorkflowTests.predict(self, request)

    def transport(self, request):
        self.requests.append(request)
        payload = test_stage2.Stage2Tests.payload(self, request["room"])
        if request["room"] == "bedroom":
            payload["risks"]["RISK-002"].update(present=True, visible=True, severity="HIGH")
        fields = request["schema"]["properties"]
        result = {}
        if "objects" in fields:
            result["objects"] = payload["objects"]
        if "risks" in fields:
            result["risks"] = {key: payload["risks"][key] for key in fields["risks"]["properties"]}
        return {"payload": result, "modelVersion": "fixture", "usageMetadata": {"totalTokenCount": 1}}

    def detector(self, image, threshold):
        return test_stage2.Stage2Tests.payload(self)["objects"]

    def run_fixture(self, frozen, verified, **kwargs):
        with contextlib.redirect_stdout(io.StringIO()):
            return run_stage4(raw=self.raw, review=self.review, frozen=frozen, verified=verified,
                cache=self.root / "cache", reports=self.root / "reports", plan_path=self.plan_path,
                model="fixture", transport=self.transport, baseline=self.baseline, detector=self.detector, **kwargs)

    def test_unreviewed_data_blocks_every_experiment_and_test(self):
        result = self.run_fixture(self.output / "frozen", self.root / "missing.json")
        self.assertEqual(result["status"], "blocked")
        self.assertEqual(result["results"], {})
        self.assertEqual(result["api_calls"], 0)
        self.assertEqual(result["test_calls"], 0)
        self.assertIsNone(result["winner"])
        self.assertFalse(self.requests)
        self.assertFalse((self.output / "stage4_control").exists())

    def test_complete_validation_uses_only_val_targets_and_train_images_for_few_shot(self):
        frozen = self.freeze()
        _, verified, _ = self.human_export(frozen)
        report = self.run_fixture(frozen, verified)
        _, rows, _, _ = load_frozen(frozen, self.raw, self.review)
        by_id = {row["image_id"]: row for row in rows}
        self.assertEqual(report["status"], "completed")
        self.assertEqual(len(report["results"]), 8)
        self.assertEqual(report["winner"], "few_shot")  # Exact score tie: stable lexical id.
        self.assertFalse((frozen.parent / "stage4_control/final_test_lock.json").exists())
        self.assertTrue(self.requests)
        self.assertTrue(all(by_id[request["imageId"]]["dataset_split"] == "val" for request in self.requests))
        shots = [shot for request in self.requests for shot in request["examples"]]
        self.assertTrue(shots)
        self.assertTrue(all(by_id[shot["imageId"]]["dataset_split"] == "train" for shot in shots))
        self.assertTrue(all(shot["imageBase64"] for shot in shots))
        self.assertGreater(report["results"]["per_risk"]["new_gemini_invocations"], report["results"]["structured"]["new_gemini_invocations"])
        self.assertEqual(report["test_calls"], 0)

    def test_validation_does_not_parse_test_annotations(self):
        frozen = self.freeze()
        _, verified, _ = self.human_export(frozen)
        original = import_verified.parse_task
        parsed = []
        def guarded(task, row, *args):
            self.assertNotEqual(row["dataset_split"], "test")
            parsed.append(row["image_id"])
            return original(task, row, *args)
        with patch.object(import_verified, "parse_task", guarded):
            result = self.run_fixture(frozen, verified)
        self.assertEqual(result["status"], "completed")
        self.assertTrue(parsed)

    def test_missing_one_val_label_blocks_before_any_requests(self):
        frozen = self.freeze()
        source, verified, tasks = self.human_export(frozen)
        removed = next(task for task in tasks if task["data"]["split"] == "val")
        write_json(source, [task for task in tasks if task is not removed])
        import_labels(source, verified, self.raw, self.review, frozen)
        result = self.run_fixture(frozen, verified)
        self.assertEqual(result["status"], "blocked")
        self.assertFalse(self.requests)

    def test_winner_final_test_once_and_changed_config_or_val_retuning_blocked(self):
        frozen = self.freeze()
        _, verified, _ = self.human_export(frozen)
        with self.assertRaises(PipelineBlocked):
            self.run_fixture(frozen, verified, action="final-test")
        selected = self.run_fixture(frozen, verified)
        self.requests.clear()
        final = self.run_fixture(frozen, verified, action="final-test")
        self.assertEqual(final["winner"], selected["winner"])
        self.assertGreater(final["test_calls"], 0)
        _, rows, _, _ = load_frozen(frozen, self.raw, self.review)
        test_ids = {row["image_id"] for row in rows if row["dataset_split"] == "test"}
        self.assertTrue(all(request["imageId"] in test_ids for request in self.requests))
        calls = len(self.requests)
        again = self.run_fixture(frozen, verified, action="final-test")
        self.assertEqual(again["api_calls"], 0)
        self.assertTrue(again["reused_sealed_report"])
        self.assertEqual(len(self.requests), calls)
        with self.assertRaises(PipelineBlocked):
            self.run_fixture(frozen, verified)
        self.plan["seed"] += 1
        write_json(self.plan_path, self.plan)
        with self.assertRaises(PipelineBlocked):
            self.run_fixture(frozen, verified, action="final-test")

    def test_failed_experiment_is_not_selected_and_errors_are_cached(self):
        frozen = self.freeze()
        _, verified, _ = self.human_export(frozen)
        def failed(request):
            raise RuntimeError("fixture failure")
        self.transport = failed
        first = self.run_fixture(frozen, verified)
        self.assertEqual(first["status"], "incomplete")
        self.assertIsNone(first["winner"])
        self.assertGreater(first["results"]["structured"]["metrics"]["risk"]["RISK-002"]["abstain_positive"], 0)
        again = self.run_fixture(frozen, verified)
        self.assertEqual(again["api_calls"], 0)

    def test_no_high_support_or_partial_results_cannot_select_winner(self):
        experiments = [{"id": "a"}, {"id": "b"}]
        results = {"a": {"status": "completed", "summary": {"high_recall": None}}}
        self.assertIsNone(select_winner(results, experiments))
        results["b"] = copy.deepcopy(results["a"])
        self.assertIsNone(select_winner(results, experiments))

    def test_no_train_exemplars_and_invalid_plan_are_rejected(self):
        with self.assertRaises(PipelineBlocked):
            exemplars([{"dataset_split": "test", "room": "bedroom"}], {}, 1)
        self.plan["experiments"][0]["id"] = "../test"
        write_json(self.plan_path, self.plan)
        with self.assertRaises(ValueError):
            read_plan(self.plan_path)

    def test_unmeasured_risk_cannot_be_promoted_by_candidate(self):
        frozen = self.freeze()
        _, verified, _ = self.human_export(frozen)
        original = self.transport
        def unsafe(request):
            response = original(request)
            risk = response["payload"].get("risks", {}).get("RISK-004")
            if risk and risk["applicable"]:
                risk.update(present=True, visible=True, severity="HIGH")
            return response
        self.transport = unsafe
        report = self.run_fixture(frozen, verified)
        self.assertIsNone(report["winner"])
        self.assertEqual(report["results"]["structured"]["status"], "incomplete")

    def test_deleted_test_cache_after_attempt_cannot_trigger_repeat(self):
        frozen = self.freeze()
        _, verified, _ = self.human_export(frozen)
        self.run_fixture(frozen, verified)
        original = self.transport
        def interrupted(request):
            raise KeyboardInterrupt()
        self.transport = interrupted
        with self.assertRaises(KeyboardInterrupt):
            self.run_fixture(frozen, verified, action="final-test")
        self.transport = original
        with self.assertRaises(PipelineBlocked):
            self.run_fixture(frozen, verified, action="final-test")


if __name__ == "__main__":
    unittest.main()
