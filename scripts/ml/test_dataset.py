"""Safety and workflow regression checks. All decisions use disposable fixtures."""
import contextlib
import csv
import io
import json
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
import zipfile
from http.server import ThreadingHTTPServer
from pathlib import Path

from PIL import Image

from audit_dataset import dhash, inspect_image, near_duplicates, run_audit
from dataset_common import (image_path, license_status, load_manifest, room_counts,
                            sha256_file, working_rows, write_csv)
from import_dataset import extract
from review_dataset import ReviewStore, handler_for


class DatasetTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.raw, self.review = self.root / "raw", self.root / "review"
        (self.raw / "images/bedroom").mkdir(parents=True)
        image = Image.new("RGB", (400, 400), (60, 120, 180))
        path = self.raw / "images/bedroom/one.jpg"
        image.save(path)
        self.row = {"image_id": "one", "file": "images/bedroom/one.jpg", "room": "bedroom",
                    "width": "400", "height": "400", "source_page": "https://commons.wikimedia.org/wiki/File:Example.jpg",
                    "source_image_url": "https://example.com/example.jpg", "title": "Example", "category_discovered": "Bedrooms",
                    "license_short": "CC BY 4.0", "license_url": "https://creativecommons.org/licenses/by/4.0/",
                    "author": "Fixture author", "attribution": "Unchanged original credit", "source_description": "Room",
                    "sha256": sha256_file(path), "dhash_64": dhash(image), "dataset_split": "evaluation",
                    "human_scene_verified": "", "human_risk_verified": ""}
        write_csv(self.raw / "manifest.csv", list(self.row), [self.row])
        write_csv(self.raw / "risk_annotations_TEMPLATE.csv", ["image_id", "risk_id", "risk_present", "review_status"],
                  [{"image_id": "one", "risk_id": "RISK-001", "risk_present": "", "review_status": "unlabeled"}])
        write_csv(self.raw / "object_annotations_TEMPLATE.csv", ["image_id", "object_class"], [])
        self.original = {p: p.read_bytes() for p in self.raw.rglob("*") if p.is_file()}
        with contextlib.redirect_stdout(io.StringIO()):
            self.audit = run_audit(self.raw, self.review, self.root / "reports", attribution_path=self.root / "ATTRIBUTION.md")
        self.store = ReviewStore(self.raw, self.review)

    def payload(self, decision="keep", revision=0):
        return {"image_id": "one", "decision": decision, "revision": revision, "reviewer": "Fixture reviewer", "note": "Fixture only"}

    def test_pending_and_unknown_never_become_negative_or_verified(self):
        self.store.export()
        with (self.review / "manifest_reviewed.csv").open(encoding="utf-8", newline="") as stream:
            row = next(csv.DictReader(stream))
        self.assertEqual(row["human_scene_verified"], "")
        self.assertEqual(row["human_risk_verified"], "")
        self.assertEqual(row["candidate_eligible"], "false")
        self.assertEqual(self.audit["annotations"]["risk_annotations_TEMPLATE.csv"]["verified_binary_rows"], 0)

    def test_keep_reject_replace_reset_round_trip_and_raw_is_unchanged(self):
        for revision, action in enumerate(["keep", "reject", "replace", "pending"]):
            self.store.save(self.payload(action, revision))
            # Reopen store to prove durable persistence, not just in-memory changes.
            reopened = ReviewStore(self.raw, self.review)
            state = reopened.state()
            row = working_rows(reopened.rows, state, reopened.by_id)[0]
            expected = "true" if action == "keep" else "" if action == "pending" else "false"
            self.assertEqual(row["human_scene_verified"], expected)
            self.assertEqual(row["human_risk_verified"], "")
            self.assertEqual(row["dataset_split"], "evaluation")
            for key in ["license_short", "license_url", "author", "attribution"]:
                self.assertEqual(row[key], self.row[key])
        self.assertEqual(len(state["history"]), 4)
        for path, content in self.original.items():
            self.assertEqual(path.read_bytes(), content)

    def test_stale_tab_and_missing_reviewer_cannot_overwrite_decisions(self):
        self.store.save(self.payload())
        with self.assertRaises(FileExistsError):
            self.store.save(self.payload("reject"))
        payload = self.payload("reject", 1)
        payload["reviewer"] = " "
        with self.assertRaises(ValueError):
            self.store.save(payload)
        self.assertEqual(self.store.state()["decisions"]["one"]["decision"], "keep")

    def test_license_gate_handles_deeds_but_blocks_unknown_missing_author_and_mismatch(self):
        self.assertEqual(license_status({**self.row, "license_url": "https://creativecommons.org/licenses/by/4.0/deed.en"}), "metadata_complete")
        for changed in [{"license_short": "Public domain", "license_url": ""}, {"author": ""},
                        {"license_url": "https://creativecommons.org/licenses/by-sa/4.0"},
                        {"license_url": "https://creativecommons.org.evil.example/licenses/by/4.0"}]:
            self.assertEqual(license_status({**self.row, **changed}), "needs_license_review")
        self.store.by_id["one"]["license_status"] = "needs_license_review"
        self.store.save(self.payload())
        row = working_rows(self.store.rows, self.store.state(), self.store.by_id)[0]
        self.assertEqual(row["human_scene_verified"], "true")
        self.assertEqual(row["candidate_eligible"], "false")

    def test_corrupt_small_and_tampered_images_are_flagged(self):
        path = self.raw / self.row["file"]
        path.write_bytes(b"not a JPEG")
        audited = inspect_image(self.raw, self.row, 384)
        self.assertFalse(audited["image_ok"])
        self.assertIn("sha256_mismatch", audited["reasons"])
        self.assertIn("unreadable_or_corrupt_image", audited["reasons"])
        Image.new("RGB", (10, 10)).save(path)
        audited = inspect_image(self.raw, self.row, 384)
        self.assertTrue(audited["image_ok"])
        self.assertFalse(audited["integrity_ok"])
        self.assertIn("small_image", audited["reasons"])

    def test_near_duplicate_transitive_groups_and_distance_boundary(self):
        items = [{"image_id": key, "image_ok": True, "dhash_64": f"{value:016x}"}
                 for key, value in [("a", 0), ("b", 1), ("c", 3), ("d", 255)]]
        pairs, groups = near_duplicates(items, 1)
        self.assertEqual(len(pairs), 2)
        self.assertEqual(groups, [["a", "b", "c"]])

    def test_manifest_mutation_invalidates_review(self):
        with (self.raw / "manifest.csv").open("a", encoding="utf-8") as stream:
            stream.write("\n")
        with self.assertRaises(ValueError):
            self.store.save(self.payload())
        with self.assertRaises(ValueError):
            ReviewStore(self.raw, self.review)

    def test_changed_image_cannot_be_kept_using_old_audit(self):
        Image.new("RGB", (400, 400), (255, 0, 0)).save(self.raw / self.row["file"])
        with self.assertRaises(ValueError):
            self.store.save(self.payload())
        self.assertEqual(self.store.state()["revision"], 0)

    def test_room_shortfall_tracks_actual_decisions_not_proposals(self):
        self.store.by_id["one"]["suggested_review"] = True
        counts = room_counts(self.store.rows, self.store.state(), self.store.by_id, {"bedroom": 1})["bedroom"]
        self.assertEqual(counts["minimum_replacements_after_decisions"], 0)
        self.store.save(self.payload("replace"))
        counts = room_counts(self.store.rows, self.store.state(), self.store.by_id, {"bedroom": 1})["bedroom"]
        self.assertEqual(counts["minimum_replacements_after_decisions"], 1)

    def test_image_and_zip_traversal_are_rejected_without_overwrite(self):
        for name in ["../manifest.csv", "images/../../secret.jpg", "C:/secret.jpg", "images\\x.jpg", "/secret.jpg"]:
            with self.assertRaises(ValueError):
                image_path(self.raw, name)
        zip_path = self.root / "unsafe.zip"
        with zipfile.ZipFile(zip_path, "w") as bundle:
            bundle.writestr("../escaped.txt", "unsafe")
        with self.assertRaises(ValueError):
            extract(zip_path, self.root / "extracted")
        self.assertFalse((self.root / "escaped.txt").exists())
        with self.assertRaises(ValueError):
            extract(zip_path, self.raw)

    def test_duplicate_manifest_ids_fail_closed(self):
        write_csv(self.raw / "manifest.csv", list(self.row), [self.row, self.row])
        with self.assertRaises(ValueError):
            load_manifest(self.raw)

    def test_http_save_export_origin_token_and_conflict(self):
        server = ThreadingHTTPServer(("127.0.0.1", 0), handler_for(self.store, "fixture-token"))
        server.daemon_threads = True
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        base = f"http://127.0.0.1:{server.server_port}"
        with urllib.request.urlopen(base + "/api/state") as response:
            state = json.load(response)
        self.assertEqual(state["token"], "fixture-token")
        with urllib.request.urlopen(base + "/image?id=one") as response:
            self.assertEqual(response.read(), (self.raw / self.row["file"]).read_bytes())
        body = json.dumps(self.payload()).encode()
        headers = {"Content-Type": "application/json", "Origin": base, "X-Review-Token": "fixture-token"}
        for bad in [{**headers, "Origin": "https://evil.example"}, {**headers, "X-Review-Token": "wrong"}]:
            with self.assertRaises(urllib.error.HTTPError) as error:
                urllib.request.urlopen(urllib.request.Request(base + "/api/decision", data=body, headers=bad))
            self.assertEqual(error.exception.code, 403)
        with urllib.request.urlopen(urllib.request.Request(base + "/api/decision", data=body, headers=headers)) as response:
            self.assertEqual(json.load(response)["revision"], 1)
        with self.assertRaises(urllib.error.HTTPError) as error:
            urllib.request.urlopen(urllib.request.Request(base + "/api/decision", data=body, headers=headers))
        self.assertEqual(error.exception.code, 409)
        with urllib.request.urlopen(base + "/export.csv") as response:
            row = next(csv.DictReader(io.StringIO(response.read().decode("utf-8"))))
            self.assertEqual(row["human_scene_verified"], "true")
            self.assertEqual(row["human_risk_verified"], "")


if __name__ == "__main__":
    unittest.main(verbosity=2)
