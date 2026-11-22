"""Decode and audit local images; propose reviews without changing raw files/labels."""
from __future__ import annotations

import argparse
import csv
import html
import json
import re
import warnings
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import quote, urlparse

from PIL import Image, __version__ as pillow_version

from dataset_common import (DEFAULT_RAW, DEFAULT_REVIEW, ROOT, TARGETS, atomic_text,
                            image_path, license_status, load_manifest, load_review,
                            room_counts, sha256_file, utc_now, write_csv, write_json)

warnings.simplefilter("error", Image.DecompressionBombWarning)


def dhash(image):
    gray = image.convert("L").resize((9, 8), Image.Resampling.LANCZOS)
    pixels = list(gray.get_flattened_data())
    value = 0
    for y in range(8):
        for x in range(8):
            value = (value << 1) | (pixels[y * 9 + x] > pixels[y * 9 + x + 1])
    return f"{value:016x}"


def visual_features(image):
    small = image.convert("RGB").resize((128, 128), Image.Resampling.BILINEAR)
    rgb = list(small.get_flattened_data())
    gray = list(small.convert("L").get_flattened_data())
    n = len(gray)
    features = {"white_fraction": sum(v > 235 for v in gray) / n,
                "dark_fraction": sum(v < 65 for v in gray) / n,
                "midtone_fraction": sum(65 <= v <= 235 for v in gray) / n,
                "color_fraction": sum(max(p) - min(p) > 20 for p in rgb) / n}
    features["possible_line_drawing"] = (features["white_fraction"] > .60 and
        .01 < features["dark_fraction"] < .28 and features["midtone_fraction"] < .25 and
        features["color_fraction"] < .03)
    return features


def metadata_reasons(row):
    category = row.get("category_discovered", "").casefold()
    reasons = [f"category_keyword:{key}" for key in ["art", "colonnade", "coach", "ship"] if key in category]
    context = " ".join(row.get(key, "") for key in ["category_discovered", "title", "source_description"]).casefold()
    for key in ["hospital", "abandoned", "exterior corridor", "castle corridor", "tunnel", "railway", "train carriage", "museum", "showflat", "advertisement", "derelict"]:
        if key in context:
            reasons.append(f"non_residential_or_staged_candidate:{key}")
    sensitive = any(key in context for key in ["kamasutra", "kama sutra", "erotic", "pornograph", "sexual", "nude", "nudity", "naked"])
    if sensitive:
        reasons.append("possible_sensitive_content_metadata")
    return reasons, sensitive


def inspect_image(raw, row, min_short_edge):
    reasons, sensitive = metadata_reasons(row)
    result = {"image_id": row["image_id"], "file": row["file"], "room": row["room"],
              "image_ok": False, "integrity_ok": False, "width": None, "height": None,
              "sha256": None, "dhash_64": None, "error": None, "sha256_matches_manifest": False,
              "dhash_matches_manifest": None, "dimensions_match_manifest": None,
              "license_status": license_status(row), "possible_sensitive_content": sensitive,
              "conceal_by_default": sensitive or "art" in row.get("category_discovered", "").casefold(),
              "reasons": reasons}
    path = image_path(raw, row["file"])
    try:
        result["sha256"] = sha256_file(path)
        result["sha256_matches_manifest"] = result["sha256"] == row["sha256"].strip().lower()
        if not result["sha256_matches_manifest"]:
            reasons.append("sha256_mismatch")
        with Image.open(path) as probe:
            probe.verify()
        with Image.open(path) as image:
            image.load()
            result.update(image_ok=True, width=image.width, height=image.height,
                          format=image.format, mode=image.mode, has_exif=bool(image.getexif()),
                          dhash_64=dhash(image), **visual_features(image))
        result["dimensions_match_manifest"] = (str(result["width"]) == row.get("width") and str(result["height"]) == row.get("height"))
        result["integrity_ok"] = result["sha256_matches_manifest"] and result["dimensions_match_manifest"]
        if not result["dimensions_match_manifest"]:
            reasons.append("dimensions_mismatch")
        original_dhash = row["dhash_64"].strip().lower()
        result["dhash_matches_manifest"] = result["dhash_64"] == original_dhash
        if not re.fullmatch(r"[0-9a-f]{16}", original_dhash):
            reasons.append("invalid_manifest_dhash")
        if min(result["width"], result["height"]) < min_short_edge:
            reasons.append("small_image")
        if result["possible_line_drawing"]:
            reasons.append("possible_monochrome_line_drawing")
    except (OSError, ValueError, SyntaxError, Image.DecompressionBombError, Image.DecompressionBombWarning) as error:
        result["error"] = f"{type(error).__name__}: {error}"
        reasons.append("unreadable_or_corrupt_image")
    if result["license_status"] != "metadata_complete":
        reasons.append("license_metadata_needs_review")
    return result


def duplicate_groups(items, field):
    groups = defaultdict(list)
    for item in items:
        if item.get(field):
            groups[item[field]].append(item["image_id"])
    return [group for group in groups.values() if len(group) > 1]


def near_duplicates(items, distance):
    valid = [(row["image_id"], int(row["dhash_64"], 16)) for row in items if row["image_ok"]]
    parents = {key: key for key, _ in valid}

    def find(key):
        while parents[key] != key:
            parents[key] = parents[parents[key]]
            key = parents[key]
        return key

    pairs = []
    for i, (left, a) in enumerate(valid):
        for right, b in valid[i + 1:]:
            hamming = (a ^ b).bit_count()
            if hamming <= distance:
                pairs.append({"left": left, "right": right, "distance": hamming})
                parents[find(right)] = find(left)
    groups = defaultdict(list)
    for key, _ in valid:
        groups[find(key)].append(key)
    return pairs, [group for group in groups.values() if len(group) > 1]


def md(value):
    return html.escape(str(value), quote=False).replace("|", "&#124;").replace("\r", " ").replace("\n", " ")


def link(value):
    url = urlparse(value)
    return f"<{quote(value, safe=':/?&=%#@+~;')}>" if url.scheme in {"http", "https"} else md(value)


def attribution(rows, manifest_hash):
    lines = ["# Attribution — bộ dữ liệu nguồn", "",
             f"Sinh tự động từ manifest gốc, SHA-256 `{manifest_hash}`. Bao gồm mọi ảnh nguồn, không phải bộ cuối đã duyệt.", "",
             "License/author/attribution được giữ nguyên theo manifest; metadata trống được ghi rõ, không tự bổ sung quyền sử dụng.", "",
             "Việc repo dùng MIT không cấp lại giấy phép ảnh. Ảnh CC BY/CC BY-SA cần giữ thông tin nguồn và điều kiện tương ứng; ảnh thiếu bằng chứng quyền sử dụng chưa đủ điều kiện vào bộ cuối.", ""]
    for row in rows:
        lines.extend([f"## {md(row['image_id'])}", "",
            f"- File: {md(row['file'])}", f"- Title: {md(row.get('title', ''))}",
            f"- Source: {link(row.get('source_page', ''))}",
            f"- Original image: {link(row.get('source_image_url', ''))}",
            f"- License: {md(row['license_short'])}",
            f"- License URL: {link(row['license_url']) or '(trống trong manifest; cần xác minh)'}",
            f"- Author: {md(row['author']) or '(trống trong manifest)'}",
            f"- Attribution: {md(row['attribution']) or '(trống trong manifest)'}",
            f"- Metadata gate: {license_status(row)}", ""])
    return "\n".join(lines)


def markdown_table(headers, rows):
    return ["| " + " | ".join(map(md, headers)) + " |", "| " + " | ".join("---" for _ in headers) + " |", *[
        "| " + " | ".join(map(md, row)) + " |" for row in rows]]


def annotation_stats(raw):
    results = {}
    for name in ["risk_annotations_TEMPLATE.csv", "object_annotations_TEMPLATE.csv"]:
        with (raw / name).open(encoding="utf-8-sig", newline="") as stream:
            rows = list(csv.DictReader(stream))
        results[name] = {"rows": len(rows), "review_status": dict(Counter(row.get("review_status", "") for row in rows))}
        if name.startswith("risk"):
            # Blank/unlabeled is unknown, never false.
            results[name]["risk_present_raw"] = dict(Counter(row.get("risk_present", "") for row in rows))
            results[name]["verified_binary_rows"] = sum(row.get("review_status") == "verified" and row.get("risk_present") in {"0", "1"} for row in rows)
    return results


def run_audit(raw, review_dir, report_dir, min_short_edge=384, near_distance=4, attribution_path=None):
    raw, review_dir, report_dir = raw.resolve(), review_dir.resolve(), report_dir.resolve()
    attribution_path = (attribution_path or ROOT / "ATTRIBUTION.md").resolve()
    if any(path.is_relative_to(raw) for path in [review_dir, report_dir, attribution_path]):
        raise ValueError("Audit outputs must stay outside raw")
    fields, rows = load_manifest(raw)
    manifest_hash = sha256_file(raw / "manifest.csv")
    print(f"Audit start: {len(rows)} manifest rows; manifest sha256={manifest_hash}", flush=True)
    items = []
    for index, row in enumerate(rows, 1):
        items.append(inspect_image(raw, row, min_short_edge))
        if index % 100 == 0 or index == len(rows):
            print(f"Decoded {index}/{len(rows)}", flush=True)
    exact = duplicate_groups(items, "sha256")
    manifest_exact = duplicate_groups(rows, "sha256")
    manifest_dhash_groups = duplicate_groups(rows, "dhash_64")
    pairs, near_groups = near_duplicates(items, near_distance)
    duplicate_ids = {key for group in exact + near_groups for key in group}
    for item in items:
        if item["image_id"] in duplicate_ids:
            item["reasons"].append("duplicate_or_near_duplicate_candidate")
        item["suggested_review"] = bool(item["reasons"])
    by_id = {item["image_id"]: item for item in items}
    state = load_review(review_dir, manifest_hash, by_id)
    expected = {image_path(raw, row["file"]) for row in rows}
    unlisted = sorted(str(path.relative_to(raw)) for path in (raw / "images").rglob("*") if path.is_file() and path.resolve() not in expected)
    annotations = annotation_stats(raw)
    stats = {
        "images": len(items), "decoded_ok": sum(item["image_ok"] for item in items),
        "corrupt_or_missing": sum(not item["image_ok"] for item in items),
        "sha256_mismatches": sum(not item["sha256_matches_manifest"] for item in items),
        "dhash_mismatches": sum(item["dhash_matches_manifest"] is False for item in items),
        "dimension_mismatches": sum(item["dimensions_match_manifest"] is False for item in items),
        "small_images": sum("small_image" in item["reasons"] for item in items),
        "possible_line_drawings": sum(item.get("possible_line_drawing", False) for item in items),
        "possible_sensitive_metadata": sum(item["possible_sensitive_content"] for item in items),
        "images_with_exif": sum(item.get("has_exif", False) for item in items),
        "exact_duplicate_groups": len(exact), "near_duplicate_pairs": len(pairs), "near_duplicate_groups": len(near_groups),
        "license_metadata_needs_review": sum(item["license_status"] != "metadata_complete" for item in items),
        "suggested_review": sum(item["suggested_review"] for item in items), "unlisted_files": len(unlisted),
        "width_min": min((item["width"] for item in items if item["image_ok"]), default=None),
        "width_max": max((item["width"] for item in items if item["image_ok"]), default=None),
        "height_min": min((item["height"] for item in items if item["image_ok"]), default=None),
        "height_max": max((item["height"] for item in items if item["image_ok"]), default=None),
    }
    audit = {"manifest_sha256": manifest_hash, "generated_at": utc_now(), "pillow_version": pillow_version,
        "config": {"min_short_edge": min_short_edge, "near_distance": near_distance,
                   "dhash_algorithm": "Pillow L -> LANCZOS 9x8; horizontal left > right; MSB first"},
        "stats": stats, "annotations": annotations, "items": items, "exact_duplicates": exact,
        "manifest_exact_duplicates": manifest_exact, "manifest_dhash_duplicates": manifest_dhash_groups,
        "near_duplicate_pairs": pairs, "near_duplicate_groups": near_groups, "unlisted_files": unlisted,
        "room_counts": room_counts(rows, state, by_id)}
    write_json(review_dir / "audit.json", audit)
    flat = [{**item, "reasons": "; ".join(item["reasons"])} for item in items]
    detail_fields = list(dict.fromkeys(key for item in flat for key in item))
    write_csv(review_dir / "audit_images.csv", detail_fields, flat)
    atomic_text(attribution_path, attribution(rows, manifest_hash))

    lines = ["# Audit dữ liệu — Giai đoạn 1", "", f"Thời điểm UTC: {audit['generated_at']}", "",
        f"Manifest SHA-256: `{manifest_hash}`. Pillow `{pillow_version}`. Cấu hình: cạnh ngắn <{min_short_edge}px, khoảng cách dHash ≤{near_distance}.", "",
        "## Kết quả chạy thật", "", *markdown_table(["Chỉ số audit", "Số lượng"], stats.items()), "",
        "Các số trên là kiểm tra dữ liệu/heuristic, không phải precision/recall. Chất lượng ML: **chưa đánh giá được**.", "",
        "## Phân bố metadata", ""]
    for field in ["room", "category_discovered", "license_short", "dataset_split", "human_scene_verified", "human_risk_verified"]:
        lines.extend([f"### {field}", "", *markdown_table([field, "Số ảnh"], Counter(row.get(field, "") or "(trống/unknown)" for row in rows).most_common()), ""])
    lines.extend(["## Nhãn và duyệt thủ công", "", "```json", json.dumps(annotations, ensure_ascii=False, indent=2), "```", "",
        "Unlabeled/ô trống vẫn là unknown. Không train, không đánh giá và không chia tập ở giai đoạn này.", "",
        "## Thiếu ảnh theo phòng", "",
        *markdown_table(["Phòng", "Mục tiêu", "Chưa duyệt", "Giữ", "Loại", "Cần thay", "Ứng viên đủ metadata", "Thiếu đã xác nhận", "Tối thiểu cần bù do quyết định"],
            [[room, c['target'], c['pending'], c['keep'], c['reject'], c['replace'], c['eligible_candidates'], c['shortfall_confirmed_now'], c['minimum_replacements_after_decisions']] for room, c in audit['room_counts'].items()]), "",
        "Thiếu đã xác nhận = mục tiêu − số ảnh đã Giữ và qua kiểm tra file/hash/license metadata. Khi chưa duyệt hết, đây không phải số ảnh phải thu thập mới. Tối thiểu cần bù do quyết định giả sử mọi ảnh còn chờ đều được giữ; chưa tính các vướng mắc giấy phép.", "",
        *markdown_table(["Phòng", "Đề xuất xem trước", "Ước tính thiếu nếu loại mọi đề xuất"],
            [[room, sum(item['room'] == room and item['suggested_review'] for item in items), max(0, target - sum(item['room'] == room and not item['suggested_review'] for item in items))] for room, target in TARGETS.items()]), "",
        "Bảng ước tính chỉ là kịch bản tiền lọc, chưa có người quyết định loại; nhiều ảnh bị gắn cờ chỉ vì thiếu URL giấy phép.", "",
        "## Trùng và độ toàn vẹn", "",
        f"Trùng SHA-256 tính lại: {len(exact)} nhóm; SHA-256 manifest: {len(manifest_exact)} nhóm; dHash manifest trùng hẳn: {len(manifest_dhash_groups)} nhóm.", "",
        "dHash tính lại dùng công thức được lưu trong audit.json; khác dHash manifest có thể do quy ước resize/so sánh khác nhau, không tự kết luận ảnh đã đổi. SHA-256 là kiểm tra byte gốc. Near-duplicate là ứng viên cần xem, không tự xóa/gộp và chưa phải nhóm split Giai đoạn 2.", "",
        "Chi tiết từng ảnh, lỗi, hash và các cặp gần trùng nằm trong `data/review/audit.json` và `audit_images.csv` (được Git ignore).", "",
        "## Cách tiền lọc và giới hạn", "",
        "- So khớp category chứa art/colonnade/coach/ship; từ khóa ngữ cảnh về bệnh viện, hầm, bỏ hoang, bảo tàng, ngoài trời, nhà mẫu. So khớp chuỗi có thể báo nhầm.",
        "- Ảnh nhỏ: cạnh ngắn dưới ngưỡng cấu hình. Nghi tranh nét đen trắng: nền trắng >60%, vùng tối 1–28%, trung gian <25%, tỷ lệ pixel có chênh màu >20 dưới 3%, tính trên ảnh thu nhỏ 128×128.",
        "- Nghi nhạy cảm chỉ dựa từ khóa metadata; không phải bộ phân loại nội dung. Ảnh art/nghi nhạy cảm được che ban đầu trong UI, người duyệt bấm để xem.",
        "- Chưa dùng Gemini/CLIP; chưa có kết luận tự động về người trong ảnh, cảnh nhà ở hoặc nội dung nhạy cảm từ pixel. Mọi ảnh đều cần con người duyệt.",
        "- License gate chỉ kiểm metadata: tên CC đã biết khớp URL Creative Commons và author; thiếu/không khớp chờ xác minh, không vào ứng viên cuối. Public domain không có URL cũng bị giữ lại để kiểm tra, không tự đoán quyền.",
        "- Metadata complete chưa phải phê duyệt pháp lý. Người duyệt cần kiểm trang nguồn, giấy phép, attribution và quyền riêng tư trước khi phân phối.", "",
        "## Bổ sung dữ liệu", "",
        "Xem `docs/ML_DATA_REVIEW.md`: hướng dẫn chạy UI, xuất working manifest và bổ sung ảnh. Khi thay đổi quyết định, chạy lại audit để cập nhật báo cáo này; UI và shortfalls.json cập nhật ngay khi lưu.", "",
        "Giữ nguyên manifest/ảnh/nhãn raw; không đề xuất xóa file. **Dừng chờ người dùng duyệt cảnh.**", ""])
    atomic_text(report_dir / "audit.md", "\n".join(lines))
    if sha256_file(raw / "manifest.csv") != manifest_hash:
        raise RuntimeError("Raw manifest changed during audit")
    print(json.dumps({"stats": stats, "room_counts": audit["room_counts"], "raw_manifest_unchanged": True}, ensure_ascii=False, indent=2), flush=True)
    return audit


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw", type=Path, default=DEFAULT_RAW)
    parser.add_argument("--review", type=Path, default=DEFAULT_REVIEW)
    parser.add_argument("--reports", type=Path, default=ROOT / "reports")
    parser.add_argument("--attribution", type=Path, default=ROOT / "ATTRIBUTION.md")
    parser.add_argument("--min-short-edge", type=int, default=384)
    parser.add_argument("--near-distance", type=int, choices=range(0, 65), default=4)
    args = parser.parse_args()
    if args.min_short_edge < 1:
        parser.error("--min-short-edge must be positive")
    run_audit(args.raw, args.review, args.reports, args.min_short_edge, args.near_distance, args.attribution)
