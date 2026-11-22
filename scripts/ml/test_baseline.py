"""Analytical metric cases and end-to-end baseline safeguards using synthetic fixtures."""
import contextlib
import copy
import csv
import io
import json
import unittest

import test_stage2
from baseline_metrics import detection_metrics, evaluate, risk_metrics
from eval_baseline import run_baseline
from export_annotations import export, ls_result
from import_verified import CONFIRMATION, import_labels, load_verified, parse_task
from stage2_common import RISK_IDS, PipelineBlocked, digest, load_frozen
from dataset_common import write_json


class MetricTests(unittest.TestCase):
    def example(self, key="a", present=True, predicted=True, objects=True):
        box = {"category": "lamp", "bbox": {"xMin": .1, "yMin": .1, "xMax": .5, "yMax": .5}}
        truth = {key: {"present": "unknown", "applicable": True, "severity": "UNKNOWN"} for key in RISK_IDS}
        truth["RISK-001"] = {"present": present, "applicable": True, "severity": "HIGH" if present is True else "LOW"}
        return {"image_id": key, "group_id": key, "truth": {"objects": [box] if objects else [], "risks": truth},
                "prediction": {"status": "success", "objects": [{**box, "confidence": .9}] if objects else [],
                               "risks": {"RISK-001": {"present": predicted}}}}

    def test_perfect_detection_duplicate_false_positive_and_missing_class(self):
        example = self.example()
        example["prediction"]["objects"].append({**example["prediction"]["objects"][0], "confidence": .8})
        result = detection_metrics([example], [{"name": "lamp"}, {"name": "bed"}])
        self.assertEqual(result["map50"], 1)
        self.assertEqual(result["classes"]["lamp"]["precision"], .5)
        self.assertEqual(result["classes"]["lamp"]["recall"], 1)
        self.assertIsNone(result["classes"]["bed"]["ap50"])
        self.assertEqual(result["classes_with_ground_truth"], 1)

    def test_ap_ranking_penalizes_false_positive_before_true_positive(self):
        example = self.example()
        example["prediction"]["objects"].insert(0, {"category": "lamp", "confidence": .99,
            "bbox": {"xMin": .6, "yMin": .6, "xMax": .9, "yMax": .9}})
        result = detection_metrics([example], [{"name": "lamp"}])
        self.assertAlmostEqual(result["map50"], .5)

    def test_unknown_ground_truth_excluded_but_positive_abstention_is_a_miss(self):
        examples = [self.example("a", True, True), self.example("b", True, "unknown"),
                    self.example("c", False, True), self.example("d", "unknown", False)]
        result = risk_metrics(examples)["RISK-001"]
        self.assertEqual(result["positive"], 2)
        self.assertEqual(result["negative"], 1)
        self.assertEqual(result["abstain_positive"], 1)
        self.assertEqual(result["excluded_unknown"], 1)
        self.assertEqual(result["precision"], .5)
        self.assertEqual(result["recall"], .5)
        self.assertEqual(result["f1"], .5)
        self.assertEqual(result["high_recall"], .5)

    def test_undefined_denominators_and_nonapplicable_are_not_zero_metrics(self):
        example = self.example(present="unknown", predicted="unknown", objects=False)
        example["truth"]["risks"]["RISK-002"]["applicable"] = False
        result = evaluate([example], [{"name": "lamp"}], bootstrap=10)
        self.assertIsNone(result["detection"]["map50"])
        self.assertIsNone(result["risk"]["RISK-001"]["recall"])
        self.assertIsNone(result["risk"]["RISK-001"]["ci95"]["recall"])
        self.assertEqual(result["risk"]["RISK-002"]["excluded_not_applicable"], 1)

    def test_group_bootstrap_is_deterministic_and_retains_perfect_score(self):
        examples = [self.example("a"), self.example("b"), self.example("c", False, False)]
        first = evaluate(examples, [{"name": "lamp"}], bootstrap=30, seed=17)
        second = evaluate(examples, [{"name": "lamp"}], bootstrap=30, seed=17)
        self.assertEqual(first, second)
        self.assertEqual(first["detection"]["map50_ci95"]["lower"], 1)
        self.assertEqual(first["risk"]["RISK-001"]["ci95"]["recall"]["upper"], 1)


class BaselineWorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        test_stage2.Stage2Tests.setUpClass.__func__(cls)

    def setUp(self):
        test_stage2.Stage2Tests.setUp(self)

    def approve_fixtures(self):
        test_stage2.Stage2Tests.approve_fixtures(self)

    def freeze(self):
        return test_stage2.Stage2Tests.freeze(self)

    def human_export(self, frozen):
        export(self.raw, self.review, frozen, self.output / "tasks")
        snapshot, rows, categories, definitions = load_frozen(frozen, self.raw, self.review)
        row_by_id = {row["image_id"]: row for row in rows}
        tasks = []
        for split in ["train", "val", "test"]:
            current = json.loads((self.output / "tasks" / f"label_studio_{split}.json").read_text(encoding="utf-8"))
            for task in current:
                row = row_by_id[task["data"]["image_id"]]
                payload = test_stage2.Stage2Tests.payload(self, row["room"])
                if row["room"] == "bedroom":
                    payload["risks"]["RISK-002"].update(present=True, visible=True, severity="HIGH")
                result = ls_result(row, {"payload": payload}, categories)
                result.extend([{"from_name": "reviewer", "to_name": "image", "type": "textarea", "value": {"text": ["Fixture reviewer only"]}},
                    {"from_name": "human_review", "to_name": "image", "type": "choices", "value": {"choices": [CONFIRMATION]}}])
                task["annotations"] = [{"id": len(tasks) + 1, "created_at": "2026-11-22T00:00:00Z", "updated_at": "2026-11-22T00:01:00Z", "result": result}]
                tasks.append(task)
        source = self.root / "human-export.json"
        write_json(source, tasks)
        bundle_path = self.root / "verified/bundle.json"
        import_labels(source, bundle_path, self.raw, self.review, frozen)
        return source, bundle_path, tasks

    def predict(self, request):
        payload = test_stage2.Stage2Tests.payload(self, request["room"])
        return {"modelUsed": request["model"], "detections": [{**obj, "source": "VISION_LANGUAGE_MODEL"} for obj in payload["objects"]],
                "risks": {key: {"present": "unknown"} for key in RISK_IDS}, "risk_supported": True, "provenance": "Synthetic test transport"}

    def run_fixture(self, frozen, verified, **kwargs):
        with contextlib.redirect_stdout(io.StringIO()):
            return run_baseline(self.raw, self.review, frozen, verified, self.output / "cache", self.root / "baseline-reports",
                                model="fixture", bootstrap=12, transport=self.predict, **kwargs)

    def test_no_review_no_verified_no_network_and_no_fake_metrics(self):
        def forbidden(request):
            self.fail("No inference permitted on unreviewed images")
        result = run_baseline(self.raw, self.review, self.output / "frozen", self.root / "missing.json",
                              self.output / "cache", self.root / "reports", model="fixture", bootstrap=2, transport=forbidden)
        self.assertEqual(result["status"], "blocked")
        self.assertEqual(result["api_calls"], 0)
        self.assertEqual(result["splits"], {})
        self.assertIn("Chưa đánh giá được", (self.root / "reports/baseline.md").read_text(encoding="utf-8"))

    def test_predictions_and_unconfirmed_annotations_cannot_become_verified(self):
        frozen = self.freeze()
        source, verified, tasks = self.human_export(frozen)
        task = tasks[0]
        task["predictions"] = [{"result": task["annotations"][0]["result"]}]
        task["annotations"] = []
        write_json(source, [task])
        with self.assertRaises(ValueError):
            import_labels(source, verified, self.raw, self.review, frozen)

    def test_measured_risk_binary_without_field_evidence_is_rejected(self):
        frozen = self.freeze()
        source, verified, tasks = self.human_export(frozen)
        task = next(task for task in tasks if task["data"]["image_id"].startswith("bedroom"))
        for entry in task["annotations"][0]["result"]:
            if entry["from_name"] == "present_RISK_004":
                entry["value"]["choices"] = ["Có"]
            if entry["from_name"] == "severity_RISK_004":
                entry["value"]["choices"] = ["HIGH"]
        write_json(source, [task])
        with self.assertRaises(ValueError):
            import_labels(source, verified, self.raw, self.review, frozen)

    def test_full_workflow_metrics_cache_and_source_tampering(self):
        frozen = self.freeze()
        source, verified, _ = self.human_export(frozen)
        first = self.run_fixture(frozen, verified)
        resumed = self.run_fixture(frozen, verified)
        self.assertEqual(first["status"], "completed")
        self.assertEqual(first["splits"]["val"]["detection"]["map50"], 1)
        self.assertEqual(first["splits"]["val"]["risk"]["RISK-002"]["recall"], 0)
        self.assertEqual(resumed["api_calls"], 0)
        self.assertEqual(resumed["cache_hits"], first["selected_images"])
        source.write_text(source.read_text(encoding="utf-8") + "\n", encoding="utf-8")
        with self.assertRaises(PipelineBlocked):
            self.run_fixture(frozen, verified)

    def test_missing_verified_image_blocks_entire_split_before_inference(self):
        frozen = self.freeze()
        source, verified, tasks = self.human_export(frozen)
        write_json(source, [task for task in tasks if task["data"]["split"] != "val"])
        import_labels(source, verified, self.raw, self.review, frozen)
        result = self.run_fixture(frozen, verified)
        self.assertEqual(result["status"], "blocked")
        self.assertEqual(result["api_calls"], 0)

    def test_baseline_test_config_cannot_be_tuned(self):
        frozen = self.freeze()
        _, verified, _ = self.human_export(frozen)
        first = self.run_fixture(frozen, verified, split="test")
        self.assertEqual(first["status"], "completed")
        with self.assertRaises(PipelineBlocked):
            self.run_fixture(frozen, verified, split="test", threshold=.6)

    def test_failed_inference_keeps_images_as_misses_and_can_retry_same_config(self):
        frozen = self.freeze()
        _, verified, _ = self.human_export(frozen)
        def failed(request):
            raise RuntimeError("NO_LIVE_INFERENCE")
        with contextlib.redirect_stdout(io.StringIO()):
            report = run_baseline(self.raw, self.review, frozen, verified, self.output / "cache", self.root / "baseline-reports",
                                  model="fixture", bootstrap=8, transport=failed)
        self.assertEqual(report["status"], "incomplete")
        result = report["splits"]["val"]
        self.assertEqual(result["images"], result["inference_failures"])
        self.assertEqual(result["detection"]["classes"]["lamp"]["recall"], 0)
        self.assertGreater(result["risk"]["RISK-002"]["abstain_positive"], 0)
        retried = self.run_fixture(frozen, verified, retry_errors=True)
        self.assertEqual(retried["status"], "completed")
