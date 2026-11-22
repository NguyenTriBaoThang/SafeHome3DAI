"""Prepare visual review sheets and export explicitly recorded AI scene proposals.

Never writes human decisions, raw labels, frozen splits or benchmark ground truth.
"""
from __future__ import annotations

import argparse
import json
import math
from collections import Counter
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

from dataset_common import (DEFAULT_RAW, DEFAULT_REVIEW, ROOT, atomic_text, image_path,
                            license_status, load_manifest, load_review, sha256_file, utc_now, write_csv, write_json)

OUT = DEFAULT_REVIEW / "ai_scene"
REASONS = {"matching_residential_scene", "art_or_diagram", "outdoor", "transport", "institutional",
           "museum_or_historic_display", "commercial_or_hotel", "wrong_room", "room_uncertain",
           "non_room_closeup", "insufficient_view", "sensitive_content", "people_present", "low_quality", "source_context_review"}
OBJECTS = {"bed", "chair", "table", "cabinet", "nightstand", "door", "toilet", "sink", "bathtub",
           "sofa", "rug", "electrical_cable", "grab_bar", "obstacle_route", "threshold_step", "other", "lamp", "light_switch"}


def font(size):
    for path in [Path("C:/Windows/Fonts/arial.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")]:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default(size=size)


def prepare(raw=DEFAULT_RAW, output=OUT):
    if output.resolve().is_relative_to(raw.resolve()):
        raise ValueError("AI review outputs must stay outside raw")
    _, rows = load_manifest(raw)
    sheets = []
    for start in range(0, len(rows), 20):
        members = rows[start:start + 20]
        key = f"sheet_{start // 20 + 1:02}"
        canvas = Image.new("RGB", (1680, math.ceil(len(members) / 4) * 340), "#edf1f3")
        draw = ImageDraw.Draw(canvas)
        for offset, row in enumerate(members):
            path = image_path(raw, row["file"])
            if sha256_file(path) != row["sha256"]:
                raise ValueError("Image checksum changed: " + row["image_id"])
            left, top = offset % 4 * 420, offset // 4 * 340
            with Image.open(path) as source:
                thumb = ImageOps.contain(source.convert("RGB"), (410, 270))
            canvas.paste(thumb, (left + (420 - thumb.width) // 2, top + 28 + (270 - thumb.height) // 2))
            draw.text((left + 7, top + 4), row["image_id"] + " | " + row["room"], fill="#12272e", font=font(18))
            draw.text((left + 7, top + 301), row["title"][:47], fill="#12272e", font=font(13))
            draw.text((left + 7, top + 319), row["category_discovered"][:53], fill="#36505b", font=font(12))
        target = output / "sheets" / (key + ".jpg")
        target.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(target, quality=92)
        sheets.append({"sheet_id": key, "file": str(target.resolve()), "image_ids": [row["image_id"] for row in members],
                       "sha256": sha256_file(target)})
    index = {"manifest_sha256": sha256_file(raw / "manifest.csv"), "created_at": utc_now(), "images": len(rows),
             "method": "AI assistant visually inspects contact sheets; uncertain examples can be reopened at original resolution",
             "sheets": sheets}
    write_json(output / "sheet_index.json", index)
    print(json.dumps({"images": len(rows), "sheets": len(sheets), "output": str(output)}))


def finalize(raw=DEFAULT_RAW, output=OUT):
    if output.resolve().is_relative_to(raw.resolve()):
        raise ValueError("AI review outputs must stay outside raw")
    _, rows = load_manifest(raw)
    index = json.loads((output / "sheet_index.json").read_text(encoding="utf-8"))
    if index["manifest_sha256"] != sha256_file(raw / "manifest.csv"):
        raise ValueError("Manifest changed after review preparation")
    by_id = {row["image_id"]: row for row in rows}
    human_state = load_review(output.parent, index["manifest_sha256"], by_id)
    qa_path = output / "qa_amendments.json"
    qa = json.loads(qa_path.read_text(encoding="utf-8")) if qa_path.exists() else {"amendments": {}, "original_resolution_rechecks": []}
    if (set(qa["amendments"]) | set(qa["original_resolution_rechecks"])) - set(by_id):
        raise ValueError("QA refers to unknown images")
    records, seen = [], set()
    for sheet in index["sheets"]:
        if sha256_file(Path(sheet["file"])) != sheet["sha256"]:
            raise ValueError("Review sheet changed")
        path = output / "observations" / (sheet["sheet_id"] + ".json")
        entries = json.loads(path.read_text(encoding="utf-8"))
        if {entry["image_id"] for entry in entries} != set(sheet["image_ids"]) or len(entries) != len(sheet["image_ids"]):
            raise ValueError("Missing or duplicate explicit observations in " + sheet["sheet_id"])
        for entry in entries:
            key = entry["image_id"]
            entry = {**entry, **qa["amendments"].get(key, {})}
            if entry["image_id"] != key:
                raise ValueError("QA cannot change image identity")
            if key in seen or key not in by_id:
                raise ValueError("Unknown or repeated image")
            seen.add(key)
            row = by_id[key]
            human = human_state["decisions"].get(key, {})
            conflict = (human.get("decision") == "keep" and entry["decision"] == "reject" or
                        human.get("decision") in {"reject", "replace"} and entry["decision"] == "keep")
            if entry.get("decision") not in {"keep", "reject", "needs_review"}:
                raise ValueError("Invalid AI proposal")
            if entry.get("observed_room") not in {"bedroom", "bathroom", "hallway", "other", "uncertain"}:
                raise ValueError("Invalid observed room")
            if entry.get("people") not in {True, False, "unknown"}:
                raise ValueError("Invalid people observation")
            if not entry.get("reason_codes") or not set(entry["reason_codes"]) <= REASONS or not set(entry.get("objects", [])) <= OBJECTS:
                raise ValueError("Invalid review reason/object tags")
            if not isinstance(entry.get("note"), str) or len(entry["note"].strip()) < 12:
                raise ValueError("Each image needs a concrete visual observation")
            if entry["decision"] == "keep" and (entry["observed_room"] != row["room"] or "matching_residential_scene" not in entry["reason_codes"]):
                raise ValueError("Keep requires matching visible residential scene")
            image = image_path(raw, row["file"])
            if sha256_file(image) != row["sha256"]:
                raise ValueError("Image changed after visual review")
            records.append({**entry, "sheet_id": sheet["sheet_id"], "room": row["room"], "file": row["file"],
                "image_sha256": row["sha256"], "review_source": "AI_visual_review", "reviewer": "Codex",
                "original_resolution_rechecked": key in qa["original_resolution_rechecks"],
                "human_decision": human.get("decision", ""), "human_ai_conflict": conflict,
                "review_status": "ai_reviewed_proposal", "ai_scene_reviewed": True,
                "license_status": license_status(row), "source_page": row["source_page"],
                "license_short": row["license_short"], "license_url": row["license_url"], "author": row["author"]})
    if seen != set(by_id):
        raise ValueError("The entire manifest must have explicit visual observations")
    order = {row["image_id"]: i for i, row in enumerate(rows)}
    records.sort(key=lambda item: order[item["image_id"]])
    report = {"created_at": utc_now(), "manifest_sha256": index["manifest_sha256"], "review_source": "AI_visual_review",
        "images_reviewed": len(records), "decisions": dict(Counter(row["decision"] for row in records)),
        "rooms": {}, "license_holds": sum(row["license_status"] != "metadata_complete" for row in records),
        "not_human_verified": True, "bbox_annotations_created": 0, "risk_ground_truth_created": 0,
        "method": "All 500 images visually inspected in 25 labeled contact sheets, with metadata context; 12 selected images reopened at original resolution",
        "original_resolution_rechecks": len(qa["original_resolution_rechecks"]),
        "human_review_revision_seen": human_state["revision"],
        "human_ai_conflicts": [row["image_id"] for row in records if row["human_ai_conflict"]],
        "context_limit": "Source context follows provided metadata and visible cues; external source pages were not independently verified",
        "review_scope": "Scene suitability, room match, visible object tags and visual concerns; no exhaustive bbox/risk annotations",
        "images": records}
    for room in ["bedroom", "bathroom", "hallway"]:
        subset = [record for record in records if record["room"] == room]
        report["rooms"][room] = {"total": len(subset), **dict(Counter(row["decision"] for row in subset)),
            "keep_with_complete_license_metadata": sum(row["decision"] == "keep" and row["license_status"] == "metadata_complete" for row in subset)}
    write_json(output / "review.json", report)
    fields = ["image_id", "room", "decision", "observed_room", "people", "reason_codes", "objects", "note", "license_status", "review_status", "review_source", "human_decision", "human_ai_conflict", "original_resolution_rechecked", "image_sha256", "sheet_id", "source_page", "license_short", "license_url", "author"]
    write_csv(output / "review.csv", fields, [{key: "|".join(record[key]) if isinstance(record[key], list) else record[key] for key in fields} for record in records])
    write_csv(output / "needs_attention.csv", fields, [{key: "|".join(record[key]) if isinstance(record[key], list) else record[key] for key in fields}
        for record in records if record["decision"] != "keep" or record["license_status"] != "metadata_complete"])
    for name, chosen in [
        ("keep_candidates.csv", [row for row in records if row["decision"] == "keep" and row["license_status"] == "metadata_complete"]),
        ("uncertain.csv", [row for row in records if row["decision"] == "needs_review"]),
        ("rejected.csv", [row for row in records if row["decision"] == "reject"]),
        ("human_ai_conflicts.csv", [row for row in records if row["human_ai_conflict"]]),
    ]:
        write_csv(output / name, fields, [{key: "|".join(record[key]) if isinstance(record[key], list) else record[key] for key in fields} for record in chosen])
    gallery(report, raw, output)
    summary = {key: value for key, value in report.items() if key != "images"}
    write_json(ROOT / "reports/ai_scene_review.json", summary)
    lines = ["# Duyệt toàn bộ ảnh bằng AI", "", f"Đã xem {len(records)} ảnh, ghi nhận xét riêng cho từng ảnh.", "",
        "Kết quả là đề xuất AI, chưa phải human verification hoặc ground truth để chấm model.", "",
        "Đã xem toàn bộ ảnh qua 25 contact sheets có ID và tiêu đề; mở lại 12 ảnh chọn lọc ở độ phân giải gốc. Bối cảnh dùng metadata cung cấp, chưa xác minh độc lập các trang nguồn.", "",
        "| Phòng | Tổng | Giữ | Loại | Cần xem kỹ | Giữ + metadata license đầy đủ |", "| --- | --- | --- | --- | --- | --- |"]
    for room, counts in report["rooms"].items():
        lines.append(f"| {room} | {counts['total']} | {counts.get('keep', 0)} | {counts.get('reject', 0)} | {counts.get('needs_review', 0)} | {counts['keep_with_complete_license_metadata']} |")
    lines += ["", f"Có {report['license_holds']} ảnh cần kiểm tra metadata giấy phép, bất kể phù hợp scene hay không.", "",
        "Chi tiết 500 ảnh: data/review/ai_scene/review.csv và review.json. Gallery có bộ lọc: data/review/ai_scene/gallery.html.",
        "Cần chú ý: data/review/ai_scene/needs_attention.csv. Ảnh gốc và decisions.json của con người không bị sửa.",
        "Danh sách tách riêng: keep_candidates.csv (giữ + metadata license đủ), uncertain.csv (chưa chắc), rejected.csv (đề xuất loại).",
        "Bất đồng với quyết định thủ công có sẵn: " + (", ".join(report["human_ai_conflicts"]) or "không có") + ". Giữ nguyên decisions.json; xem human_ai_conflicts.csv.",
        "Chưa gán bbox hoặc nhãn 1/0 cho tám nguy cơ. Object tags chỉ ghi vật thể nhìn rõ, không đầy đủ; không thấy vật thể không phải nhãn âm.",
        "Nội dung ảnh được xem như dữ liệu, không phải chỉ dẫn. Ảnh nhạy cảm được che trong gallery cho đến khi chủ động mở.", ""]
    atomic_text(ROOT / "reports/ai_scene_review.md", "\n".join(lines))
    print(json.dumps(summary, ensure_ascii=False, indent=2))


def gallery(report, raw, output):
    import os
    from urllib.parse import quote
    items = [{**record, "image_url": quote(os.path.relpath(image_path(raw, record["file"]), output).replace("\\", "/"), safe="/")}
             for record in report["images"]]
    payload = json.dumps(items, ensure_ascii=False).replace("<", "\\u003c")
    page = '''<!doctype html><html lang="vi"><meta charset="utf-8"><title>Duyệt ảnh AI</title>
<style>body{font:16px system-ui;background:#eef2f4;color:#18323b;margin:24px}header{position:sticky;top:0;background:#eef2f4;padding:12px;z-index:1}select,input{font:inherit;padding:7px;margin:4px}#grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:14px}article{background:white;padding:16px;border-radius:12px}img{width:100%;height:240px;object-fit:contain}h2{font-size:17px}p{overflow-wrap:anywhere}.keep{border-top:5px solid #24835a}.reject{border-top:5px solid #b74449}.needs_review{border-top:5px solid #b68123}</style>
<header><h1>Kết quả duyệt AI · 500 ảnh</h1><p>Đề xuất AI, chưa phải xác nhận của con người. Object tags không đầy đủ; chưa có bbox/ground truth risk.</p>
<select id="room"><option value="all">Mọi phòng</option><option>bedroom</option><option>bathroom</option><option>hallway</option></select>
<select id="decision"><option value="all">Mọi đề xuất</option><option value="keep">Giữ</option><option value="reject">Loại</option><option value="needs_review">Cần xem kỹ</option></select>
<select id="license"><option value="all">Mọi giấy phép</option><option value="hold">Cần kiểm tra giấy phép</option><option value="ready">Metadata đầy đủ</option></select><input id="search" placeholder="Tìm ID hoặc nhận xét"><strong id="count"></strong></header><main id="grid"></main>
<script id="data" type="application/json">PAYLOAD</script><script>
const items=JSON.parse(document.getElementById('data').textContent),$=id=>document.getElementById(id);
function render(){const rows=items.filter(x=>($('room').value==='all'||x.room===$('room').value)&&($('decision').value==='all'||x.decision===$('decision').value)&&($('license').value==='all'||($('license').value==='hold')===(x.license_status!=='metadata_complete'))&&(x.image_id+' '+x.note+' '+x.reason_codes.join(' ')).toLowerCase().includes($('search').value.toLowerCase()));$('count').textContent=rows.length+' ảnh';$('grid').replaceChildren();for(const x of rows){const card=document.createElement('article');card.className=x.decision;const title=document.createElement('h2');title.textContent=x.image_id+' · '+({keep:'Giữ',reject:'Loại',needs_review:'Cần xem kỹ'}[x.decision]);card.append(title);const show=()=>{const a=document.createElement('a');a.href=x.image_url;a.target='_blank';a.rel='noopener';const img=document.createElement('img');img.src=x.image_url;img.loading='lazy';img.alt=x.image_id;a.append(img);card.append(a)};if(x.reason_codes.includes('sensitive_content')){const b=document.createElement('button');b.textContent='Mở ảnh có nội dung nhạy cảm';b.onclick=()=>{b.remove();show()};card.append(b)}else show();for(const text of [x.note,'Vật thể nhìn thấy: '+(x.objects.join(', ')||'chưa ghi nhận'),'License: '+x.license_status,'Cảnh quan sát: '+x.observed_room]){const p=document.createElement('p');p.textContent=text;card.append(p)}$('grid').append(card)}}
for(const id of ['room','decision','license','search'])$(id).addEventListener('input',render);render();</script></html>'''
    atomic_text(output / "gallery.html", page.replace("PAYLOAD", payload))


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["prepare", "finalize"])
    parser.add_argument("--raw", type=Path, default=DEFAULT_RAW)
    parser.add_argument("--output", type=Path, default=OUT)
    args = parser.parse_args()
    (prepare if args.action == "prepare" else finalize)(args.raw, args.output)
