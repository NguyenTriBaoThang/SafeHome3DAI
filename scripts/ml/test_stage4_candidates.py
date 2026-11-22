"""AI candidate planning cannot promote scene proposals into verified evaluation data."""
import copy
import json
import unittest

import test_stage2
from dataset_common import load_manifest, sha256_file, write_json
from prepare_stage4_candidates import prepare
from stage2_common import PipelineBlocked


class CandidateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        test_stage2.Stage2Tests.setUpClass.__func__(cls)

    def setUp(self):
        test_stage2.Stage2Tests.setUp(self)
        self.ai_path = self.review / "ai_scene/review.json"
        self.proposals = {"review_source": "AI_visual_review", "manifest_sha256": sha256_file(self.raw / "manifest.csv"),
            "images": [{"image_id": row["image_id"], "image_sha256": row["sha256"], "decision": "keep",
                        "observed_room": row["room"], "review_status": "ai_reviewed_proposal",
                        "ai_scene_reviewed": True, "note": "Synthetic temporary fixture only"} for row in self.rows]}
        write_json(self.ai_path, self.proposals)

    def test_plan_preserves_raw_split_and_never_creates_human_verification_or_test_lock(self):
        before = sha256_file(self.raw / "manifest.csv")
        output = self.output / "candidate_plan"
        report = prepare(self.raw, self.review, self.ai_path, output)
        self.assertEqual(report["candidate_images"], 27)
        self.assertEqual(report["proposed_allocation"]["group_leakage"], 0)
        self.assertFalse(report["official_test_frozen"])
        self.assertEqual(sha256_file(self.raw / "manifest.csv"), before)
        self.assertFalse((self.review / "decisions.json").exists())
        self.assertFalse((output / "snapshot.json").exists())
        import csv
        with (output / "candidate_manifest.csv").open(encoding="utf-8", newline="") as stream:
            rows = list(csv.DictReader(stream))
        self.assertTrue(all(row["dataset_split"] == "evaluation" and not row["human_scene_verified"] for row in rows))
        self.assertTrue(all(row["proposed_split"] in {"train", "val", "test"} for row in rows))

    def test_partial_ai_review_cannot_be_mistaken_for_complete_scene_review(self):
        self.proposals["images"].pop()
        write_json(self.ai_path, self.proposals)
        with self.assertRaises(PipelineBlocked):
            prepare(self.raw, self.review, self.ai_path, self.output / "plan")

    def test_tampered_ai_image_identity_is_rejected(self):
        self.proposals["images"][0]["image_sha256"] = "0" * 64
        write_json(self.ai_path, self.proposals)
        with self.assertRaises(PipelineBlocked):
            prepare(self.raw, self.review, self.ai_path, self.output / "plan")

    def test_ai_reject_and_uncertain_are_excluded_without_becoming_negative_ground_truth(self):
        self.proposals["images"][0]["decision"] = "reject"
        self.proposals["images"][1]["decision"] = "needs_review"
        write_json(self.ai_path, self.proposals)
        report = prepare(self.raw, self.review, self.ai_path, self.output / "plan")
        self.assertEqual(report["candidate_images"], 25)
        self.assertEqual(report["excluded"], {"ai_reject": 1, "ai_needs_review": 1})
        self.assertFalse(report["ground_truth_created"])


if __name__ == "__main__":
    unittest.main()
