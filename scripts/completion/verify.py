"""Read saved acceptance evidence; never calls a provider or changes dataset labels."""
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPORTS = ROOT / "reports/completion"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(name):
    return json.loads((REPORTS / name).read_text(encoding="utf-8"))


def main():
    tests = read("full-tests.json")
    assertions = [a for f in tests["testResults"] for a in f["assertionResults"]]
    counts = {status: sum(a["status"] == status for a in assertions) for status in ["passed", "failed", "pending", "skipped", "todo"]}
    assert counts["failed"] == 0 and counts["passed"] > 0
    assert all(f["status"] == "passed" for f in tests["testResults"])
    build = (ROOT / os.getenv("SAFEHOME_BUILD_DIR", ".scratch/completion-production") / "BUILD_ID").read_text().strip()
    http, browser, restore = read("http-smoke.json"), read("browser.json"), read("restore.json")
    assert http["build_id"] == browser["build_id"] == build
    assert all(c["status"] == "passed" for c in http["checks"] + browser["checks"])
    assert browser["status"] == restore["status"] == "passed"
    assert browser["user_database_unchanged"]
    baseline = read("db-baseline.json")
    user_database = ROOT / "prisma/dev.db"
    current = digest(user_database) if user_database.exists() else None
    assert current == baseline["sha256"], "User database changed during the final full suite"
    assert browser["paid_api_calls"] == http["paid_api_calls"] == 0
    routes = list((ROOT / "src/app/api").rglob("route.ts"))
    guarded = []
    for route in routes:
        if "auth" in route.relative_to(ROOT / "src/app/api").parts:
            continue
        source = route.read_text(encoding="utf-8")
        assert "withAccount(" in source, f"Missing account guard: {route}"
        assert "export async function" not in source, f"Unwrapped handler: {route}"
        guarded.append(str(route.relative_to(ROOT)).replace("\\", "/"))
    protocol = json.loads((ROOT / "data/processed/stage4/exploratory/protocol.json").read_text(encoding="utf-8"))
    frozen = protocol["config"]["source_sha256"]
    for filename, expected in frozen.items():
        assert digest(ROOT / filename) == expected, f"Frozen experiment source changed: {filename}"
    manifest = digest(ROOT / "data/raw/manifest.csv")
    decisions = digest(ROOT / "data/review/decisions.json")
    assert manifest == "750ba47724261bd8cbb3b633c60032ea670d1d1709c9ca35db8bf0621d52c4ce"
    assert decisions == "80c506c72161b4157bbe44503864e909f5d9a4fc8fc9a02d7e7bd5577b34680d"
    readiness = read("ml-readiness/readiness.json")
    result = {
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "status": "software_acceptance_passed_ml_quality_pending",
        "tests": counts, "test_files": len(tests["testResults"]),
        "build_id": build, "http_checks": len(http["checks"]), "browser_checks": len(browser["checks"]),
        "account_routes_guarded": len(guarded), "guarded_routes": guarded,
        "offline_backup_restore": restore["status"], "user_database_unchanged_during_browser_acceptance": True,
        "user_database_unchanged_during_full_suite": True,
        "paid_api_calls": 0, "real_model_accuracy_evaluated": False,
        "stage4_frozen_sources_unchanged": True, "manifest_sha256": manifest, "human_decisions_sha256": decisions,
        "historical_crlf_preserved_by_gitattributes": "src/lib/vision/imageRiskAssessment.ts",
        "training_permitted": readiness["training_permitted"],
        "verified_train_images": readiness["verified_train_images"], "verified_val_images": readiness["verified_val_images"],
        "ml_blockers": readiness["blockers"],
        "limits": ["single Node server with persistent private storage", "one family per account; no membership invitations",
                   "no email verification, email password recovery or MFA", "browser detector is a fixture; no clinical or model accuracy certification"],
    }
    (REPORTS / "verification.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: result[k] for k in ["status", "tests", "http_checks", "browser_checks", "training_permitted"]}))


if __name__ == "__main__":
    main()
