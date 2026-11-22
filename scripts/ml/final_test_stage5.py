"""One locked detector-only evaluation after best-checkpoint selection and ONNX parity."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from baseline_metrics import evaluate
from dataset_common import DEFAULT_RAW, DEFAULT_REVIEW, ROOT, image_path, sha256_file, utc_now, write_json
from detector_stage5 import OnnxDetector
from experiment_stage4 import exclusive_job, seal, unseal
from export_stage5_onnx import completed_run
from import_verified import VERIFIED, load_verified
from stage2_common import STAGE2, PipelineBlocked, digest, load_frozen
from stage5_common import HOME, load_training_bundle


def final_test(run_dir, onnx_dir, bundle_path, raw=DEFAULT_RAW, review=DEFAULT_REVIEW,
               frozen=STAGE2 / "frozen", verified=VERIFIED, reports=ROOT / "reports/stage5"):
    bundle = load_training_bundle(bundle_path, raw)
    run = completed_run(run_dir, bundle_path)
    export = unseal(onnx_dir / "export.json")
    if (export.get("parity_passed") is not True or export["training_run_sha256"] != sha256_file(run_dir / "run.json") or
            export["training_bundle_sha256"] != sha256_file(bundle_path) or export["onnx_sha256"] != sha256_file(onnx_dir / "detector.onnx")):
        raise PipelineBlocked("ONNX export is not the selected trained checkpoint")
    control = run_dir / "final_test"
    identity = {"onnx_sha256": export["onnx_sha256"], "training_run_sha256": export["training_run_sha256"],
                "bundle_sha256": sha256_file(bundle_path), "threshold": run["plan"]["training"]["confidence_threshold"]}
    if export["confidence_threshold"] != identity["threshold"] or export["classes"] != run["classes"]:
        raise PipelineBlocked("Post-training threshold/classes changed")
    with exclusive_job(control):
        result_path = control / "result.json"
        if result_path.exists():
            result = unseal(result_path)
            if result["identity"] != identity:
                raise PipelineBlocked("Final test model/threshold changed")
            return {"status": result["status"], "new_inferences": 0, "reused": True}
        snapshot, rows, categories, definitions = load_frozen(frozen, raw, review)
        if digest(snapshot) != bundle["snapshot_sha256"]:
            raise PipelineBlocked("Test snapshot differs from the training snapshot")
        test = [row for row in rows if row["dataset_split"] == "test"]
        if [{key: row[key] for key in ["image_id", "sha256", "group_id"]} for row in test] != bundle["test_membership"]:
            raise PipelineBlocked("Test membership changed after train/val export")
        labels = load_verified(verified, snapshot, rows, categories, definitions, splits={"test"})
        truth = {row["image_id"]: row for row in labels["images"]}
        if not test or set(truth) != {row["image_id"] for row in test}:
            raise PipelineBlocked("Complete human-verified test labels required")
        lock = {"identity": identity, "test_labels_sha256": digest(labels["images"])}
        path = control / "lock.json"
        if path.exists() and unseal(path)["lock"] != lock:
            raise PipelineBlocked("Test inputs changed after first attempt")
        if not path.exists():
            write_json(path, seal({"lock": lock, "started_at": utc_now()}))
        # Initialization alone reads no test image; ledger precedes every image inference.
        detector = OnnxDetector(onnx_dir)
        examples, new = [], 0
        from PIL import Image
        ledger_path = control / "attempts.json"
        for row in test:
            key = row["image_id"]
            cache = control / (digest(key) + ".json")
            if cache.exists():
                record = unseal(cache)
                if record["identity"] != identity or record["image_sha256"] != row["sha256"]:
                    raise PipelineBlocked("Test cache identity changed")
                prediction = record["prediction"]
            else:
                ledger = unseal(ledger_path)["images"] if ledger_path.exists() else {}
                if key in ledger:
                    raise PipelineBlocked("Image already attempted without a complete cache; cannot repeat test")
                write_json(ledger_path, seal({"images": {**ledger, key: utc_now()}}))
                new += 1
                try:
                    with Image.open(image_path(raw, row["file"])) as image:
                        objects = detector(image)
                    prediction = {"status": "success", "objects": objects, "risks": {}}
                except (ValueError, RuntimeError, OSError):
                    prediction = {"status": "error", "objects": [], "risks": {}}
                write_json(cache, seal({"identity": identity, "image_sha256": row["sha256"], "prediction": prediction}))
            actual = {**truth[key], "objects": [obj for obj in truth[key]["objects"] if obj["category"] in run["classes"]]}
            examples.append({"image_id": key, "group_id": row["group_id"], "truth": actual, "prediction": prediction})
            print(json.dumps({"split": "test", "image_id": key, "status": prediction["status"]}), flush=True)
        metrics = evaluate(examples, [{"name": name} for name in run["classes"]], run["plan"]["training"]["bootstrap"],
                           run["plan"]["seed"], identity["threshold"])
        report = {"identity": identity, "completed_at": utc_now(), "status": "completed" if not metrics["inference_failures"] else "incomplete",
            "images": metrics["images"], "groups": metrics["groups"], "inference_failures": metrics["inference_failures"],
            "detection": metrics["detection"], "bootstrap": metrics["bootstrap"], "new_inferences": new,
            "untrained_classes": run["untrained_classes"], "risk_metrics": None, "risk_supported": False,
            "note": "Detector only; no risk accuracy claim. Test membership is fixed and may have been used by Stage 4; this is not proof of a fresh unseen holdout."}
        write_json(result_path, seal(report))
        write_json(reports / "final_test.json", seal(report))
        return report


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run", type=Path, default=ROOT / "models/stage5/rtdetr_r18")
    parser.add_argument("--onnx", type=Path, default=ROOT / "models/stage5/rtdetr_r18/onnx")
    parser.add_argument("--bundle", type=Path, default=HOME / "training_bundle/bundle.json")
    parser.add_argument("--raw", type=Path, default=DEFAULT_RAW)
    args = parser.parse_args()
    try:
        result = final_test(args.run, args.onnx, args.bundle, raw=args.raw)
        print(json.dumps({key: result.get(key) for key in ["status", "new_inferences", "reused"]}))
    except (PipelineBlocked, FileNotFoundError) as error:
        print(json.dumps({"status": "blocked", "reason": str(error), "new_inferences": 0}))
        raise SystemExit(2)
