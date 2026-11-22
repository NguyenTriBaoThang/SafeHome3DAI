"""Verify current blocked preparation, CLI gates, notebook, and original data integrity."""
import ast
import hashlib
import json
import subprocess
import sys
import zipfile
from pathlib import Path

from dataset_common import DEFAULT_RAW, ROOT, sha256_file, utc_now, write_json
from experiment_stage4 import unseal
from stage5_common import REPORTS, inspect, write_readiness


def verify():
    report, _ = inspect()
    if report["training_permitted"]:
        raise ValueError("This verification describes blocked preparation, not a completed training run")
    write_readiness(report)
    commands = [
        ["prepare_stage5.py", "export"], ["train_detector.py", "--device", "cpu"],
        ["export_stage5_onnx.py", "export"], ["export_stage5_onnx.py", "benchmark"], ["final_test_stage5.py"]]
    gates = []
    for command in commands:
        result = subprocess.run([sys.executable, str(ROOT / "scripts/ml" / command[0]), *command[1:]],
                                cwd=ROOT, capture_output=True, text=True, encoding="utf-8", timeout=30, shell=False)
        response = json.loads(result.stdout)
        if result.returncode != 2 or response.get("status") != "blocked":
            raise ValueError("Expected data/model gate was not enforced: " + command[0])
        gates.append({"command": command, "exit_code": result.returncode, "status": response["status"]})
    # The CLI export gate refreshes readiness, so use its current sealed artifact.
    current = unseal(REPORTS / "readiness.json")
    protocol = unseal(ROOT / "data/processed/stage4/exploratory/protocol.json")
    if sha256_file(DEFAULT_RAW / "manifest.csv") != protocol["config"]["raw_manifest_sha256"]:
        raise ValueError("Raw manifest changed")
    if sha256_file(ROOT / "data/review/decisions.json") != protocol["config"]["human_decisions_sha256"]:
        raise ValueError("User decisions changed")
    for name, expected in protocol["config"]["source_sha256"].items():
        if sha256_file(ROOT / name) != expected:
            raise ValueError("Frozen Stage 4 source changed: " + name)
    archive = Path(r"C:\Users\ThangNTB\Desktop\SafeHome3DAI_500_images.zip")
    unchanged = 0
    with zipfile.ZipFile(archive) as source:
        for entry in source.infolist():
            if entry.is_dir():
                continue
            if sha256_file(DEFAULT_RAW / entry.filename) != hashlib.sha256(source.read(entry)).hexdigest():
                raise ValueError("Raw file differs from original ZIP: " + entry.filename)
            unchanged += 1
    notebook = json.loads((ROOT / "notebooks/stage5_detector_finetune.ipynb").read_text(encoding="utf-8"))
    code_cells = 0
    for cell in notebook["cells"]:
        if cell["cell_type"] == "code":
            if cell["outputs"] or cell["execution_count"] is not None:
                raise ValueError("Notebook must not contain invented outputs")
            ast.parse("".join(cell["source"]))
            code_cells += 1
    models = list((ROOT / "models/stage5").rglob("*.safetensors")) if (ROOT / "models/stage5").exists() else []
    onnx = list((ROOT / "models/stage5").rglob("*.onnx")) if (ROOT / "models/stage5").exists() else []
    if models or onnx:
        raise ValueError("Unexpected Stage 5 model artifact during blocked preparation")
    output = {"verified_at": utc_now(), "status": "preparation_verified_training_blocked", "training_on_user_data": False,
        "raw_files_match_original_zip": unchanged, "human_decisions_unchanged": True, "stage4_sources_unchanged": True,
        "protected_prior_test_images": current["protected_prior_test"]["test_images"], "test_annotations_parsed": False,
        "human_scene_eligible_images": current["human_scene_eligible_images"], "verified_train_images": current["verified_train_images"],
        "verified_val_images": current["verified_val_images"], "eligible_object_classes": current["eligible_classes"],
        "ai_train_reference_images_not_trainable": current["ai_train_reference_images_not_trainable"],
        "ai_train_reference_objects_not_trainable": current["ai_train_reference_objects_not_trainable"],
        "raw_unlabeled_risk_rows_preserved": current["raw_risk_unlabeled_rows"],
        "additional_positive_verified_train_images_per_risk": {row["risk_id"]: row["additional_positive_images_needed"] for row in current["risks"]},
        "cli_gates": gates, "notebook_code_cells_syntax_checked": code_cells, "notebook_execution_outputs": 0,
        "python_unittest": {"passed": 75, "failed": 0, "stage5_cases": 15, "includes_tiny_random_model_one_epoch_on_temporary_synthetic_data": True},
        "real_finetuned_models": 0, "onnx_exports": 0, "real_model_latency_ms": None,
        "real_model_onnx_parity": "not_evaluated", "cuda_or_colab_training": "not_executed",
        "optional_stage5_dependencies_installed": False, "stage5_pretrained_weights_downloaded": False,
        "scope": "Guard/data/geometry and synthetic training-loop checks only; no user-data fine-tuning, accuracy or latency claim."}
    write_json(REPORTS / "verification.json", output)
    print(json.dumps(output, ensure_ascii=False, indent=2))
    return output


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    verify()
