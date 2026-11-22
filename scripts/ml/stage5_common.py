"""Human-only Stage 5 readiness, support accounting, and portable train/val export."""
from __future__ import annotations

import json
import math
from collections import Counter
from pathlib import Path

from baseline_report import table
from dataset_common import (DEFAULT_RAW, DEFAULT_REVIEW, ROOT, atomic_text, image_path,
                            sha256_file, utc_now, write_csv, write_json)
from experiment_stage4 import seal, unseal
from import_verified import VERIFIED, load_verified
from split_dataset import build_groups
from stage2_common import (PipelineBlocked, RISK_IDS, STAGE2, digest, load_frozen,
                           load_taxonomy, reviewed_inputs)

PLAN = Path(__file__).with_name("stage5_plan.json")
HOME = ROOT / "data/processed/stage5"
REPORTS = ROOT / "reports/stage5"


def read_plan(path=PLAN):
    plan = path if isinstance(path, dict) else json.loads(path.read_text(encoding="utf-8"))
    if plan.get("version") != 1 or plan.get("model") != "PekingU/rtdetr_r18vd" or plan.get("revision") != "ac77a11ff0170a41b771c03264987f8ce2b0d753":
        raise PipelineBlocked("Unsupported or unreviewed Stage 5 checkpoint")
    if type(plan.get("seed")) is not int:
        raise PipelineBlocked("Explicit integer seed required")
    required = {"train_objects_per_class", "train_positive_images_per_class", "train_positive_groups_per_class",
                "val_positive_images_per_class", "val_positive_groups_per_class", "risk_train_positive_images"}
    if set(plan.get("minimums", {})) != required or any(type(v) is not int or v < 1 for v in plan["minimums"].values()):
        raise PipelineBlocked("Invalid data support minimums")
    if plan["minimums"]["risk_train_positive_images"] < 50:
        raise PipelineBlocked("The user requires at least 50 confirmed positive images per risk")
    for key in ["epochs", "batch_size", "patience", "image_size", "bootstrap"]:
        if type(plan["training"].get(key)) is not int or plan["training"][key] < 1:
            raise PipelineBlocked("Invalid training integer: " + key)
    for key in ["learning_rate", "weight_decay", "min_delta", "horizontal_flip_probability", "brightness_jitter",
                "contrast_jitter", "confidence_threshold", "gradient_clip_norm"]:
        value = plan["training"].get(key)
        if type(value) not in {int, float} or not math.isfinite(value) or not 0 < value <= 1:
            raise PipelineBlocked("Invalid training scalar: " + key)
    if set(plan["stage4_object_targets"]) != {"map50", "class_recall"} or any(
            type(v) not in {int, float} or not 0 < v <= 1 for v in plan["stage4_object_targets"].values()):
        raise PipelineBlocked("Invalid object acceptance targets")
    return plan


def support(rows, records, categories, plan):
    by_id = {row["image_id"]: row for row in rows}
    objects, risks = [], []
    for category in categories:
        name = category["name"]
        counts, positive_images, positive_groups = Counter(), {}, {}
        for split in ["train", "val"]:
            chosen = [entry for entry in records if by_id[entry["image_id"]]["dataset_split"] == split]
            count = {entry["image_id"]: sum(obj["category"] == name for obj in entry["objects"]) for entry in chosen}
            counts[split] = sum(count.values())
            positive_images[split] = sum(v > 0 for v in count.values())
            positive_groups[split] = len({by_id[key]["group_id"] for key, value in count.items() if value > 0})
        observed = {"train_objects_per_class": counts["train"], "train_positive_images_per_class": positive_images["train"],
            "train_positive_groups_per_class": positive_groups["train"], "val_positive_images_per_class": positive_images["val"],
            "val_positive_groups_per_class": positive_groups["val"]}
        deficits = {key: max(0, plan["minimums"][key] - value) for key, value in observed.items()}
        objects.append({"class": name, "vietnamese_name": category["vietnamese_name"], **observed,
            "val_objects": counts["val"], "additional_needed": deficits, "eligible": not any(deficits.values()),
            "warning": "Planning minimums only; <20 positive validation images gives an uncertain estimate" if positive_images["val"] < 20 else None})
    for key in RISK_IDS:
        counts = Counter(positive=0, negative=0, unknown=0, not_applicable=0)
        for entry in records:
            if by_id[entry["image_id"]]["dataset_split"] != "train":
                continue
            risk = entry["risks"][key]
            counts["not_applicable" if not risk["applicable"] else "unknown" if risk["present"] == "unknown" else
                   "positive" if risk["present"] is True else "negative"] += 1
        minimum = plan["minimums"]["risk_train_positive_images"]
        risks.append({"risk_id": key, **counts, "additional_positive_images_needed": max(0, minimum - counts["positive"]),
                      "risk_classifier_implemented": False, "minimum_positive_images": minimum})
    return objects, risks


def protected_test(store, ai_protocol):
    if not ai_protocol.is_file():
        return set(), {"source": None, "test_images": 0, "source_sha256": None}
    record = unseal(ai_protocol)
    if record["config"].get("mode") != "AI_REFERENCE_EXPLORATORY":
        raise PipelineBlocked("Unexpected exploratory protocol source")
    test = [row for row in record["membership"] if row["dataset_split"] == "test"]
    for row in test:
        if row["image_id"] not in store.rows_by_id or row["sha256"] != store.rows_by_id[row["image_id"]]["sha256"]:
            raise PipelineBlocked("Previously frozen exploratory test identity changed")
    groups, _ = build_groups(store.rows, store.by_id, overrides=store.review / "household_groups.csv")
    held_groups = {groups[row["image_id"]] for row in test}
    held_ids = {key for key, group in groups.items() if group in held_groups}
    return held_ids, {"source": str(ai_protocol), "source_sha256": sha256_file(ai_protocol),
        "test_images": len(test), "protected_images_in_all_raw_groups": len(held_ids),
        "note": "Protect the complete source/near-duplicate group of each previously frozen test image from train/val."}


def inspect(raw=DEFAULT_RAW, review=DEFAULT_REVIEW, frozen=STAGE2 / "frozen", verified=VERIFIED,
            stage4=ROOT / "reports/experiments.json", ai_protocol=ROOT / "data/processed/stage4/exploratory/protocol.json", plan_path=PLAN):
    plan, categories = read_plan(plan_path), load_taxonomy()
    store, state, eligible, excluded = reviewed_inputs(raw, review)
    report = {"generated_at": utc_now(), "status": "blocked", "training_permitted": False, "training_runs": 0,
        "trained_models": 0, "onnx_exports": 0, "latency_ms": None, "plan": plan,
        "raw_images": len(store.rows), "human_scene_eligible_images": len(eligible), "verified_train_images": 0,
        "verified_val_images": 0, "blockers": [], "official_accuracy": "not_evaluated",
        "raw_manifest_sha256": store.manifest_hash, "human_review_revision": state["revision"],
        "human_decisions_sha256": sha256_file(review / "decisions.json") if (review / "decisions.json").is_file() else None,
        "test_annotations_parsed": False}
    import csv
    with (raw / "risk_annotations_TEMPLATE.csv").open(encoding="utf-8-sig", newline="") as stream:
        report["raw_risk_unlabeled_rows"] = sum(str(row.get("risk_present", "")).strip().lower() in {"", "unlabeled", "unknown"}
                                                for row in csv.DictReader(stream))
    held_ids, holdout = protected_test(store, ai_protocol)
    report["protected_prior_test"] = holdout
    ai_train = ai_protocol.parent / "references_train.json"
    report["ai_train_reference_images_not_trainable"] = 0
    report["ai_train_reference_objects_not_trainable"] = 0
    if ai_protocol.is_file() and ai_train.is_file():
        protocol = unseal(ai_protocol)
        expected = protocol.get("reference_files_sha256", {}).get("train")
        if expected != sha256_file(ai_train):
            raise PipelineBlocked("AI train reference provenance changed")
        reference = unseal(ai_train)["images"]
        report["ai_train_reference_images_not_trainable"] = len(reference)
        report["ai_train_reference_objects_not_trainable"] = sum(len(row["objects"]) for row in reference)
    snapshot, rows, records, definitions, bundle = None, [], [], [], None
    try:
        if not (frozen / "snapshot.json").is_file():
            raise PipelineBlocked("Missing official human-reviewed frozen split")
        snapshot, rows, categories, definitions = load_frozen(frozen, raw, review)
        if any(row["image_id"] in held_ids and row["dataset_split"] in {"train", "val"} for row in rows):
            raise PipelineBlocked("Previously frozen exploratory test group cannot become train/val")
        bundle = load_verified(verified, snapshot, rows, categories, definitions, splits={"train", "val"})
        records = bundle["images"]
        for split in ["train", "val"]:
            expected = {row["image_id"] for row in rows if row["dataset_split"] == split}
            actual = {entry["image_id"] for entry in records if entry["split"] == split}
            if not expected or expected != actual:
                raise PipelineBlocked("Complete verified object/risk labels required for all " + split + " images; unlabeled frames cannot be empty targets")
            report["verified_" + split + "_images"] = len(actual)
    except (PipelineBlocked, FileNotFoundError) as error:
        report["blockers"].append(str(error))
        records = []  # No partial/invalid labels count as training support.
        report["verified_train_images"] = report["verified_val_images"] = 0
    report["objects"], report["risks"] = support(rows, records, categories, plan)
    trainable = [item["class"] for item in report["objects"] if item["eligible"]]
    report["eligible_classes"] = trainable
    if not trainable:
        report["blockers"].append("No object class reaches the declared verified train/val support minimums")
    comparison, need = None, False
    if snapshot is not None and stage4.is_file():
        try:
            comparison = unseal(stage4)
            if (comparison.get("status") != "completed" or not comparison.get("winner") or comparison.get("action") not in {None, "val"} or
                    comparison.get("config", {}).get("snapshot_sha256") != digest(snapshot) or
                    comparison.get("ml_metrics") != "computed_from_verified_ground_truth"):
                raise PipelineBlocked("Stage 4 has no matching completed human-verified validation comparison")
            result = comparison["results"][comparison["winner"]]
            metric = result["metrics"]["detection"]
            if metric["map50"] is None or result["status"] != "completed":
                raise PipelineBlocked("Stage 4 object baseline is not evaluable")
            scoped = [metric["classes"].get(name, {}) for name in trainable]
            if trainable and any(value.get("ap50") is None or value.get("recall") is None for value in scoped):
                raise PipelineBlocked("Stage 4 lacks evaluable object metrics for a proposed training class")
            scoped_map = sum(value["ap50"] for value in scoped) / len(scoped) if scoped else None
            need = bool(scoped) and (scoped_map < plan["stage4_object_targets"]["map50"] or any(
                value["recall"] < plan["stage4_object_targets"]["class_recall"] for value in scoped))
            report["stage4_object_evidence"] = {"classes": trainable, "scoped_map50": scoped_map,
                "note": "Compare only the same supported class set; weak unsupported classes do not justify training unrelated adequate classes."}
            report["stage4_object_improvement_needed"] = need
        except (PipelineBlocked, KeyError) as error:
            report["blockers"].append(str(error))
    else:
        report["blockers"].append("Need a human-verified Stage 4 validation result to establish whether object fine-tuning is justified; AI agreement is insufficient")
    if comparison is not None and not need and not report["blockers"]:
        report["blockers"].append("Stage 4 already meets declared object targets; fine-tuning is not justified by current criteria")
    report["stage4_validation_sha256"] = sha256_file(stage4) if stage4.is_file() else None
    report["status"] = "ready" if not report["blockers"] else "blocked"
    report["training_permitted"] = report["status"] == "ready" and need
    context = {"snapshot": snapshot, "rows": rows, "records": records, "categories": categories,
               "definitions": definitions, "bundle": bundle, "report": report}
    return report, context


def write_readiness(report, directory=REPORTS):
    write_json(directory / "readiness.json", seal(report))
    object_rows = [{key: value for key, value in row.items() if key != "additional_needed"} | {
        "need_" + key: value for key, value in row["additional_needed"].items()} for row in report["objects"]]
    write_csv(directory / "object_data_gaps.csv", list(object_rows[0]), object_rows)
    write_csv(directory / "risk_data_gaps.csv", list(report["risks"][0]), report["risks"])
    lines = ["# Giai đoạn 5 — điều kiện fine-tune", "", "Trạng thái: **" + report["status"] + "**.",
        "Chưa huấn luyện; chưa có model fine-tune/ONNX hay số đo độ trễ. Không dùng điểm khớp nhãn AI như độ chính xác chính thức.", "",
        "Ảnh scene đủ điều kiện do người duyệt: " + str(report["human_scene_eligible_images"]) +
        "; ảnh train có nhãn verified: " + str(report["verified_train_images"]) + "; val verified: " + str(report["verified_val_images"]) + ".", ""]
    lines += ["- " + item for item in report["blockers"]] + ["", "## Thiếu dữ liệu detector", "",
        "Mức tối thiểu trong plan là tiêu chí chuẩn bị kỹ thuật, không bảo đảm đủ dữ liệu về mặt thống kê; không phải ngưỡng y khoa.", ""]
    lines += table(["Lớp", "Train bbox verified", "Train ảnh dương", "Val ảnh dương", "Cần thêm bbox train", "Cần thêm ảnh train", "Đủ điều kiện"],
        [[row["class"], row["train_objects_per_class"], row["train_positive_images_per_class"], row["val_positive_images_per_class"],
          row["additional_needed"]["train_objects_per_class"], row["additional_needed"]["train_positive_images_per_class"], row["eligible"]] for row in report["objects"]])
    lines += ["", "## Thiếu dữ liệu nguy cơ", "", "Không xây hoặc huấn luyện classifier nguy cơ trong nhánh này. Chỉ đếm nhãn train verified; unknown/N/A không phải âm.", ""]
    lines += table(["Risk", "Dương train verified", "Âm", "Unknown", "Cần thêm ảnh dương để đạt 50"],
        [[row["risk_id"], row["positive"], row["negative"], row["unknown"], row["additional_positive_images_needed"]] for row in report["risks"]])
    lines += ["", "Ảnh/nhóm test thăm dò Giai đoạn 4 tiếp tục được bảo vệ, không chuyển sang train/val. Đổi tập test hoặc huấn luyện trên test đã xem sẽ làm mất tính độc lập.", ""]
    atomic_text(directory / "readiness.md", "\n".join(lines))


def export_bundle(report, context, raw=DEFAULT_RAW, output=HOME / "training_bundle"):
    if not report["training_permitted"]:
        raise PipelineBlocked("Stage 5 training blocked: " + "; ".join(report["blockers"]))
    if output.exists():
        raise PipelineBlocked("Training bundle already exists; keep it immutable")
    if output.resolve().is_relative_to(raw.resolve()):
        raise PipelineBlocked("Training output cannot overwrite raw")
    names = report["eligible_classes"]
    mapping = {name: index for index, name in enumerate(names)}
    labels = {entry["image_id"]: entry for entry in context["records"]}
    images, annotation_hashes = [], {}
    for row in context["rows"]:
        if row["dataset_split"] not in {"train", "val"}:
            continue
        path = image_path(raw, row["file"])
        if sha256_file(path) != row["sha256"]:
            raise PipelineBlocked("Training image bytes changed")
        record = labels[row["image_id"]]
        images.append({**row, "objects": [obj for obj in record["objects"] if obj["category"] in mapping],
                       "objects_verified": True, "review_status": "verified"})
        annotation_hashes[row["image_id"]] = digest(record)
    metadata = {"kind": "human_verified_detector_train_val", "schema_version": 1, "created_at": utc_now(),
        "plan": report["plan"], "class_to_model_id": mapping,
        "untrained_classes": [entry["name"] for entry in context["categories"] if entry["name"] not in mapping],
        "snapshot_sha256": digest(context["snapshot"]), "verified_source_sha256": context["bundle"]["source_export_sha256"],
        "stage4_validation_sha256": report["stage4_validation_sha256"], "annotation_sha256": annotation_hashes,
        "protected_prior_test": report["protected_prior_test"], "images": images,
        "test_membership": [{key: row[key] for key in ["image_id", "sha256", "group_id"]}
                            for row in context["rows"] if row["dataset_split"] == "test"],
        "test_annotations_included": False}
    for split in ["train", "val"]:
        rows, annotations = [], []
        for index, row in enumerate([entry for entry in images if entry["dataset_split"] == split], 1):
            width, height = int(row["width"]), int(row["height"])
            rows.append({"id": index, "image_id": row["image_id"], "file_name": row["file"], "width": width, "height": height,
                "group_id": row["group_id"], "license_short": row["license_short"], "license_url": row["license_url"],
                "author": row["author"], "attribution": row["attribution"]})
            for obj in row["objects"]:
                b = obj["bbox"]
                box = [b["xMin"] * width, b["yMin"] * height, (b["xMax"] - b["xMin"]) * width, (b["yMax"] - b["yMin"]) * height]
                annotations.append({"id": len(annotations) + 1, "image_id": index, "category_id": mapping[obj["category"]],
                                    "bbox": box, "area": box[2] * box[3], "iscrowd": 0})
        coco = {"info": {"review_status": "verified", "snapshot_sha256": metadata["snapshot_sha256"]},
                "images": rows, "annotations": annotations, "categories": [{"id": value, "name": key} for key, value in mapping.items()]}
        write_json(output / ("coco_" + split + ".json"), coco)
    write_json(output / "bundle.json", seal(metadata))
    return metadata


def load_training_bundle(path, raw):
    bundle = unseal(path)
    if bundle.get("kind") != "human_verified_detector_train_val" or bundle.get("test_annotations_included") is not False:
        raise PipelineBlocked("Only validated human train/val bundles are trainable; AI references/test labels rejected")
    mapping = bundle["class_to_model_id"]
    if not mapping or sorted(mapping.values()) != list(range(len(mapping))):
        raise PipelineBlocked("Model class IDs must be contiguous")
    plan = read_plan(bundle["plan"])
    if not set(mapping) <= {entry["name"] for entry in load_taxonomy()}:
        raise PipelineBlocked("Unknown model taxonomy")
    test_ids = {row["image_id"] for row in bundle["test_membership"]}
    test_groups = {row["group_id"] for row in bundle["test_membership"]}
    test_hashes = {row["sha256"] for row in bundle["test_membership"]}
    groups, seen = {}, set()
    for row in bundle["images"]:
        if row["image_id"] in seen or row["dataset_split"] not in {"train", "val"} or row.get("objects_verified") is not True or row.get("review_status") != "verified":
            raise PipelineBlocked("Unknown/unverified/duplicate/test training frame")
        seen.add(row["image_id"])
        if row["image_id"] in test_ids or row["group_id"] in test_groups or row["sha256"] in test_hashes:
            raise PipelineBlocked("Test identity/group cannot enter training or validation")
        if row["group_id"] in groups and groups[row["group_id"]] != row["dataset_split"]:
            raise PipelineBlocked("Train/val group leakage")
        groups[row["group_id"]] = row["dataset_split"]
        if sha256_file(image_path(raw, row["file"])) != row["sha256"]:
            raise PipelineBlocked("Training bundle image checksum mismatch")
        from PIL import Image
        with Image.open(image_path(raw, row["file"])) as image:
            if image.size != (int(row["width"]), int(row["height"])):
                raise PipelineBlocked("Training dimensions do not match original image")
        for obj in row["objects"]:
            values = [obj["bbox"][key] for key in ["xMin", "yMin", "xMax", "yMax"]]
            if (obj["category"] not in mapping or any(type(v) not in {int, float} or not math.isfinite(v) or not 0 <= v <= 1 for v in values)
                    or values[0] >= values[2] or values[1] >= values[3]):
                raise PipelineBlocked("Invalid verified object/normalized bbox")
    if {row["dataset_split"] for row in bundle["images"]} != {"train", "val"}:
        raise PipelineBlocked("Both train and validation are required")
    for name in mapping:
        observed = {}
        for split in ["train", "val"]:
            chosen = [row for row in bundle["images"] if row["dataset_split"] == split]
            positive = [row for row in chosen if any(obj["category"] == name for obj in row["objects"])]
            observed[split + "_positive_images_per_class"] = len(positive)
            observed[split + "_positive_groups_per_class"] = len({row["group_id"] for row in positive})
            if split == "train":
                observed["train_objects_per_class"] = sum(obj["category"] == name for row in chosen for obj in row["objects"])
        if any(value < plan["minimums"][key] for key, value in observed.items()):
            raise PipelineBlocked("Exported class no longer satisfies declared data support: " + name)
    return bundle
