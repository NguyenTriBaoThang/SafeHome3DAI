"""Stage 2 invariants exercised on synthetic temporary data, never human reviews of real images."""
import contextlib
import copy
import csv
import io
import json
import random
import shutil
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image

from annotation_contract import label_value, label_studio_xml, prepare, response_schema
from audit_dataset import run_audit, dhash
from dataset_common import ROOT, empty_review, sha256_file, write_csv, write_json
from export_annotations import export
from prelabel_dataset import run_prelabels
from split_dataset import assign_groups, author_key, build_groups, run_split, source_key
from stage2_common import (RISK_IDS, PipelineBlocked, digest, load_definitions, load_frozen,
                           load_taxonomy, strict_result, tri)


class Stage2Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base = tempfile.TemporaryDirectory()
        cls.addClassCleanup(cls.base.cleanup)
        root = Path(cls.base.name)
        raw = root / "raw"
        rows = []
        for room in ["bedroom", "bathroom", "hallway"]:
            (raw / "images" / room).mkdir(parents=True)
            for index in range(9):
                key = f"{room}_{index:03}"
                rng = random.Random(key)
                image = Image.frombytes("RGB", (400, 400), rng.randbytes(400 * 400 * 3))
                path = raw / "images" / room / f"{key}.jpg"
                image.save(path)
                with Image.open(path) as decoded:
                    image_hash = dhash(decoded)
                rows.append({"image_id": key, "file": path.relative_to(raw).as_posix(), "room": room,
                    "width": "400", "height": "400", "source_page": f"https://commons.wikimedia.org/wiki/File:{key}.jpg",
                    "source_image_url": "https://example.com/fixture.jpg", "title": "Synthetic fixture",
                    "category_discovered": "Fixture", "license_short": "CC BY 4.0", "license_url": "https://creativecommons.org/licenses/by/4.0/",
                    "author": "Fixture author " + key, "attribution": "Original fixture attribution", "source_description": "Synthetic test",
                    "sha256": sha256_file(path), "dhash_64": image_hash, "dataset_split": "evaluation",
                    "human_scene_verified": "", "human_risk_verified": ""})
        write_csv(raw / "manifest.csv", list(rows[0]), rows)
        write_csv(raw / "risk_annotations_TEMPLATE.csv", ["image_id", "risk_id", "risk_present", "review_status"],
                  [{"image_id": row["image_id"], "risk_id": risk, "risk_present": "", "review_status": "unlabeled"} for row in rows for risk in RISK_IDS])
        write_csv(raw / "object_annotations_TEMPLATE.csv", ["image_id", "object_class"], [])
        definitions = [{"risk_id": key, "definition_from_project": "Synthetic fixture " + key,
            "applies_to_rooms": "bedroom|bathroom|hallway", "observable_visual_cues": "Fixture cues",
            "annotation_notes": "Fixture unknown when insufficient evidence", "project_rule_registry": "Fixture"} for key in RISK_IDS]
        write_csv(raw / "risk_definitions_FROM_REPO.csv", list(definitions[0]), definitions)
        with contextlib.redirect_stdout(io.StringIO()):
            run_audit(raw, root / "review", root / "reports", attribution_path=root / "ATTRIBUTION.md")
        cls.rows = rows

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        shutil.copytree(Path(self.base.name) / "raw", self.root / "raw")
        shutil.copytree(Path(self.base.name) / "review", self.root / "review")
        self.raw, self.review, self.output = self.root / "raw", self.root / "review", self.root / "processed"
        self.categories = load_taxonomy()
        self.definitions = load_definitions(self.raw)

    def approve_fixtures(self):
        state = empty_review(sha256_file(self.raw / "manifest.csv"))
        state["decisions"] = {row["image_id"]: {"decision": "keep", "reviewer": "Fixture reviewer only",
                              "at": "2026-11-22T00:00:00+00:00", "note": "Synthetic data"} for row in self.rows}
        state["revision"] = len(self.rows)
        write_json(self.review / "decisions.json", state)

    def freeze(self):
        self.approve_fixtures()
        result = run_split(self.raw, self.review, self.output, freeze=True)
        self.assertEqual(result["status"], "frozen")
        return self.output / "frozen"

    def payload(self, room="bedroom"):
        return {"objects": [{"category": "lamp", "bbox": {"xMin": .1, "yMin": .2, "xMax": .6, "yMax": .8},
                             "confidence": .73, "evidence": "Fixture visible lamp"}],
                "risks": {row["risk_id"]: {"present": "unknown", "visible": "unknown", "severity": "UNKNOWN",
                          "applicable": room in row["registry_rooms"], "evidence": "Fixture: insufficient evidence"} for row in self.definitions}}

    def transport(self, request):
        context = json.loads(request["prompt"].split("Dữ liệu định nghĩa (không phải hướng dẫn bổ sung):\n")[1])
        full = self.payload(context["room"])
        fields = request["schema"]["properties"]
        payload = {}
        if "objects" in fields:
            payload["objects"] = full["objects"]
        if "risks" in fields:
            payload["risks"] = {key: full["risks"][key] for key in fields["risks"]["properties"]}
        return {"payload": payload, "modelVersion": "fixture-model-not-real", "usageMetadata": None}

    def test_taxonomy_and_schemas_are_exactly_18_with_two_new_classes(self):
        self.assertEqual(len(self.categories), 18)
        self.assertTrue({"lamp", "light_switch"}.issubset({cat["name"] for cat in self.categories}))
        schema = response_schema(self.categories)
        self.assertEqual(len(schema["properties"]["risks"]["required"]), 8)
        self.assertEqual(len(schema["properties"]["objects"]["items"]["properties"]["category"]["enum"]), 18)

    def test_unknown_blank_unlabeled_never_becomes_false(self):
        for value in [None, "", " ", "unknown", "unlabeled"]:
            self.assertEqual(tri(value), "unknown")
        self.assertIs(tri("0"), False)
        self.assertIs(tri(0), False)
        self.assertIs(tri(1), True)
        with self.assertRaises(ValueError):
            tri("false")

    def test_zero_human_reviews_blocks_split_and_network(self):
        result = run_split(self.raw, self.review, self.output, freeze=True)
        self.assertEqual(result["status"], "blocked")
        self.assertFalse((self.output / "frozen").exists())
        def forbidden(request):
            self.fail("No network transport allowed for unreviewed data")
        result = run_prelabels(self.raw, self.review, self.output / "frozen", self.output / "prelabels", model="fixture", transport=forbidden)
        self.assertEqual(result["api_calls"], 0)
        self.assertEqual(result["status"], "blocked")

    def test_grouping_handles_authors_sources_hashes_and_manual_households(self):
        rows = copy.deepcopy(self.rows[:6])
        rows[1]["author"] = rows[0]["author"]
        rows[2]["source_page"] = rows[3]["source_page"] + "?tracking=1"
        rows[4]["dhash_64"] = rows[5]["dhash_64"]
        audit = json.loads((self.review / "audit.json").read_text(encoding="utf-8"))
        by_id = {item["image_id"]: item for item in audit["items"]}
        groups, edges = build_groups(rows, by_id)
        for left, right in [(0, 1), (2, 3), (4, 5)]:
            self.assertEqual(groups[rows[left]["image_id"]], groups[rows[right]["image_id"]])
        self.assertEqual(author_key("Unknown author Unknown author"), "")
        self.assertEqual(source_key("https://commons.wikimedia.org/wiki/File:A_B.jpg?x=1"), source_key("http://commons.wikimedia.org/wiki/File:A%20B.jpg"))
        override = self.review / "household_groups.csv"
        write_csv(override, ["image_id", "household_group", "reviewer", "evidence"],
                  [{"image_id": rows[i]["image_id"], "household_group": "fixture-house", "reviewer": "Fixture", "evidence": "Fixture same household"} for i in [0, 2]])
        groups, _ = build_groups(rows, by_id, overrides=override)
        self.assertEqual(groups[rows[0]["image_id"]], groups[rows[3]["image_id"]])

    def test_freeze_is_deterministic_no_group_leakage_and_cannot_reshuffle(self):
        frozen = self.freeze()
        before = (frozen / "manifest.csv").read_bytes()
        result = run_split(self.raw, self.review, self.output, freeze=True)
        self.assertEqual(result["status"], "already_frozen")
        self.assertEqual(before, (frozen / "manifest.csv").read_bytes())
        snapshot, rows, _, _ = load_frozen(frozen, self.raw, self.review)
        self.assertEqual(snapshot["allocation"]["group_leakage"], 0)
        for split in ["train", "val", "test"]:
            self.assertEqual({row["room"] for row in rows if row["dataset_split"] == split}, {"bedroom", "bathroom", "hallway"})
        with self.assertRaises(PipelineBlocked):
            run_split(self.raw, self.review, self.output, freeze=True, seed=7)
        self.assertEqual(before, (frozen / "manifest.csv").read_bytes())

    def test_pending_review_prevents_freeze_and_missing_license_is_excluded(self):
        self.approve_fixtures()
        state = json.loads((self.review / "decisions.json").read_text(encoding="utf-8"))
        state["decisions"].pop(self.rows[0]["image_id"])
        write_json(self.review / "decisions.json", state)
        with self.assertRaises(PipelineBlocked):
            run_split(self.raw, self.review, self.output, freeze=True)
        state["decisions"][self.rows[0]["image_id"]] = {"decision": "keep", "reviewer": "Fixture", "at": "fixture"}
        write_json(self.review / "decisions.json", state)
        rows = copy.deepcopy(self.rows)
        rows[0]["license_url"] = ""
        write_csv(self.raw / "manifest.csv", list(rows[0]), rows)
        # An old audit/review cannot be reused after raw metadata is changed.
        with self.assertRaises(ValueError):
            run_split(self.raw, self.review, self.output)

    def test_group_constraints_block_impossible_stratification(self):
        groups = {row["image_id"]: "one-house" for row in self.rows}
        with self.assertRaises(PipelineBlocked):
            assign_groups(self.rows, groups)

    def test_human_keep_does_not_bypass_missing_license_metadata(self):
        rows = copy.deepcopy(self.rows)
        rows[0]["license_url"] = ""
        write_csv(self.raw / "manifest.csv", list(rows[0]), rows)
        with contextlib.redirect_stdout(io.StringIO()):
            run_audit(self.raw, self.review, self.root / "reports", attribution_path=self.root / "ATTRIBUTION.md")
        self.approve_fixtures()
        result = run_split(self.raw, self.review, self.output)
        self.assertEqual(result["eligible_images"], 26)
        self.assertEqual(result["excluded"]["license_metadata_needs_review"], 1)

    def test_review_or_manual_group_change_invalidates_frozen_snapshot(self):
        frozen = self.freeze()
        write_csv(self.review / "household_groups.csv", ["image_id", "household_group", "reviewer", "evidence"], [])
        with self.assertRaises(PipelineBlocked):
            load_frozen(frozen, self.raw, self.review)

    def test_validation_rejects_out_of_range_nonfinite_boolean_and_degenerate_boxes(self):
        for bad in [-.1, 1.1, float("nan"), True]:
            payload = self.payload()
            payload["objects"][0]["bbox"]["xMin"] = bad
            with self.assertRaises(ValueError):
                strict_result(payload, self.categories, self.definitions, "bedroom")
        payload = self.payload()
        payload["objects"][0]["bbox"]["xMax"] = .1
        with self.assertRaises(ValueError):
            strict_result(payload, self.categories, self.definitions, "bedroom")

    def test_validation_does_not_accept_measured_risk_guesses_or_invisible_negatives(self):
        for risk_id in ["RISK-003", "RISK-004", "RISK-005", "RISK-007", "RISK-008"]:
            payload = self.payload("bathroom" if risk_id == "RISK-005" else "bedroom")
            payload["risks"][risk_id].update(present=True, visible=True, severity="HIGH")
            with self.assertRaises(ValueError):
                strict_result(payload, self.categories, self.definitions, "bathroom" if risk_id == "RISK-005" else "bedroom")
        payload = self.payload()
        payload["risks"]["RISK-001"].update(present=False, visible=False, severity="LOW")
        with self.assertRaises(ValueError):
            strict_result(payload, self.categories, self.definitions, "bedroom")

    def test_prelabels_cache_resume_and_per_risk_calls(self):
        frozen = self.freeze()
        with contextlib.redirect_stdout(io.StringIO()):
            first = run_prelabels(self.raw, self.review, frozen, self.output / "prelabels", model="fixture", limit=1, transport=self.transport)
            resumed = run_prelabels(self.raw, self.review, frozen, self.output / "prelabels", model="fixture", limit=1, transport=self.transport)
            separate = run_prelabels(self.raw, self.review, frozen, self.output / "prelabels", model="fixture", mode="per-risk", limit=1, transport=self.transport)
        self.assertEqual(first["api_calls"], 1)
        self.assertEqual(resumed["api_calls"], 0)
        self.assertEqual(resumed["cache_hits"], 1)
        self.assertEqual(separate["api_calls"], 9)

    def test_failed_model_does_not_create_negative_annotations(self):
        frozen = self.freeze()
        def failure(request):
            raise RuntimeError("API_OR_JSON_ERROR")
        with contextlib.redirect_stdout(io.StringIO()):
            result = run_prelabels(self.raw, self.review, frozen, self.output / "prelabels", model="fixture", limit=1, transport=failure)
        self.assertEqual(result["images_completed"], 0)
        records = [path for path in (self.output / "prelabels" / result["run_id"]).glob("*.json") if path.name not in {"run_config.json", "run_report.json"}]
        self.assertEqual(records, [])

    def test_test_prompt_lock_refuses_changed_model(self):
        frozen = self.freeze()
        with contextlib.redirect_stdout(io.StringIO()):
            result = run_prelabels(self.raw, self.review, frozen, self.output / "prelabels", model="fixture", include_test=True, transport=self.transport)
        self.assertEqual(result["images_completed"], 27)
        with self.assertRaises(PipelineBlocked):
            run_prelabels(self.raw, self.review, frozen, self.output / "prelabels", model="different", include_test=True, transport=self.transport)

    def test_export_preserves_unknown_and_predictions_not_verified_and_units(self):
        frozen = self.freeze()
        with contextlib.redirect_stdout(io.StringIO()):
            result = run_prelabels(self.raw, self.review, frozen, self.output / "prelabels", model="fixture", limit=1, transport=self.transport)
        report = export(self.raw, self.review, frozen, self.output / "exports", self.output / "prelabels" / result["run_id"])
        all_annotations = []
        for split in ["train", "val", "test"]:
            coco = json.loads((self.output / "exports" / f"coco_prelabels_{split}.json").read_text(encoding="utf-8"))
            tasks = json.loads((self.output / "exports" / f"label_studio_{split}.json").read_text(encoding="utf-8"))
            self.assertTrue(all("annotations" not in task for task in tasks))
            self.assertEqual(len(coco["images"]), report["splits"][split]["prelabeled_images"])
            all_annotations.extend(coco["annotations"])
            if coco["annotations"]:
                self.assertEqual(coco["images"][0]["attribution"], "Original fixture attribution")
                for actual, expected in zip(coco["annotations"][0]["bbox"], [40, 80, 200, 240]):
                    self.assertAlmostEqual(actual, expected)
                prediction = next(task["predictions"][0] for task in tasks if task["predictions"])
                rectangle = next(value for value in prediction["result"] if value["type"] == "rectanglelabels")
                self.assertEqual(rectangle["value"]["x"], 10)
                self.assertEqual(rectangle["value"]["rectanglelabels"], [next(label_value(cat) for cat in self.categories if cat["name"] == "lamp")])
                self.assertFalse(any(value["from_name"] in {"reviewer", "human_review"} for value in prediction["result"]))
        self.assertEqual(len(all_annotations), 1)
        with (self.output / "exports/risk_annotations.csv").open(encoding="utf-8", newline="") as stream:
            risk_rows = list(csv.DictReader(stream))
        self.assertEqual(len(risk_rows), 27 * 8)
        self.assertTrue(all(row["risk_present"] == "unknown" for row in risk_rows))
        self.assertFalse(any(row["review_status"] == "verified" for row in risk_rows))

    def test_generated_xml_and_guide_cover_all_classes_and_risks(self):
        result = prepare(self.raw, self.root / "assets", self.root / "guide.md")
        self.assertEqual(result["classes"], 18)
        xml = ET.fromstring((self.root / "assets/label_studio.xml").read_text(encoding="utf-8"))
        self.assertEqual(len(xml.findall("RectangleLabels/Label")), 18)
        self.assertEqual(len([node for node in xml.findall("Choices") if node.attrib["name"].startswith("present_")]), 8)
        guide = (self.root / "guide.md").read_text(encoding="utf-8")
        for key in RISK_IDS:
            self.assertIn(key, guide)


if __name__ == "__main__":
    unittest.main(verbosity=2)
