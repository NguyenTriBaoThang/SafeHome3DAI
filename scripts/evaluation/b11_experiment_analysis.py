"""Task B11: Reproducible statistical analysis for Checklist vs Checklist+Vision+3D vs Expert ground truth.

Separates 4 problem tracks (object, hazard, 3D MAE cm, usability/SUS). Never fabricates participants,
MAE, or SUS scores when field data have not been collected.
"""
from __future__ import annotations

import json
import math
import random
import statistics
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT_PATH = ROOT / "reports/b11_evaluation_summary.json"
RISK_IDS = [f"RISK-00{i}" for i in range(1, 9)]


def compute_confusion_and_metrics(
    records: list[dict[str, Any]],
) -> dict[str, Any]:
    """Compute binary TP/FP/FN/TN while keeping unknown/not_assessable explicit (never cast as negative)."""
    tp = fp = fn = tn = not_assessable_truth = abstained_pred = 0
    for rec in records:
        truth = rec.get("truth")
        pred = rec.get("predicted")
        if truth not in ("present", "absent"):
            not_assessable_truth += 1
            continue
        if pred not in ("present", "absent"):
            abstained_pred += 1
            continue
        if truth == "present" and pred == "present":
            tp += 1
        elif truth == "absent" and pred == "present":
            fp += 1
        elif truth == "present" and pred == "absent":
            fn += 1
        else:
            tn += 1

    precision = tp / (tp + fp) if (tp + fp) > 0 else None
    recall = tp / (tp + fn) if (tp + fn) > 0 else None
    f1 = (
        (2 * precision * recall) / (precision + recall)
        if precision is not None and recall is not None and (precision + recall) > 0
        else None
    )
    evaluable = tp + fp + fn + tn
    return {
        "evaluableCount": evaluable,
        "notAssessableTruthCount": not_assessable_truth,
        "abstainedPredCount": abstained_pred,
        "confusion": {"tp": tp, "fp": fp, "fn": fn, "tn": tn},
        "precision": round(precision, 4) if precision is not None else None,
        "recall": round(recall, 4) if recall is not None else None,
        "f1": round(f1, 4) if f1 is not None else None,
    }


def compute_bootstrap_ci(
    values: list[float],
    n_resamples: int = 1000,
    seed: int = 20261125,
) -> dict[str, Any]:
    if not values:
        return {"n": 0, "mean": None, "ci95Low": None, "ci95High": None, "exploratoryWarning": True}
    mean_val = statistics.mean(values)
    if len(values) < 2:
        return {
            "n": len(values),
            "mean": round(mean_val, 4),
            "ci95Low": None,
            "ci95High": None,
            "exploratoryWarning": True,
        }
    rng = random.Random(seed)
    means = sorted(
        statistics.mean(rng.choices(values, k=len(values)))
        for _ in range(n_resamples)
    )
    low_idx = max(0, int(0.025 * (n_resamples - 1)))
    high_idx = min(n_resamples - 1, int(0.975 * (n_resamples - 1)))
    return {
        "n": len(values),
        "mean": round(mean_val, 4),
        "ci95Low": round(means[low_idx], 4),
        "ci95High": round(means[high_idx], 4),
        "exploratoryWarning": len(values) < 20,
    }


def compute_mae_cm(pairs: list[tuple[float, float]]) -> dict[str, Any]:
    """Compute Mean Absolute Error in cm strictly from verified tape/laser pairs."""
    errors = [abs(pred - truth) for pred, truth in pairs if math.isfinite(pred) and math.isfinite(truth)]
    if not errors:
        return {"nPairs": 0, "maeCm": None, "ci": compute_bootstrap_ci([])}
    return {
        "nPairs": len(errors),
        "maeCm": round(statistics.mean(errors), 2),
        "ci": compute_bootstrap_ci(errors),
    }


def compute_sus_score(responses: list[int]) -> float | None:
    """Standard 10-item System Usability Scale (1..5 Likert). Returns None unless 10 valid items provided."""
    if len(responses) != 10 or any(r not in (1, 2, 3, 4, 5) for r in responses):
        return None
    total = 0
    for idx, score in enumerate(responses):
        total += (score - 1) if idx % 2 == 0 else (5 - score)
    return round(total * 2.5, 2)


def build_experiment_summary(
    hazard_records: list[dict[str, Any]] | None = None,
    paired_f1_deltas: list[float] | None = None,
    measurement_pairs_cm: list[tuple[float, float]] | None = None,
    sus_questionnaires: list[list[int]] | None = None,
    data_label: str = "REAL_FIELD_COLLECTION",
) -> dict[str, Any]:
    hazard_records = hazard_records or []
    paired_f1_deltas = paired_f1_deltas or []
    measurement_pairs_cm = measurement_pairs_cm or []
    sus_questionnaires = sus_questionnaires or []

    per_risk = {
        risk_id: compute_confusion_and_metrics([r for r in hazard_records if r.get("riskId") == risk_id])
        for risk_id in RISK_IDS
    }
    sus_scores = [s for q in sus_questionnaires if (s := compute_sus_score(q)) is not None]
    sus_ci = compute_bootstrap_ci(sus_scores)

    has_field_data = len(hazard_records) > 0 or len(sus_scores) > 0 or len(measurement_pairs_cm) > 0
    return {
        "task": "B11",
        "dataLabel": data_label,
        "status": "completed_analysis" if has_field_data else "blocked_awaiting_field_data",
        "sampleCounts": {
            "hazardRecords": len(hazard_records),
            "pairedComparisons": len(paired_f1_deltas),
            "measuredDistancePairs": len(measurement_pairs_cm),
            "participantsWithSus": len(sus_scores),
        },
        "tracks": {
            "1_objectDetection": {
                "note": "Track evaluated independently in B03/B05 scripts; never merged into hazard score.",
                "status": "not_ready_without_locked_test",
            },
            "2_hazardScreening": {
                "overall": compute_confusion_and_metrics(hazard_records),
                "perRisk": per_risk,
                "pairedDifferenceChecklistPlus3DMinusChecklistOnly": compute_bootstrap_ci(paired_f1_deltas),
            },
            "3_measurementMaeCm": compute_mae_cm(measurement_pairs_cm),
            "4_usabilityAndEducationalOutcome": {
                "susMean": sus_ci["mean"],
                "susCi": sus_ci,
                "validSusCount": len(sus_scores),
            },
        },
        "clinicalClaimsGuard": {
            "fallRateReductionProven": False,
            "clinicalDiagnosisSupported": False,
            "note": "Short-term usability/hazard screening tests CANNOT claim clinical fall reduction.",
        },
    }


def main() -> None:
    summary = build_experiment_summary()
    DEFAULT_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    DEFAULT_OUTPUT_PATH.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"status": summary["status"], "sampleCounts": summary["sampleCounts"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
