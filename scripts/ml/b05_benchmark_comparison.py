"""Task B05: Cost, latency & object-vs-hazard ablation comparator (Gemini VLM vs RT-DETR R18 Local ONNX).

Never fabricates ONNX checkpoints or verified metrics when verified ground truth is absent.
"""
from __future__ import annotations

import json
import statistics
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
STAGE5_PLAN_PATH = ROOT / "scripts/ml/stage5_plan.json"
DEFAULT_OUTPUT_PATH = ROOT / "reports/b05_comparison.json"


def summarize_latency_ms(samples_ms: list[float]) -> dict[str, float | int | None]:
    clean = sorted(float(x) for x in samples_ms if x >= 0)
    if not clean:
        return {"count": 0, "p50_ms": None, "p95_ms": None, "mean_ms": None}
    p50 = statistics.median(clean)
    idx95 = min(len(clean) - 1, max(0, int(0.95 * (len(clean) - 1))))
    return {
        "count": len(clean),
        "p50_ms": round(p50, 2),
        "p95_ms": round(clean[idx95], 2),
        "mean_ms": round(statistics.mean(clean), 2),
    }


def evaluate_detector_readiness(
    verified_train_images: int,
    verified_val_images: int,
    verified_test_images: int,
    onnx_path: Path | None = None,
) -> dict[str, Any]:
    plan = json.loads(STAGE5_PLAN_PATH.read_text(encoding="utf-8"))
    onnx_exists = bool(onnx_path and onnx_path.exists())
    has_locked_test = verified_test_images > 0
    has_train_val = verified_train_images > 0 and verified_val_images > 0

    status = "ready" if (has_locked_test and has_train_val and onnx_exists) else "not_ready"
    blockers: list[str] = []
    if not has_train_val:
        blockers.append("missing_human_verified_train_val_splits")
    if not has_locked_test:
        blockers.append("missing_human_verified_locked_test_set")
    if not onnx_exists:
        blockers.append("missing_finetuned_rtdetr_onnx_artifact")

    return {
        "task": "B05",
        "selectedBaseline": {
            "family": "RT-DETR",
            "checkpoint": plan["model"],
            "revision": plan["revision"],
            "license": "Apache-2.0",
            "whyNotYoloDefault": "Ultralytics YOLOv8 uses AGPL-3.0 unless a commercial license is purchased; RT-DETR R18 (Apache-2.0, safetensors) fits academic/hospital deployment.",
        },
        "readiness": {
            "status": status,
            "verifiedTrainImages": verified_train_images,
            "verifiedValImages": verified_val_images,
            "verifiedTestImages": verified_test_images,
            "onnxArtifactPresent": onnx_exists,
            "blockers": blockers,
        },
        "ablationTracks": [
            {
                "stage": "1_object_only",
                "description": "Raw detector output (objects + bboxes only; risk_supported=false; all non-visual risks stay unknown).",
                "objectMetrics": {"precision": None, "recall": None, "f1": None, "map50": None},
                "hazardMetrics": {"precision": None, "recall": None, "f1": None},
            },
            {
                "stage": "2_plus_survey_confirmation",
                "description": "Human accept/edit/reject + clarification answers (rug backing, wet floor, lux, corridor width).",
                "objectMetrics": {"precision": None, "recall": None, "f1": None, "map50": None},
                "hazardMetrics": {"precision": None, "recall": None, "f1": None},
            },
            {
                "stage": "3_canonical_risk_rules",
                "description": "Canonical Rule Engine (RISK-001..008) over confirmed objects + measured/confirmed room properties.",
                "objectMetrics": {"precision": None, "recall": None, "f1": None, "map50": None},
                "hazardMetrics": {"precision": None, "recall": None, "f1": None},
            },
        ],
        "providers": {
            "gemini": {
                "providerId": "gemini",
                "mode": "cloud_vlm_server_proxy",
                "status": "not_benchmarked_on_locked_test" if not has_locked_test else "pending_run",
                "costPerImageUsd": None,
                "latency": summarize_latency_ms([]),
                "unprocessedRate": None,
                "silentFallbackAllowed": False,
            },
            "local_rtdetr": {
                "providerId": "local",
                "mode": "fastapi_onnx_cpu",
                "status": status,
                "costPerImageUsd": 0.0 if onnx_exists else None,
                "latency": summarize_latency_ms([]),
                "peakRamMb": None,
                "unprocessedRate": None,
                "silentFallbackAllowed": False,
            },
        },
        "policyGuards": {
            "equatesObjectMapToHazardRecall": False,
            "usesAiLabelsAsGroundTruth": False,
            "note": "Exploratory 5-image / 38-image Wikimedia figures must NEVER be cited as locked test accuracy or fall-reduction evidence.",
        },
    }


def main() -> None:
    report = evaluate_detector_readiness(
        verified_train_images=0,
        verified_val_images=0,
        verified_test_images=0,
        onnx_path=ROOT / "reports/stage5/model.onnx",
    )
    DEFAULT_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    DEFAULT_OUTPUT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report["readiness"], ensure_ascii=False))


if __name__ == "__main__":
    main()

