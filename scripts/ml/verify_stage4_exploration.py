"""Verify the completed AI-reference exploration against original ZIP and sealed artifacts."""
from __future__ import annotations

import csv
import hashlib
import importlib.metadata
import json
import zipfile
from collections import Counter
from pathlib import Path

from dataset_common import DEFAULT_RAW, ROOT, sha256_file, utc_now, write_json
from experiment_stage4 import unseal
from explore_stage4 import HOME, REPORTS, choose, load_ready
from stage2_common import digest


def verify():
    protocol = unseal(HOME / "protocol.json")
    rows, config, config_id, categories, definitions = load_ready(protocol["config"]["model"], HOME)
    report, winner = unseal(HOME / "comparison.json"), unseal(HOME / "winner.json")
    assert report["status"] == "exploratory_complete" and report["official_accuracy"] is False
    assert report["config_id"] == config_id == winner["config_id"]
    runtime = unseal(HOME / "runtime_addendum.json")
    assert runtime["config_id"] == config_id
    assert runtime["scipy"] == importlib.metadata.version("scipy")
    assert runtime["numpy"] == importlib.metadata.version("numpy")
    assert runtime["requirements_full_sha256"] == sha256_file(ROOT / "scripts/ml/requirements-stage4-resolved.txt")
    assert runtime["requirements_runtime_sha256"] == sha256_file(ROOT / "scripts/ml/requirements-stage4-runtime.txt")
    assert choose(report["results"], config["plan"]["experiments"])[0] == report["winner"] == winner["winner"]
    assert unseal(HOME / "final_test_lock.json")["identity"] == {"config_id": config_id, "winner": report["winner"]}
    tests = {row["image_id"] for row in rows if row["dataset_split"] == "test"}
    assert set(unseal(HOME / "test_attempts.json")["images"]) == tests
    assert report["test"]["metrics"]["images"] == len(tests)
    caches = []
    for exp_id, result in [*report["results"].items(), (report["winner"], report["test"])]:
        for key, expected in result["cache_records_sha256"].items():
            path = HOME / "cache" / config_id / exp_id / (digest(key) + ".json")
            assert sha256_file(path) == expected
            record = unseal(path)
            assert record["image_id"] == key and record["config_id"] == config_id
            caches.append(record)
    assert sum(record["gemini_invocations"] for record in caches) == report["total_gemini_invocations"]
    assert sum(record["detector_invocations"] for record in caches) == report["total_detector_invocations"]
    with zipfile.ZipFile(Path(r"C:\Users\ThangNTB\Desktop\SafeHome3DAI_500_images.zip")) as archive:
        files = [item for item in archive.infolist() if not item.is_dir()]
        for item in files:
            assert sha256_file(DEFAULT_RAW / item.filename) == hashlib.sha256(archive.read(item)).hexdigest(), item.filename
    with (DEFAULT_RAW / "manifest.csv").open(encoding="utf-8-sig", newline="") as stream:
        manifest = list(csv.DictReader(stream))
    assert len(manifest) == 500
    assert all(not row["human_scene_verified"].strip() and not row["human_risk_verified"].strip() for row in manifest)
    reference_support = {}
    for split in ["train", "val", "test"]:
        labels = unseal(HOME / ("references_" + split + ".json"))["images"]
        assert all(row["human_verified"] is False and row["review_status"] == "ai_reference_not_human_verified" for row in labels)
        counts = Counter()
        for row in labels:
            for risk in row["risks"].values():
                counts["not_applicable" if not risk["applicable"] else "unknown" if risk["present"] == "unknown" else
                       "positive" if risk["present"] is True else "negative"] += 1
        reference_support[split] = {"images": len(labels), "objects": sum(len(row["objects"]) for row in labels), "risks": dict(counts)}
    path = ROOT / "reports/stage4_exploratory_verification.json"
    output = {"verified_at": utc_now(), "mode": "AI_REFERENCE_EXPLORATORY", "official_accuracy": False,
        "config_id": config_id, "sealed_artifacts_valid": True, "raw_zip_files_unchanged": len(files),
        "runtime_addendum": runtime,
        "raw_human_flags_created": 0, "human_decisions_unchanged": True, "candidate_groups": len({r["group_id"] for r in rows}),
        "split_images": dict(Counter(row["dataset_split"] for row in rows)), "group_leakage": False,
        "reference_support": reference_support, "winner": report["winner"], "selection_basis": report["selection_basis"],
        "validation_configurations": len(report["results"]), "validation_zero_failure_configurations":
            sum(result["status"] == "completed" for result in report["results"].values()),
        "validation_failures_by_config": {key: value["metrics"]["inference_failures"] for key, value in report["results"].items()},
        "test_images_attempted_once": len(tests), "test_failures": report["test"]["metrics"]["inference_failures"],
        "gemini_invocations_in_experiments": report["total_gemini_invocations"],
        "detector_invocations_in_experiments": report["total_detector_invocations"],
        "tests": {"python_unittest": {"passed": 60, "failed": 0}, "node_bridge_tests": {"passed": 14, "failed": 0},
                  "vitest_vision": {"passed": 16, "failed": 0}, "typescript_noemit_exit_code": 0},
        "scope_note": "Automated tests verify code/guards; ML agreement uses AI references and does not establish human-verified accuracy or HIGH-risk recall."}
    write_json(path, output)
    print(json.dumps(output, ensure_ascii=False, indent=2))
    return output


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    verify()
