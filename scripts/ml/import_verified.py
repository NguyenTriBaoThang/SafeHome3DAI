"""Import only explicitly human-confirmed Label Studio annotations as ground truth."""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

from annotation_contract import label_value
from dataset_common import DEFAULT_RAW, DEFAULT_REVIEW, ROOT, sha256_file, utc_now, write_json
from stage2_common import RISK_IDS, STAGE2, PipelineBlocked, digest, load_frozen

VERIFIED = ROOT / "data/annotations/verified/bundle.json"
CONFIRMATION = "Tôi đã kiểm tra và sửa nhãn; giữ Chưa rõ khi thiếu bằng chứng"
MEASURED_RISKS = {"RISK-003", "RISK-004", "RISK-005", "RISK-007", "RISK-008"}


def one(result, name, kind):
    entries = [entry for entry in result if entry.get("from_name") == name]
    if len(entries) != 1 or entries[0].get("type") != kind or entries[0].get("to_name") != "image":
        raise ValueError(f"Missing or ambiguous annotation field: {name}")
    values = entries[0].get("value", {}).get("choices" if kind == "choices" else "text")
    if not isinstance(values, list) or len(values) != 1 or not isinstance(values[0], str) or not values[0].strip():
        raise ValueError(f"Expected one explicit value: {name}")
    return values[0].strip()


def parse_task(task, row, snapshot_hash, categories, definitions):
    data = task.get("data", {})
    if (data.get("snapshot_sha256") != snapshot_hash or data.get("image_sha256") != row["sha256"] or
            data.get("split") != row["dataset_split"]):
        raise ValueError("Task snapshot/image/split does not match the frozen dataset; re-export tasks")
    source = urlsplit(data.get("image", ""))
    if source.scheme or source.netloc or source.path != "/data/local-files/" or parse_qs(source.query).get("d") != [row["file"]]:
        raise ValueError("Task image path does not match the frozen image")
    annotations = [entry for entry in task.get("annotations", []) if not entry.get("was_cancelled") and not entry.get("skipped")]
    if len(annotations) != 1:
        raise ValueError("Exactly one completed human annotation required; predictions are never ground truth")
    annotation = annotations[0]
    # The optional Label Studio ground_truth marker is not a human review decision.
    if not annotation.get("id") or not annotation.get("created_at") or not annotation.get("updated_at"):
        raise ValueError("Human annotation needs an ID and creation/update timestamps")
    result = annotation.get("result")
    if not isinstance(result, list):
        raise ValueError("Invalid annotation result array")
    reviewer = one(result, "reviewer", "textarea")
    if one(result, "human_review", "choices") != CONFIRMATION:
        raise ValueError("Missing explicit human confirmation")
    labels = {label_value(cat): cat["name"] for cat in categories}
    objects = []
    region_ids = set()
    for entry in result:
        if entry.get("type") != "rectanglelabels":
            continue
        if entry.get("from_name") != "objects" or entry.get("to_name") != "image":
            raise ValueError("Unexpected rectangle field")
        if not entry.get("id") or entry["id"] in region_ids:
            raise ValueError("Object regions need unique IDs")
        region_ids.add(entry["id"])
        if entry.get("original_width") != int(row["width"]) or entry.get("original_height") != int(row["height"]) or entry.get("image_rotation", 0) != 0:
            raise ValueError("Annotation dimensions/rotation do not match the source image")
        value = entry.get("value", {})
        if value.get("rotation", 0) != 0 or value.get("rectanglelabels") not in [[key] for key in labels]:
            raise ValueError("Only nonrotated rectangles with a known class are supported")
        coordinates = [value.get(key) for key in ["x", "y", "width", "height"]]
        if any(type(v) not in {int, float} or not math.isfinite(v) for v in coordinates):
            raise ValueError("Invalid bbox coordinates")
        x, y, w, h = coordinates
        if min(x, y) < 0 or min(w, h) <= 0 or x + w > 100 or y + h > 100:
            raise ValueError("BBox must be inside the image, in 0..100 percent")
        objects.append({"category": labels[value["rectanglelabels"][0]],
                        "bbox": {"xMin": x / 100, "yMin": y / 100, "xMax": (x + w) / 100, "yMax": (y + h) / 100}})
    risks = {}
    by_id = {entry["risk_id"]: entry for entry in definitions}
    for risk_id in RISK_IDS:
        key = risk_id.replace("-", "_")
        choice = one(result, "present_" + key, "choices")
        if choice not in {"Có", "Không", "Chưa rõ", "Không áp dụng"}:
            raise ValueError("Unknown risk choice")
        present = True if choice == "Có" else False if choice == "Không" else "unknown"
        applicable = row["room"] in by_id[risk_id]["registry_rooms"]
        if choice == "Không áp dụng" and applicable or not applicable and present != "unknown":
            raise ValueError("Risk applicability conflicts with registry")
        visible = one(result, "visible_" + key, "choices")
        if visible not in {"Nhìn rõ", "Không nhìn rõ", "Chưa rõ khả năng quan sát"}:
            raise ValueError("Invalid visibility choice")
        severity = one(result, "severity_" + key, "choices")
        if severity not in {"HIGH", "MEDIUM", "LOW", "UNKNOWN"} or present == "unknown" and severity != "UNKNOWN":
            raise ValueError("Invalid or unjustified severity")
        origin = one(result, "evidence_source_" + key, "choices")
        evidence = one(result, "evidence_" + key, "textarea")
        if origin not in {"Chỉ ảnh", "Đo/khảo sát thực tế"}:
            raise ValueError("Invalid evidence source")
        if present != "unknown" and (risk_id in MEASURED_RISKS or visible != "Nhìn rõ") and origin != "Đo/khảo sát thực tế":
            raise ValueError("Binary risk requires actual field evidence when not observable/measurable in the photo")
        risks[risk_id] = {"present": present, "applicable": applicable, "severity": severity,
                          "visible": visible, "evidence_source": origin, "evidence": evidence}
    return {"image_id": row["image_id"], "image_sha256": row["sha256"], "split": row["dataset_split"],
            "group_id": row["group_id"], "review_status": "verified", "objects_verified": True,
            "reviewer": reviewer, "annotation_id": annotation["id"], "reviewed_at": annotation["updated_at"],
            "objects": objects, "risks": risks}


def import_labels(source, output, raw, review, frozen):
    snapshot, rows, categories, definitions = load_frozen(frozen, raw, review)
    if any(output.resolve().is_relative_to(path.resolve()) for path in [raw, review, frozen]) or output.resolve() == source.resolve():
        raise PipelineBlocked("Verified output cannot overwrite raw/review/frozen or the source export")
    tasks = json.loads(source.read_text(encoding="utf-8-sig"))
    if not isinstance(tasks, list) or not tasks:
        raise PipelineBlocked("Expected a nonempty Label Studio JSON task export")
    by_id = {row["image_id"]: row for row in rows}
    records = []
    seen = set()
    for task in tasks:
        key = task.get("data", {}).get("image_id")
        if key not in by_id or key in seen:
            raise PipelineBlocked("Export contains unknown or repeated image IDs")
        seen.add(key)
        records.append(parse_task(task, by_id[key], digest(snapshot), categories, definitions))
    bundle = {"schema_version": 1, "snapshot_sha256": digest(snapshot), "source_export": str(source.resolve()),
              "source_export_sha256": sha256_file(source), "imported_at": utc_now(),
              "verification_source": "label-studio-explicit-human-confirmation", "images": records}
    bundle["content_sha256"] = digest(bundle)
    write_json(output, bundle)
    return bundle


def load_verified(path, snapshot, rows, categories, definitions, splits=None):
    if splits is not None and (not splits or not set(splits) <= {"train", "val", "test"}):
        raise ValueError("Invalid verified-label scope")
    bundle = json.loads(path.read_text(encoding="utf-8"))
    integrity = dict(bundle)
    expected = integrity.pop("content_sha256", None)
    if expected != digest(integrity) or bundle.get("snapshot_sha256") != digest(snapshot):
        raise PipelineBlocked("Verified bundle content/snapshot mismatch")
    source = Path(bundle["source_export"])
    if not source.is_file() or sha256_file(source) != bundle["source_export_sha256"]:
        raise PipelineBlocked("Keep the unchanged original human annotation export for provenance")
    # Re-validate the original human annotations, not just a manually edited verified flag.
    tasks = json.loads(source.read_text(encoding="utf-8-sig"))
    by_id = {row["image_id"]: row for row in rows}
    parsed = []
    seen = set()
    for task in tasks:
        key = task.get("data", {}).get("image_id")
        if key not in by_id or key in seen:
            raise PipelineBlocked("Invalid source task membership")
        seen.add(key)
        if splits is None or by_id[key]["dataset_split"] in splits:
            parsed.append(parse_task(task, by_id[key], digest(snapshot), categories, definitions))
    expected_records = bundle["images"] if splits is None else [record for record in bundle["images"] if record["split"] in splits]
    if parsed != expected_records or not parsed:
        raise PipelineBlocked("Verified records differ from the confirmed human export")
    return {**bundle, "images": parsed}


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, default=VERIFIED)
    parser.add_argument("--raw", type=Path, default=DEFAULT_RAW)
    parser.add_argument("--review", type=Path, default=DEFAULT_REVIEW)
    parser.add_argument("--frozen", type=Path, default=STAGE2 / "frozen")
    args = parser.parse_args()
    try:
        bundle = import_labels(args.source, args.output, args.raw, args.review, args.frozen)
        print(json.dumps({"verified_images": len(bundle["images"]), "content_sha256": bundle["content_sha256"]}))
    except (ValueError, KeyError, OSError, TypeError) as error:
        parser.exit(2, f"Verified import blocked: {error}\n")
