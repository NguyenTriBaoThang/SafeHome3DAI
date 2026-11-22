"""Derived AI-labelled CSVs, visible gallery notices, and winner support/CI tables."""
from __future__ import annotations

import json
import statistics
import copy
from pathlib import Path

from baseline_report import ci, error_gallery, fmt, table
from dataset_common import DEFAULT_RAW, ROOT, atomic_text, write_csv, write_json
from experiment_stage4 import seal, unseal
from explore_stage4 import HOME, REPORTS, candidate_rows


def summarize():
    report = unseal(HOME / "comparison.json")
    if not report.get("test"):
        raise ValueError("Complete locked exploratory test before final summaries")
    objects, risks, operation = [], [], []
    rows = {row['image_id']: row for row in candidate_rows()}
    labels = {split: {row['image_id']: row for row in unseal(HOME / ('references_' + split + '.json'))['images']}
              for split in ['val', 'test']}
    sets = [("val", key, value) for key, value in report["results"].items()] + [("test", report["winner"], report["test"])]
    for split, experiment, result in sets:
        for name, metric in result["metrics"]["detection"]["classes"].items():
            objects.append({"mode": "AI_REFERENCE_NOT_OFFICIAL", "split": split, "experiment": experiment,
                "class": name, "gt_ai_objects": metric["gt_objects"], **{key: metric[key] for key in ["tp", "fp", "fn", "ap50", "precision", "recall"]},
                "ap50_ci95": ci(metric["ci95"]["ap50"]), "positive_images": metric["positive_images"]})
        for key, metric in result["metrics"]["risk"].items():
            risks.append({"mode": "AI_REFERENCE_NOT_OFFICIAL", "split": split, "experiment": experiment,
                "risk": key, **{name: metric[name] for name in ["positive", "negative", "tp", "fp", "tn", "fn", "abstain_positive",
                    "abstain_negative", "excluded_unknown", "excluded_not_applicable", "precision", "recall", "f1", "high_positive", "high_recall"]}})
        records = [unseal(HOME / "cache" / report["config_id"] / experiment / (digest_key(key) + ".json"))
                   for key in result["cache_records_sha256"]]
        examples = []
        for record in records:
            key = record['image_id']
            prediction = copy.deepcopy(record['prediction'])
            prediction['objects'] = [obj for obj in prediction.get('objects', [])
                                     if obj['category'] in report['config']['scored_classes']]
            examples.append({'image_id': key, 'group_id': rows[key]['group_id'], 'row': rows[key],
                             'truth': labels[split][key], 'prediction': prediction})
        atomic_text(REPORTS / split / (experiment + '_errors.html'), error_gallery(examples, DEFAULT_RAW,
            REPORTS / split, result['config']['object_threshold']))
        timings = sorted(row["seconds"] for row in records)
        versions, token_count = set(), 0
        for row in records:
            for trace in row.get("trace", []):
                if trace.get("model_version"):
                    versions.add(trace["model_version"])
                token_count += (trace.get("usage") or {}).get("totalTokenCount", 0)
        operation.append({"split": split, "experiment": experiment, "images": len(records),
            "failures": result["metrics"]["inference_failures"], "gemini_invocations": sum(r["gemini_invocations"] for r in records),
            "detector_invocations": sum(r["detector_invocations"] for r in records), "seconds_p50": statistics.median(timings),
            "seconds_max": max(timings), "provider_reported_tokens_successful_responses": token_count, "model_versions": sorted(versions),
            "note": "Wall time includes preprocessing and cold model load; not a controlled latency benchmark. Failed/unreturned responses can lack usage."})
    write_csv(REPORTS / "object_metrics.csv", list(objects[0]), objects)
    write_csv(REPORTS / "risk_metrics.csv", list(risks[0]), risks)
    write_json(REPORTS / "operations.json", seal({"official_accuracy": False, "runs": operation,
        "preflight": json.loads((ROOT / "data/processed/stage4/readiness/invocations.json").read_text(encoding="utf-8"))}))
    notice = '<aside style="padding:18px;background:#fff2c6;border:2px solid #bd6a00"><strong>NHÃN AI — THĂM DÒ, CHƯA PHẢI ĐỘ CHÍNH XÁC CHÍNH THỨC.</strong> Khung xanh là nhãn tham chiếu AI chưa được con người xác nhận. Lớp mở other không chấm điểm và không xuất hiện trong gallery này.</aside>'
    for path in REPORTS.glob("*/*_errors.html"):
        text = path.read_text(encoding="utf-8")
        if notice not in text:
            text = text.replace('<h1>Ví dụ sai baseline</h1>', notice + '<h1>Ví dụ thăm dò so với nhãn AI</h1>')
            text = text.replace('GT xanh;', 'Tham chiếu AI xanh;')
            atomic_text(path, text)
    lines = ["# Cấu hình được chọn — chỉ so với nhãn AI", "", "**Chưa phải độ chính xác chính thức.** Nhãn và bbox AI có thể sai; không suy ra an toàn thực tế.",
        "Val chọn `" + report["winner"] + "` theo " + report["selection_basis"] + ". Không có HIGH dương tính để đánh giá HIGH recall.", ""]
    for split, result in [("val", report["results"][report["winner"]]), ("test", report["test"])]:
        det = result["metrics"]["detection"]
        lines += ["## " + split, "", "mAP50 so nhãn AI: " + fmt(det["map50"]) + "; CI95 group bootstrap: " + ci(det["map50_ci95"]) + ".",
            "Lớp có đối tượng tham chiếu: " + str(det["classes_with_ground_truth"]) + "; ảnh: " + str(result["metrics"]["images"]) + ".", ""]
        lines += table(["Lớp", "Số đối tượng AI", "AP50 AI", "P", "R", "CI95 AP50"],
            [[name, m["gt_objects"], fmt(m["ap50"]), fmt(m["precision"]), fmt(m["recall"]), ci(m["ci95"]["ap50"])]
             for name, m in det["classes"].items()])
        lines += ["", "Lớp không có đối tượng tham chiếu giữ AP=null, không đổi thành 0. Mẫu quá nhỏ nên CI/bootstrap không chứng minh độ tổng quát.", ""]
    atomic_text(REPORTS / "winner_details.md", "\n".join(lines))
    print("AI-labelled summaries and gallery notices saved")


def digest_key(value):
    from stage2_common import digest
    return digest(value)


if __name__ == "__main__":
    summarize()
