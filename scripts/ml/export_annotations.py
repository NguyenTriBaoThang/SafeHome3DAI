"""Export COCO prelabels and Vietnamese Label Studio tasks without promoting them to verified."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from urllib.parse import quote

from annotation_contract import PRESENT_CHOICES, label_studio_xml, label_value
from dataset_common import DEFAULT_RAW, DEFAULT_REVIEW, atomic_text, write_csv, write_json
from prelabel_dataset import check_cached
from stage2_common import RISK_IDS, SPLITS, STAGE2, PipelineBlocked, digest, load_frozen


def ls_result(row, record, categories):
    labels = {entry["name"]: label_value(entry) for entry in categories}
    result = []
    for index, obj in enumerate(record["payload"]["objects"]):
        box = obj["bbox"]
        result.append({"id": "box_" + str(index), "from_name": "objects", "to_name": "image", "type": "rectanglelabels",
            "original_width": int(row["width"]), "original_height": int(row["height"]), "image_rotation": 0,
            "value": {"x": 100 * box["xMin"], "y": 100 * box["yMin"],
                "width": 100 * (box["xMax"] - box["xMin"]), "height": 100 * (box["yMax"] - box["yMin"]),
                "rotation": 0, "rectanglelabels": [labels[obj["category"]]]}})
    for risk_id, risk in record["payload"]["risks"].items():
        key = risk_id.replace("-", "_")
        present = "not_applicable" if not risk["applicable"] else "true" if risk["present"] is True else "false" if risk["present"] is False else "unknown"
        visible = "Nhìn rõ" if risk["visible"] is True else "Không nhìn rõ" if risk["visible"] is False else "Chưa rõ khả năng quan sát"
        for prefix, value in [("present", PRESENT_CHOICES[present]), ("visible", visible), ("severity", risk["severity"])]:
            result.append({"from_name": f"{prefix}_{key}", "to_name": "image", "type": "choices", "value": {"choices": [value]}})
        result.append({"from_name": f"evidence_{key}", "to_name": "image", "type": "textarea", "value": {"text": [risk["evidence"]]}})
        result.append({"from_name": f"evidence_source_{key}", "to_name": "image", "type": "choices", "value": {"choices": ["Chỉ ảnh"]}})
    # Never predict reviewer/human_review; submitting requires a real person to fill them.
    return result


def export(raw, review, frozen, output, run=None, blind_test=True):
    snapshot, rows, categories, definitions = load_frozen(frozen, raw, review)
    output = output.resolve()
    protected = [raw, review, frozen] + ([run] if run is not None else [])
    if any(output.is_relative_to(path.resolve()) for path in protected):
        raise PipelineBlocked("Export output must be separate from source/snapshot/prelabels")
    run_id = None
    if run is not None:
        settings = json.loads((run / "run_config.json").read_text(encoding="utf-8"))
        if settings["snapshot_sha256"] != digest(snapshot):
            raise PipelineBlocked("Prelabels were generated for another frozen snapshot")
        run_id = digest(settings)
    by_category = {entry["name"]: entry["id"] for entry in categories}
    by_definition = {entry["risk_id"]: entry for entry in definitions}
    image_ids = {row["image_id"]: i for i, row in enumerate(sorted(rows, key=lambda row: row["image_id"]), 1)}
    stats = {}
    all_risks = []
    for split in SPLITS:
        tasks, images, annotations = [], [], []
        split_rows = [row for row in rows if row["dataset_split"] == split]
        for row in split_rows:
            key = row["image_id"]
            record_path = run / (digest(key) + ".json") if run is not None else None
            record = None
            if record_path is not None and record_path.exists() and not (split == "test" and blind_test):
                record = json.loads(record_path.read_text(encoding="utf-8"))
                check_cached(record, row, run_id, categories, definitions)
            task = {"data": {"image": "/data/local-files/?d=" + quote(row["file"], safe="/"), "image_id": key,
                "snapshot_sha256": digest(snapshot), "image_sha256": row["sha256"],
                "split": split, "review_status": "prelabeled" if record else "unlabeled",
                "source_page": row.get("source_page", ""), "license_short": row["license_short"],
                "license_url": row["license_url"], "author": row["author"], "attribution": row["attribution"]}, "predictions": []}
            if record:
                task["predictions"] = [{"model_version": run_id, "result": ls_result(row, record, categories)}]
                image_id = image_ids[key]
                images.append({"id": image_id, "file_name": row["file"], "width": int(row["width"]), "height": int(row["height"]),
                    "image_id": key, "license": image_id, "review_status": "prelabeled", "object_ground_truth_verified": False,
                    "source_page": row.get("source_page", ""), "source_image_url": row.get("source_image_url", ""),
                    "author": row["author"], "attribution": row["attribution"]})
                for obj in record["payload"]["objects"]:
                    box = obj["bbox"]
                    w, h = int(row["width"]), int(row["height"])
                    bbox = [box["xMin"] * w, box["yMin"] * h, (box["xMax"] - box["xMin"]) * w, (box["yMax"] - box["yMin"]) * h]
                    annotations.append({"id": len(annotations) + 1, "image_id": image_id, "category_id": by_category[obj["category"]],
                        "bbox": bbox, "area": bbox[2] * bbox[3], "iscrowd": 0,
                        "attributes": {"review_status": "prelabeled", "confidence": obj["confidence"], "evidence": obj["evidence"]}})
            for risk_id in RISK_IDS:
                risk = record["payload"]["risks"][risk_id] if record else None
                present = "1" if risk and risk["present"] is True else "0" if risk and risk["present"] is False else "unknown"
                all_risks.append({"image_id": key, "dataset_split": split, "risk_id": risk_id, "risk_present": present,
                    "visible": str(risk["visible"]).lower() if risk else "unknown",
                    "applicable": str(risk["applicable"] if risk else row["room"] in by_definition[risk_id]["registry_rooms"]).lower(),
                    "severity": risk["severity"] if risk else "UNKNOWN", "evidence": risk["evidence"] if risk else "Chưa có tiền gán; cần người gán nhãn độc lập",
                    "reviewer": "", "review_status": "prelabeled" if risk else "unlabeled", "run_id": run_id if risk else ""})
            tasks.append(task)
        licenses = [{"id": image_ids[row["image_id"]], "name": row["license_short"], "url": row["license_url"]} for row in split_rows if any(image["image_id"] == row["image_id"] for image in images)]
        coco = {"info": {"description": "UNVERIFIED PRELABELS — not evaluation ground truth", "review_status": "prelabeled", "snapshot_sha256": digest(snapshot)},
                "images": images, "annotations": annotations, "categories": [{"id": cat["id"], "name": cat["name"], "supercategory": "home"} for cat in categories], "licenses": licenses}
        write_json(output / f"coco_prelabels_{split}.json", coco)
        write_json(output / f"label_studio_{split}.json", tasks)
        stats[split] = {"tasks": len(tasks), "prelabeled_images": len(images), "bbox_prelabels": len(annotations), "unlabeled_tasks": len(tasks) - len(images)}
    if all_risks:
        write_csv(output / "risk_annotations.csv", list(all_risks[0]), all_risks)
    atomic_text(output / "label_studio.xml", label_studio_xml(categories, definitions))
    result = {"splits": stats, "blind_test": blind_test, "review_status": "NOT_VERIFIED", "note": "Missing prelabels produce manual tasks with unknown risks; excluded from COCO images to avoid empty negatives."}
    write_json(output / "export_report.json", result)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw", type=Path, default=DEFAULT_RAW)
    parser.add_argument("--review", type=Path, default=DEFAULT_REVIEW)
    parser.add_argument("--frozen", type=Path, default=STAGE2 / "frozen")
    parser.add_argument("--run", type=Path, help="Prelabel run directory; omit for manual-only tasks")
    parser.add_argument("--output", type=Path, default=STAGE2 / "exports")
    parser.add_argument("--show-test-prelabels", action="store_true", help="Default is blind independent test annotation")
    args = parser.parse_args()
    try:
        print(json.dumps(export(args.raw, args.review, args.frozen, args.output, args.run, not args.show_test_prelabels), ensure_ascii=False, indent=2))
    except (ValueError, OSError) as error:
        parser.exit(2, f"Export blocked: {error}\n")
