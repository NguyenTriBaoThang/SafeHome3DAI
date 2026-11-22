"""Check integration test evidence and data/frozen-source integrity without inference or DB writes."""
import ast
import hashlib
import json
import subprocess
import sys
import zipfile
from collections import Counter
from pathlib import Path

from dataset_common import DEFAULT_RAW, ROOT, sha256_file, utc_now, write_json
from experiment_stage4 import unseal
from export_serving_config import build as build_serving_config


def verify():
    destination = ROOT / "reports/stage6"
    tests = {}
    for name in ("vitest", "risk-regression"):
        data = json.loads((destination / f"{name}.json").read_text(encoding="utf-8"))
        if not data["success"] or data["numFailedTests"] or data["numFailedTestSuites"]:
            raise ValueError(f"Failed or incomplete test report: {name}")
        # Vitest 1.x JSON summary can count a skipped assertion as passed.
        # Per-assertion status is authoritative and agrees with the terminal reporter.
        counts = Counter(item["status"] for suite in data["testResults"] for item in suite["assertionResults"])
        if set(counts) - {"passed", "skipped", "pending", "todo"}:
            raise ValueError(f"Unexpected or failed assertion status: {name}")
        tests[name] = {"numPassedTests": counts["passed"],
            "numPendingTests": counts["skipped"] + counts["pending"] + counts["todo"],
            "numFailedTests": 0, "startTime": data["startTime"], "count_source": "per_assertion_status"}
        tests[name]["sha256"] = sha256_file(destination / f"{name}.json")
    protocol = unseal(ROOT / "data/processed/stage4/exploratory/protocol.json")
    frozen = protocol["config"]
    hashes = {**frozen["source_sha256"], "data/raw/manifest.csv": frozen["raw_manifest_sha256"],
              "data/review/decisions.json": frozen["human_decisions_sha256"]}
    for name, expected in hashes.items():
        if sha256_file(ROOT / name) != expected:
            raise ValueError(f"Frozen historical input or source changed: {name}")
    archive = Path(r"C:\Users\ThangNTB\Desktop\SafeHome3DAI_500_images.zip")
    count = 0
    with zipfile.ZipFile(archive) as source:
        for entry in source.infolist():
            if entry.is_dir():
                continue
            if sha256_file(DEFAULT_RAW / entry.filename) != hashlib.sha256(source.read(entry)).hexdigest():
                raise ValueError(f"Raw file differs from original ZIP: {entry.filename}")
            count += 1
    ast.parse((ROOT / "scripts/ml/serve_stage5.py").read_text(encoding="utf-8"))
    smoke = json.loads((destination / "http-smoke.json").read_text(encoding="utf-8"))
    if len(smoke["checks"]) != 5 or any(item["status"] != "passed" for item in smoke["checks"]):
        raise ValueError("Built Next HTTP smoke checks did not pass")
    browser = json.loads((destination / "browser.json").read_text(encoding="utf-8"))
    if browser.get("status") != "passed" or len(browser["checks"]) < 10 or any(item["status"] != "passed" for item in browser["checks"]):
        raise ValueError("Browser/SQLite end-to-end verification did not pass")
    if browser["build_id"] != smoke["build_id"] or not browser.get("user_database_unchanged"):
        raise ValueError("HTTP/browser checks must use the same build and preserve the user's database")
    serving = json.loads((ROOT / "src/lib/vision/providers/structuredConfig.json").read_text(encoding="utf-8"))
    if serving != build_serving_config():
        raise ValueError("Serving recipe no longer matches the exported locked structured configuration")
    live = json.loads((destination / "gemini-live.json").read_text(encoding="utf-8"))
    if live.get("status") != "passed" or live.get("test_used") or not live.get("protected_test_group_checked") or not live.get("human_scene_verified") or live["recipe_sha256"] != serving["content_sha256"]:
        raise ValueError("Live functional check must be successful, non-test, human-scene-reviewed and use this recipe")
    if sha256_file(ROOT / "data/processed/stage6/live_functional_result.json") != live["payload_sha256"]:
        raise ValueError("Cached functional result changed")
    readiness = unseal(ROOT / "reports/stage5/readiness.json")
    checked = subprocess.run(["node", str(ROOT / "node_modules/typescript/bin/tsc"), "--noEmit"],
        cwd=ROOT, capture_output=True, text=True, encoding="utf-8", timeout=180, shell=False)
    (destination / "typecheck.log").write_text(checked.stdout + checked.stderr, encoding="utf-8")
    if checked.returncode:
        raise ValueError("TypeScript typecheck failed; see reports/stage6/typecheck.log")
    source_files = ["src/lib/vision/visionProvider.ts", "src/lib/vision/clarificationEngine.ts",
        "src/lib/vision/photoRiskAssessment.ts", "src/lib/vision/photoClarifications.ts", "src/app/ai-vision/page.tsx",
        "src/app/api/vision/scan-photo/route.ts", "src/app/api/vision/images/[imageId]/analyze/route.ts",
        "tests/visionProviders.test.ts", "tests/visionRoutes.test.ts", "tests/geminiVision.test.ts",
        "scripts/ml/serve_stage5.py", "scripts/ml/smoke_stage6.cjs", "scripts/ml/verify_stage6.py",
        "scripts/ml/browser_stage6.cjs", "scripts/ml/export_serving_config.py", "scripts/ml/check_gemini_serving.py",
        "scripts/ml/live_serving_bridge.cjs", "src/lib/vision/visionAnswerContract.ts", "src/lib/vision/surveySyncAdapter.ts",
        "src/lib/vision/confirmedRiskAssessment.ts", "src/lib/vision/visionPersistence.ts", "src/lib/vision/imagePreprocessor.ts",
        "src/lib/vision/imageStorage.ts", "src/lib/survey/profileBuilder.ts", "prisma/schema.prisma",
        "src/components/layout/AppHeader.tsx",
        "tests/structuredGemini.test.ts", "tests/visionState.test.ts", "tests/visionProfile.test.ts",
        "src/lib/vision/providers/structuredConfig.json",
        "src/app/api/vision/images/[imageId]/file/route.ts", "src/app/api/vision/rooms/[roomId]/images/route.ts",
        "src/app/api/vision/analyses/[analysisId]/route.ts", "src/app/api/vision/detections/[detectionId]/route.ts",
        "src/app/api/vision/clarifications/[id]/answer/route.ts",
        "package.json", ".github/workflows/ci.yml", ".env.example"]
    source_files += [str(p.relative_to(ROOT)).replace("\\", "/") for p in (ROOT / "src/lib/vision/providers").glob("*.ts")]
    output = {"verified_at": utc_now(), "status": "software_verified_ml_quality_pending",
        "tests": tests, "built_next_http_checks_passed": len(smoke["checks"]), "build_id": smoke["build_id"],
        "browser_checks_passed": len(browser["checks"]), "user_database_unchanged": browser["user_database_unchanged"],
        "live_gemini_functional_check": {"passed": True, "api_attempts": live["api_attempts"],
            "latency_ms_single_request": live["latency_ms_single_request"], "not_an_accuracy_measurement": True},
        "typecheck_exit_code": checked.returncode, "python_service_syntax_valid": True,
        "raw_files_match_original_zip": count, "manifest_unchanged": True, "human_decisions_unchanged": True,
        "stage4_fingerprinted_sources_unchanged": True, "medical_registry_unchanged": True,
        "stage4_or_stage5_inference_reexecuted": False, "paid_api_calls_by_verification": 0,
        "real_onnx_model_tested": False, "local_http_test": "loopback contract fixture; not FastAPI/ONNX inference",
        "new_provider_accuracy": None, "training_permitted": readiness["training_permitted"],
        "verified_train_images": readiness["verified_train_images"], "verified_val_images": readiness["verified_val_images"],
        "remaining_blockers": readiness["blockers"],
        "source_sha256": {name: sha256_file(ROOT / name) for name in sorted(source_files)}}
    write_json(destination / "verification.json", output)
    print(json.dumps(output, ensure_ascii=False, indent=2))
    return output


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    verify()
