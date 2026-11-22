"""Evaluate the existing Gemini photo pipeline only on frozen, human-verified ground truth."""
from __future__ import annotations

import argparse
import base64
import csv
import json
import math
import mimetypes
import os
import subprocess
from collections import Counter
from pathlib import Path

from baseline_metrics import evaluate
from baseline_report import write_report
from dataset_common import DEFAULT_RAW, DEFAULT_REVIEW, ROOT, image_path, sha256_file, utc_now, write_json
from import_verified import VERIFIED, load_verified
from stage2_common import RISK_IDS, STAGE2, PipelineBlocked, digest, load_frozen, reviewed_inputs

BRIDGE = Path(__file__).with_name("baseline_bridge.cjs")
CACHE = ROOT / "data/processed/stage3/predictions"
SOURCE_FILES = ["src/lib/vision/geminiVisionAdapter.ts", "src/lib/vision/imageRiskAssessment.ts", "src/lib/vision/types.ts",
                "src/lib/vision/taxonomy.ts", "src/lib/risk/ruleEngine.ts", "src/lib/risk/inputAdapter.ts",
                "src/lib/risk/riskRuleRegistry.ts", "src/lib/risk/types.ts", "scripts/ml/baseline_bridge.cjs"]


def live_transport(request):
    result = subprocess.run(["node", str(BRIDGE)], input=json.dumps(request), text=True, encoding="utf-8",
                            capture_output=True, timeout=40, cwd=ROOT, shell=False)
    if result.returncode:
        try:
            code = json.loads(result.stderr)["error"]
        except (ValueError, KeyError, TypeError):
            code = "BRIDGE_FAILED"
        raise RuntimeError(code if code in {"NO_LIVE_INFERENCE", "BASELINE_INFERENCE_FAILED", "INVALID_INPUT"} else "BRIDGE_FAILED")
    return json.loads(result.stdout)


def normalize_prediction(response, model, categories):
    if response.get("modelUsed") != model:
        raise ValueError("Model/fallback mismatch")
    names = {category["name"] for category in categories}
    objects = []
    detections = response.get("detections")
    if not isinstance(detections, list):
        raise ValueError("Invalid detections")
    for obj in detections:
        if obj.get("source") != "VISION_LANGUAGE_MODEL" or obj.get("category") not in names:
            raise ValueError("Fallback or unknown category in baseline")
        box = obj.get("bbox", {})
        values = [box.get(key) for key in ["xMin", "yMin", "xMax", "yMax"]]
        confidence = obj.get("confidence")
        if any(type(v) not in {int, float} or not math.isfinite(v) or not 0 <= v <= 1 for v in values):
            raise ValueError("Invalid bbox")
        if box["xMin"] >= box["xMax"] or box["yMin"] >= box["yMax"]:
            raise ValueError("Degenerate bbox")
        if type(confidence) not in {int, float} or not math.isfinite(confidence) or not 0 <= confidence <= 1:
            raise ValueError("Invalid confidence")
        objects.append({"category": obj["category"], "bbox": box, "confidence": confidence})
    risks = response.get("risks")
    if not isinstance(risks, dict) or type(response.get("risk_supported")) is not bool:
        raise ValueError("Invalid risk pipeline output")
    if response["risk_supported"] and set(risks) != set(RISK_IDS):
        raise ValueError("Missing risk outputs")
    for value in risks.values():
        present = value.get("present")
        if present is not True and present is not False and present != "unknown":
            raise ValueError("Invalid tri-state prediction")
    return {"status": "success", "objects": objects, "risks": risks,
            "risk_supported": response["risk_supported"], "unsupported_reason": response.get("unsupported_reason"),
            "model_used": response["modelUsed"], "provenance": response.get("provenance")}


def run_baseline(raw=DEFAULT_RAW, review=DEFAULT_REVIEW, frozen=STAGE2 / "frozen", verified=VERIFIED,
                 cache=CACHE, reports=ROOT / "reports", model=None, split="val", bootstrap=1000,
                 seed=20261122, threshold=.5, dry_run=False, transport=None, retry_errors=False):
    if split not in {"val", "test", "both"} or bootstrap < 1 or not 0 <= threshold <= 1:
        raise ValueError("Invalid split/bootstrap/confidence threshold")
    if any(reports.resolve().is_relative_to(path.resolve()) or cache.resolve().is_relative_to(path.resolve()) for path in [raw, review, frozen]):
        raise PipelineBlocked("Reports/cache must stay outside raw, review and frozen source")
    report = {"status": "blocked", "generated_at": utc_now(), "blockers": [], "api_calls": 0,
              "cache_hits": 0, "splits": {}, "ml_metrics": "chưa đánh giá được",
              "metric_implementation_sha256": sha256_file(Path(__file__).with_name("baseline_metrics.py"))}
    try:
        store, state, eligible, excluded = reviewed_inputs(raw, review)
        report["readiness"] = {"raw_images": len(store.rows), "eligible_images": len(eligible), "excluded": dict(Counter(excluded.values()))}
        if not eligible:
            report["blockers"].append("Chưa có ảnh human_scene_verified=true và đủ metadata giấy phép.")
    except (ValueError, OSError, KeyError) as error:
        report["blockers"].append("Dữ liệu audit/review chưa hợp lệ: " + type(error).__name__)
    if not (frozen / "snapshot.json").is_file():
        report["blockers"].append("Chưa có snapshot chia tập theo nhóm đóng băng từ Giai đoạn 2.")
    if not verified.is_file():
        report["blockers"].append("Chưa có bundle nhãn verified nhập từ xác nhận thủ công trong Label Studio.")
    if report["blockers"]:
        write_report(report, [], raw, reports, threshold)
        return report
    snapshot, rows, categories, definitions = load_frozen(frozen, raw, review)
    bundle = load_verified(verified, snapshot, rows, categories, definitions)
    truth = {record["image_id"]: record for record in bundle["images"]}
    selected = [row for row in rows if row["dataset_split"] in ({"val", "test"} if split == "both" else {split})]
    if not selected or any(row["image_id"] not in truth for row in selected):
        report["blockers"] = ["Cần nhãn người duyệt đầy đủ cho toàn bộ ảnh trong tập được chọn; không chọn riêng ảnh thuận lợi."]
        report["missing_verified_images"] = [row["image_id"] for row in selected if row["image_id"] not in truth]
        write_report(report, [], raw, reports, threshold)
        return report
    if not model:
        raise PipelineBlocked("Choose the current Gemini model explicitly using --model or GEMINI_MODEL")
    config = {"model": model, "baseline": "existing Gemini room adapter + existing UI risk helper",
              "snapshot_sha256": digest(snapshot), "verified_sha256": bundle["content_sha256"],
              "source_sha256": {name: sha256_file(ROOT / name) for name in SOURCE_FILES}, "confidence_threshold": threshold,
              "generation_config": "unchanged current adapter (JSON MIME, 3.5-second timeout; no added sampling settings)"}
    run_id = digest(config)
    report.update(run_id=run_id, config=config, requested_split=split, selected_images=len(selected),
                  bootstrap={"iterations": bootstrap, "seed": seed, "unit": "group"}, status="dry_run" if dry_run else "running")
    if dry_run:
        write_report(report, [], raw, reports, threshold)
        return report
    run_dir = cache / run_id
    def needs_call(row):
        path = run_dir / (digest(row["image_id"]) + ".json")
        return not path.is_file() or retry_errors and json.loads(path.read_text(encoding="utf-8"))["prediction"]["status"] == "error"
    missing_cache = any(needs_call(row) for row in selected)
    if missing_cache and transport is None and not os.environ.get("GEMINI_API_KEY"):
        raise PipelineBlocked("GEMINI_API_KEY missing from process environment; no live calls made")
    if any(row["dataset_split"] == "test" for row in selected):
        lock = frozen.parent / "baseline_test_lock.json"
        if lock.exists():
            if json.loads(lock.read_text(encoding="utf-8"))["run_id"] != run_id:
                raise PipelineBlocked("Baseline test config is frozen; do not tune model, code or threshold on test")
        else:
            with lock.open("x", encoding="utf-8") as stream:
                json.dump({"run_id": run_id, "created_at": utc_now(), "config": config}, stream, ensure_ascii=False)
    run_dir.mkdir(parents=True, exist_ok=True)
    write_json(run_dir / "run_config.json", config)
    transport = transport or live_transport
    examples = []
    for row in selected:
        key = row["image_id"]
        path = run_dir / (digest(key) + ".json")
        cached = None
        if path.exists():
            record = json.loads(path.read_text(encoding="utf-8"))
            if record.get("run_id") != run_id or record.get("image_id") != key or record.get("image_sha256") != row["sha256"]:
                raise PipelineBlocked("Cached prediction provenance mismatch")
            if record.get("content_sha256") != digest({k: v for k, v in record.items() if k != "content_sha256"}):
                raise PipelineBlocked("Cached prediction was modified")
            cached = record["prediction"]
        if cached is not None and not (retry_errors and cached["status"] == "error"):
            prediction = cached
            report["cache_hits"] += 1
        else:
            image = image_path(raw, row["file"])
            if sha256_file(image) != row["sha256"].strip().lower():
                raise PipelineBlocked("Image changed before baseline inference")
            request = {"model": model, "room": row["room"], "imageId": key,
                       "imageBase64": base64.b64encode(image.read_bytes()).decode("ascii"),
                       "mimeType": mimetypes.guess_type(row["file"])[0] or "image/jpeg"}
            report["api_calls"] += 1
            try:
                prediction = normalize_prediction(transport(request), model, categories)
            except (ValueError, TypeError, KeyError, RuntimeError, subprocess.TimeoutExpired) as error:
                safe = str(error) if isinstance(error, RuntimeError) and str(error) in {"NO_LIVE_INFERENCE", "BASELINE_INFERENCE_FAILED", "BRIDGE_FAILED"} else type(error).__name__
                prediction = {"status": "error", "error": safe, "objects": [], "risks": {}}
            record = {"run_id": run_id, "image_id": key, "image_sha256": row["sha256"], "prediction": prediction, "created_at": utc_now()}
            record["content_sha256"] = digest(record)
            write_json(path, record)
        examples.append({"image_id": key, "group_id": row["group_id"], "row": row, "truth": truth[key], "prediction": prediction})
        print(json.dumps({"image_id": key, "status": prediction["status"], "api_calls": report["api_calls"], "cache_hits": report["cache_hits"]}), flush=True)
    for current in ["val", "test"]:
        subset = [example for example in examples if example["row"]["dataset_split"] == current]
        if subset:
            report["splits"][current] = evaluate(subset, categories, bootstrap, seed, threshold)
    report["status"] = "incomplete" if any(example["prediction"]["status"] != "success" for example in examples) else "completed"
    report["ml_metrics"] = "computed_from_verified_ground_truth"
    write_report(report, examples, raw, reports, threshold)
    print(json.dumps({"status": report["status"], "api_calls": report["api_calls"], "metrics": report["splits"]}, ensure_ascii=False), flush=True)
    return report


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw", type=Path, default=DEFAULT_RAW)
    parser.add_argument("--review", type=Path, default=DEFAULT_REVIEW)
    parser.add_argument("--frozen", type=Path, default=STAGE2 / "frozen")
    parser.add_argument("--verified", type=Path, default=VERIFIED)
    parser.add_argument("--cache", type=Path, default=CACHE)
    parser.add_argument("--reports", type=Path, default=ROOT / "reports")
    parser.add_argument("--model", default=os.environ.get("GEMINI_MODEL"))
    parser.add_argument("--split", choices=["val", "test", "both"], default="val")
    parser.add_argument("--bootstrap", type=int, default=1000)
    parser.add_argument("--seed", type=int, default=20261122)
    parser.add_argument("--confidence-threshold", type=float, default=.5)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--retry-errors", action="store_true", help="Retry failed inference only, with the identical locked configuration")
    args = parser.parse_args()
    try:
        report = run_baseline(args.raw, args.review, args.frozen, args.verified, args.cache, args.reports,
                              args.model, args.split, args.bootstrap, args.seed, args.confidence_threshold, args.dry_run, retry_errors=args.retry_errors)
        print(json.dumps({"status": report["status"], "blockers": report["blockers"], "api_calls": report["api_calls"]}, ensure_ascii=False, indent=2))
        if report["status"] in {"blocked", "incomplete"}:
            raise SystemExit(2)
    except (ValueError, OSError, KeyError, TypeError) as error:
        parser.exit(2, f"Baseline blocked: {error}\n")
