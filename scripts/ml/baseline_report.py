"""Reports and local SVG error overlays; raw photographs are referenced, never rewritten."""
import html
import json
import os
from pathlib import Path
from urllib.parse import quote

from baseline_metrics import iou
from dataset_common import atomic_text, image_path, write_csv, write_json
from stage2_common import RISK_IDS


def fmt(value):
    return "chưa đánh giá được" if value is None else f"{value:.4f}"


def ci(value):
    return "—" if not value else f"[{value['lower']:.4f}, {value['upper']:.4f}] (B={value['valid_replicates']})"


def table(headers, rows):
    def escape(value):
        return str(value).replace("|", "/").replace("\n", " ")
    return ["| " + " | ".join(map(escape, headers)) + " |", "| " + " | ".join("---" for _ in headers) + " |", *[
        "| " + " | ".join(map(escape, row)) + " |" for row in rows]]


def error_gallery(examples, raw, directory, threshold):
    cards = []
    # Prioritize missed HIGH risks; never invent a wrong example when no evaluation ran.
    selected = []
    for example in examples:
        reasons = []
        for key in RISK_IDS:
            truth = example["truth"]["risks"][key]
            prediction = example["prediction"].get("risks", {}).get(key, {}).get("present", "unknown")
            if truth["applicable"] and truth["present"] != "unknown" and truth["present"] != prediction:
                reasons.append(f"{key}: GT={truth['present']}; prediction={prediction}; severity={truth['severity']}")
        actual = example["truth"]["objects"]
        predicted = [obj for obj in example["prediction"].get("objects", []) if obj["confidence"] >= threshold]
        used = set()
        object_errors = 0
        for obj in sorted(predicted, key=lambda obj: obj["confidence"], reverse=True):
            candidates = [(iou(obj["bbox"], gt["bbox"]), index) for index, gt in enumerate(actual) if index not in used and gt["category"] == obj["category"]]
            overlap, index = max(candidates, default=(0, None))
            if overlap >= .5 and index is not None:
                used.add(index)
            else:
                object_errors += 1
        object_errors += len(actual) - len(used)
        if object_errors:
            reasons.append(f"Object FP/FN at IoU=.5: {object_errors}")
        if example["prediction"].get("status") != "success":
            reasons.append("Inference failed: no AI output; not an empty ground-truth image")
        if reasons:
            high_missed = any(risk["present"] is True and risk["severity"] == "HIGH" and
                              example["prediction"].get("risks", {}).get(key, {}).get("present") is not True for key, risk in example["truth"]["risks"].items())
            selected.append((not high_missed, example, reasons))
    selected.sort(key=lambda item: (item[0], item[1]["image_id"]))
    for _, example, reasons in selected[:30]:
        row = example["row"]
        url = quote(os.path.relpath(image_path(raw, row["file"]), directory).replace("\\", "/"), safe="/")
        w, h = int(row["width"]), int(row["height"])
        elements = [f'<image href="{html.escape(url, quote=True)}" width="{w}" height="{h}"/>']
        for color, objects in [("#32d484", example["truth"]["objects"]), ("#ff6868", example["prediction"].get("objects", []))]:
            for obj in objects:
                box = obj["bbox"]
                title = html.escape(obj["category"] + (f" {obj['confidence']:.3f}" if "confidence" in obj else " GT"))
                elements.append(f'<rect x="{box["xMin"]*w}" y="{box["yMin"]*h}" width="{(box["xMax"]-box["xMin"])*w}" height="{(box["yMax"]-box["yMin"])*h}" fill="none" stroke="{color}" stroke-width="3"><title>{title}</title></rect>')
        details = json.dumps({"ground_truth": example["truth"]["risks"], "prediction": example["prediction"].get("risks", {})}, ensure_ascii=False, indent=2)
        cards.append(f'<article><h2>{html.escape(example["image_id"])} · {html.escape(row["dataset_split"])}</h2><svg viewBox="0 0 {w} {h}">{"".join(elements)}</svg><p>GT xanh; dự đoán đỏ. Di chuột vào khung để xem lớp.</p><ul>{"".join("<li>"+html.escape(reason)+"</li>" for reason in reasons)}</ul><details><summary>Nhãn và dự đoán từng nguy cơ</summary><pre>{html.escape(details)}</pre></details></article>')
    return '<!doctype html><html lang="vi"><meta charset="utf-8"><title>Baseline error examples</title><style>body{font:16px system-ui;max-width:1100px;margin:30px auto;padding:12px;background:#eef3f2;color:#173b34}article{background:white;padding:20px;margin:20px 0;border-radius:12px}svg{max-width:100%;max-height:650px}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style><h1>Ví dụ sai baseline</h1>' + ("".join(cards) or '<p>Chưa có ví dụ sai được xác nhận. Nếu baseline chưa chạy: chưa đánh giá được; không có ảnh minh họa giả.</p>') + '</html>'


def write_report(report, examples, raw, directory, threshold=.5):
    directory.mkdir(parents=True, exist_ok=True)
    write_json(directory / "baseline.json", report)
    lines = ["# Baseline Gemini hiện tại — Giai đoạn 3", "", f"Trạng thái: **{report['status']}**. UTC: {report['generated_at']}.", ""]
    if report.get("blockers"):
        lines.extend(["**Chưa đánh giá được.** Không chạy inference và không tạo metric giả.", "", *["- " + item for item in report["blockers"]], ""])
    lines.extend(["## Phương pháp", "",
        "Dùng đúng Gemini room adapter và hàm risk của UI đã tách ra để dùng chung; không dùng pipeline tiền gán Giai đoạn 2 làm baseline. Không nhận dữ liệu mẫu/fallback là inference thật. Hallway chưa được hàm risk UI hỗ trợ: dự đoán risk unknown.", "",
        "AP50 dùng IoU 0.5, 101 điểm nội suy recall, maxDets=100 mỗi ảnh/lớp, all-area không crowd/ignore. mAP chỉ trung bình các lớp có GT dương, ghi rõ số lớp. Precision/recall object tại ngưỡng confidence đã ghi trong cấu hình. Đây là triển khai bbox chuẩn hóa theo quy ước, không phải chạy toàn bộ COCO API.", "",
        "Risk chỉ tính GT verified 1/0 và applicable=true. GT unknown/nonapplicable loại khỏi mẫu số. Dự đoán unknown/lỗi là abstention, không phải nhãn 0: precision chỉ tính dự đoán dương, recall tính trên toàn bộ GT dương (abstain dương là bỏ sót), F1=2TP/(2TP+FP+FN+abstain_dương). Coverage và confusion tách abstention dương/âm. Inference lỗi không tạo GT âm; object GT vẫn là đối tượng bị bỏ sót khi không có prediction.", "",
        "CI 95% percentile bootstrap theo nhóm nguồn/nhà; lưu seed, số vòng và số replicate hợp lệ. Không đủ hai nhóm thì CI unavailable. Lớp <20 mẫu dương có cảnh báo. CI của replicate không xác định không được thay bằng 0.", ""])
    confusion = []
    for split, result in report.get("splits", {}).items():
        det = result["detection"]
        lines.extend([f"## {split}", "", f"Ảnh: {result['images']}; nhóm: {result['groups']}; lỗi inference: {result['inference_failures']}.", "",
            f"mAP@0.5: **{fmt(det['map50'])}**; CI95 {ci(det['map50_ci95'])}; lớp có GT dương: {det['classes_with_ground_truth']}.", "",
            *table(["Lớp", "GT objects", "AP50 [CI95]", "Precision [CI95]", "Recall [CI95]", "Cảnh báo"],
                [[name, value['gt_objects'], fmt(value['ap50'])+' '+ci(value['ci95']['ap50']), fmt(value['precision'])+' '+ci(value['ci95']['precision']), fmt(value['recall'])+' '+ci(value['ci95']['recall']), value['warning'] or ''] for name, value in det['classes'].items()]), "",
            *table(["Risk", "Dương/âm", "Precision [CI95]", "Recall [CI95]", "F1 [CI95]", "Coverage", "HIGH recall", "Cảnh báo"],
                [[key, f"{value['positive']}/{value['negative']}", fmt(value['precision'])+' '+ci(value['ci95']['precision']), fmt(value['recall'])+' '+ci(value['ci95']['recall']), fmt(value['f1'])+' '+ci(value['ci95']['f1']), fmt(value['prediction_coverage']), fmt(value['high_recall']), value['warning'] or ''] for key, value in result['risk'].items()]), ""])
        confusion.extend({"split": split, "risk_id": key, **{field: value[field] for field in ["tp", "fp", "tn", "fn", "abstain_positive", "abstain_negative", "excluded_unknown", "excluded_not_applicable"]}} for key, value in result["risk"].items())
    lines.extend(["## Kết luận và giới hạn", "",
        "Chưa có metric hợp lệ thì chưa kết luận Gemini yếu ở nguy cơ nào. Sau khi có dữ liệu, đọc recall/HIGH recall cùng số mẫu/CI và xem baseline_errors.html; không dùng test để chỉnh prompt/hyperparameter.", "",
        "Giới hạn từ code: confidence adapter bị clamp 0.5–0.99; UI dùng giá trị mặc định cho nhiều thuộc tính và normalization có thể bỏ qua một số trường nested. Luật có thể cho kết luận định lượng không được ảnh chứng minh. Đây là đặc tính baseline cần phơi bày, chưa chỉnh ngưỡng/logic để nâng điểm. RISK-003/004/005/007/008 cần đo/khảo sát ngoài ảnh đơn để có GT binary; unknown là kết quả hợp lệ.", "",
        "Confusion chi tiết: baseline_confusion.csv; ví dụ ảnh/GT/prediction: baseline_errors.html (tham chiếu ảnh local, không copy/commit ảnh). Cấu hình và số vòng bootstrap trong baseline.json. Nếu có lỗi inference, báo cáo trạng thái incomplete, không loại ảnh lỗi để làm đẹp metric.", "",
        "**Dừng Giai đoạn 3; không train hoặc tự chuyển Giai đoạn 4.**", ""])
    atomic_text(directory / "baseline.md", "\n".join(lines))
    fields = ["split", "risk_id", "tp", "fp", "tn", "fn", "abstain_positive", "abstain_negative", "excluded_unknown", "excluded_not_applicable"]
    write_csv(directory / "baseline_confusion.csv", fields, confusion)
    atomic_text(directory / "baseline_errors.html", error_gallery(examples, raw, directory, threshold))
