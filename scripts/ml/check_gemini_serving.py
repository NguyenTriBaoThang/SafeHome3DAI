"""One functional schema/network check on a human-scene-reviewed image; no quality scoring."""
import base64
import json
import mimetypes
import subprocess
import sys

from dataset_common import DEFAULT_RAW, ROOT, image_path, sha256_file, utc_now, write_json
from stage2_common import reviewed_inputs
from stage5_common import protected_test


def run():
    report_path = ROOT / "reports/stage6/gemini-live.json"
    store, _, eligible, _ = reviewed_inputs(DEFAULT_RAW, ROOT / "data/review")
    protected, _ = protected_test(store, ROOT / "data/processed/stage4/exploratory/protocol.json")
    if report_path.exists():
        cached = json.loads(report_path.read_text(encoding="utf-8"))
        if cached["image_id"] in protected:
            raise ValueError("Functional image belongs to a protected test group")
        write_json(report_path, {**cached, "protected_test_group_checked": True})
        print(json.dumps({"status": "cached", "new_api_calls": 0, "report": str(report_path)}))
        return
    choices = sorted((row for row in eligible if row["image_id"] not in protected), key=lambda row: row["image_id"])
    if not choices:
        raise ValueError("A human-scene-reviewed non-test image is required for the live functional check")
    row = choices[0]
    image = image_path(DEFAULT_RAW, row["file"])
    record = {"started_at": utc_now(), "status": "attempt_recorded", "image_id": row["image_id"],
        "image_sha256": sha256_file(image), "human_scene_verified": True, "test_used": False,
        "protected_test_group_checked": True,
        "mode": "FUNCTIONAL_CHECK_ONLY", "quality_metrics": None, "max_api_attempts": 1}
    write_json(report_path, record)
    request = {"room": row["room"], "imageBase64": base64.b64encode(image.read_bytes()).decode("ascii"),
        "mimeType": mimetypes.guess_type(image)[0] or "image/jpeg"}
    process = subprocess.run(["node", str(ROOT / "scripts/ml/live_serving_bridge.cjs")],
        input=json.dumps(request), text=True, encoding="utf-8", capture_output=True, timeout=80, cwd=ROOT, shell=False)
    try:
        result = json.loads(process.stdout)
    except (ValueError, TypeError):
        result = {"status": "failed", "error": "BRIDGE_OUTPUT_INVALID"}
    if process.returncode or result.get("status") != "success":
        write_json(report_path, {**record, "status": "failed", "finished_at": utc_now(), "error": "LIVE_STRUCTURED_REQUEST_FAILED"})
        raise RuntimeError("Live functional check failed; no accuracy claim or automatic retry")
    cache = ROOT / "data/processed/stage6/live_functional_result.json"
    write_json(cache, result)
    write_json(report_path, {**record, "status": "passed", "finished_at": utc_now(), "api_attempts": 1,
        "model": result["model"], "model_version": result["modelVersion"], "recipe_sha256": result["recipeSha256"],
        "latency_ms_single_request": result["latencyMs"], "objects_returned": len(result["payload"]["objects"]),
        "schema_valid": True, "payload_sha256": sha256_file(cache),
        "limitations": "Single network/schema check, not detection accuracy, risk recall, latency benchmark or a new test evaluation."})
    print(json.dumps(json.loads(report_path.read_text(encoding="utf-8")), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    run()
