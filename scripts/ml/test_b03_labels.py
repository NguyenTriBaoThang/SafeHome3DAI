"""Self-check B03 trên fixture giả data_schemas/fixture_synthetic_b03 (giá trị tính tay trong chú thích).
Chạy: cd scripts/ml && python3 -m unittest -v test_b03_labels
"""
import contextlib
import copy
import io
import json
import tempfile
import unittest
from pathlib import Path

import b03_labels as b

FX = Path(__file__).resolve().parents[2] / "data_schemas/fixture_synthetic_b03"
A1, A2 = FX / "annotator_FAKE_A1.json", FX / "annotator_FAKE_A2.json"


def run(*args):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        code = b.main([str(x) for x in args])
    return code, buf.getvalue()


class B03Tests(unittest.TestCase):
    def setUp(self):
        t = tempfile.TemporaryDirectory()
        self.addCleanup(t.cleanup)
        self.tmp = Path(t.name)

    def test_validate_fixture_ok(self):
        code, out = run("validate", "--labels", A1, A2, "--manifest", FX / "manifest_FAKE.csv")
        self.assertEqual(code, 0, out)

    def test_manifest_rules(self):
        fields, rows = b.read_manifest(FX / "manifest_FAKE.csv")
        bad = copy.deepcopy(rows)
        bad[0]["split"] = "train"
        bad[1]["approved_for_third_party"] = ""
        bad[2]["private_path"] = "data/raw/x.jpg"
        bad[3]["sha256"] = bad[4]["sha256"]
        bad[5]["consent_id"] = ""
        text = "\n".join(b.check_manifest(fields, bad))
        for needle in ("split phải", "yes/no", "private_path", "trùng hash", "thiếu consent_id"):
            self.assertIn(needle, text)

    def test_room_applicability_and_bbox(self):
        recs = json.loads(A1.read_text())
        recs[0]["hazards"]["RISK-006"] = {"state": "absent", "evidence_note": ""}  # 006 không áp dụng cho BEDROOM
        recs[1]["objects"] = [{"class": "bed", "bbox": [0.5, 0.5, 0.2, 0.9], "visibility": "full"}]
        text = "\n".join(b.check_label_records(recs))
        self.assertIn("không áp dụng", text)
        self.assertIn("bbox phải", text)

    def test_kappa_hand_computed(self):
        # RISK-001 A1=PPAAPAUN, A2=PAAAPPUN: po=6/8, pe=20/64 -> k=7/11; nhị phân 6 cặp po=4/6, pe=.5 -> k=1/3
        code, out = run("agreement", "--a1", A1, "--a2", A2, "--out", self.tmp / "d.csv")
        r = json.loads(out)["per_risk"]["RISK-001"]
        self.assertAlmostEqual(r["kappa_4state"], 7 / 11, places=3)
        self.assertEqual(r["n_binary_subset"], 6)
        self.assertAlmostEqual(r["kappa_present_absent"], 1 / 3, places=3)
        self.assertEqual(r["a1_counts"]["uncertain"], 1)
        self.assertEqual(r["a1_counts"]["not_assessable"], 1)
        self.assertEqual(json.loads(out)["per_risk"]["RISK-002"]["kappa_4state"], 1.0)
        self.assertEqual(json.loads(out)["n_disagreements"], 2)
        self.assertEqual(len((self.tmp / "d.csv").read_text().strip().splitlines()), 3)

    def finalize(self, res=FX / "resolutions_FAKE.csv"):
        out = self.tmp / "gt.json"
        code = b.main(["finalize", "--a1", str(A1), "--a2", str(A2), "--resolutions", str(res), "--out", str(out)])
        return out

    def test_finalize_requires_resolution(self):
        empty = self.tmp / "r.csv"
        empty.write_text(",".join(b.DIS_COLS) + "\n")
        with contextlib.redirect_stdout(io.StringIO()), self.assertRaises(SystemExit):
            self.finalize(empty)

    def test_score_hand_computed(self):
        with contextlib.redirect_stdout(io.StringIO()):
            gt = self.finalize()
        gtj = json.loads(gt.read_text())
        self.assertEqual(gtj["images"][1]["hazards"]["RISK-001"]["final"], "uncertain")
        self.assertEqual(gtj["images"][1]["hazards"]["RISK-001"]["raw"], {"FAKE_A1": "present", "FAKE_A2": "absent"})
        code, out = run("score", "--reference", gt, "--predictions", FX / "predictions_FAKE.json")
        r = json.loads(out)["RISK-002"]
        # ref=PPPAAAUN, pred=PAUPAAPA. Chỉ chấm 6 ô present/absent: TP=1 FN=2 (1 sai + 1 unknown) FP=1 TN=2
        self.assertEqual((r["tp"], r["fn"], r["fp"], r["tn"]), (1, 2, 1, 2))
        self.assertEqual(r["n_ref_present"] + r["n_ref_absent"], 6)  # ô uncertain/not_assessable bị loại
        self.assertAlmostEqual(r["precision"], 0.5)
        self.assertAlmostEqual(r["recall"], 1 / 3)
        self.assertAlmostEqual(r["f1"], 0.4)
        self.assertEqual(r["n_pred_unknown_on_scored_cells"], 1)
        # ô tham chiếu uncertain (pred=present) và not_assessable (pred=absent) tách riêng, không vào P/R/F1
        self.assertEqual(r["on_reference_uncertain"], {"present": 1})
        self.assertEqual(r["on_reference_not_assessable"], {"absent": 1})
        self.assertEqual(r["warning"], "mẫu nhỏ, thăm dò")
        self.assertNotIn("accuracy", out)
        # Wilson 95% cho 1/2: [0.0945, 0.9055]
        lo, hi = r["precision_wilson95"]
        self.assertAlmostEqual(lo, 0.0945, places=3)
        self.assertAlmostEqual(hi, 0.9055, places=3)


if __name__ == "__main__":
    unittest.main()
