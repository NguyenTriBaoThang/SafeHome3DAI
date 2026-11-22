"""Train only an exported human-verified detector bundle; never accepts AI labels/test frames."""
from __future__ import annotations

import argparse
import copy
import importlib.metadata
import json
import math
import random
import time
from pathlib import Path

from baseline_metrics import detection_metrics
from dataset_common import DEFAULT_RAW, ROOT, image_path, sha256_file, utc_now, write_json
from detector_stage5 import decode
from experiment_stage4 import seal
from stage2_common import PipelineBlocked, digest
from stage5_common import HOME, load_training_bundle


def augment(image, objects, rng, plan):
    from PIL import ImageEnhance, ImageOps
    objects = copy.deepcopy(objects)
    if rng.random() < plan["horizontal_flip_probability"]:
        image = ImageOps.mirror(image)
        for obj in objects:
            box = obj["bbox"]
            box["xMin"], box["xMax"] = 1 - box["xMax"], 1 - box["xMin"]
    image = ImageEnhance.Brightness(image).enhance(rng.uniform(1 - plan["brightness_jitter"], 1 + plan["brightness_jitter"]))
    image = ImageEnhance.Contrast(image).enhance(rng.uniform(1 - plan["contrast_jitter"], 1 + plan["contrast_jitter"]))
    return image, objects


def targets(row, objects, mapping, index):
    width, height = int(row["width"]), int(row["height"])
    annotations = []
    for obj in objects:
        b = obj["bbox"]
        box = [b["xMin"] * width, b["yMin"] * height, (b["xMax"] - b["xMin"]) * width, (b["yMax"] - b["yMin"]) * height]
        annotations.append({"category_id": mapping[obj["category"]], "bbox": box, "area": box[2] * box[3], "iscrowd": 0})
    return {"image_id": index, "annotations": annotations}


def validate(model, processor, rows, raw, names, threshold, device):
    import torch
    from PIL import Image
    examples = []
    model.eval()
    with torch.inference_mode():
        for row in rows:
            with Image.open(image_path(raw, row["file"])) as photo:
                inputs = processor(images=photo.convert("RGB"), return_tensors="pt")
            outputs = model(pixel_values=inputs["pixel_values"].to(device))
            objects = decode(outputs.logits[0].cpu().tolist(), outputs.pred_boxes[0].cpu().tolist(), names, threshold)
            examples.append({"image_id": row["image_id"], "group_id": row["group_id"], "truth": {"objects": row["objects"]},
                             "prediction": {"status": "success", "objects": objects}})
    return detection_metrics(examples, [{"name": name} for name in names], threshold)


def train(bundle_path, raw, output, device_name="cuda"):
    # Every data gate precedes torch/model imports or any weight download.
    bundle = load_training_bundle(bundle_path, raw)
    if output.exists() or output.resolve().is_relative_to(raw.resolve()):
        raise PipelineBlocked("Use a new model output directory outside raw; do not overwrite an earlier training run")
    import torch
    from PIL import Image
    from transformers import RTDetrForObjectDetection, RTDetrImageProcessor
    if device_name == "cuda" and not torch.cuda.is_available():
        raise PipelineBlocked("CUDA GPU unavailable; use the Colab/Kaggle notebook or explicitly select --device cpu")
    for name, version in {"torch": "2.9.0", "transformers": "4.57.1"}.items():
        if importlib.metadata.version(name) != version:
            raise PipelineBlocked("Pinned training runtime required: " + name + "==" + version)
    plan, config = bundle["plan"], bundle["plan"]["training"]
    random.seed(plan["seed"])
    torch.manual_seed(plan["seed"])
    torch.set_num_threads(2)
    torch.use_deterministic_algorithms(True, warn_only=True)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(plan["seed"])
        torch.backends.cudnn.benchmark = False
    device = torch.device(device_name)
    mapping = bundle["class_to_model_id"]
    names = [name for name, index in sorted(mapping.items(), key=lambda entry: entry[1])]
    processor = RTDetrImageProcessor.from_pretrained(plan["model"], revision=plan["revision"],
                                                    size={"height": config["image_size"], "width": config["image_size"]})
    model = RTDetrForObjectDetection.from_pretrained(plan["model"], revision=plan["revision"], use_safetensors=True,
        id2label=dict(enumerate(names)), label2id=mapping, ignore_mismatched_sizes=True,
        disable_custom_kernels=True).to(device)
    output.mkdir(parents=True)
    source_files = ["train_detector.py", "detector_stage5.py", "stage5_common.py"]
    run = {"kind": "stage5_detector_training", "started_at": utc_now(), "bundle_sha256": sha256_file(bundle_path),
        "bundle_content_sha256": bundle["content_sha256"], "plan": plan, "classes": names,
        "untrained_classes": bundle["untrained_classes"], "snapshot_sha256": bundle["snapshot_sha256"],
        "device": str(device), "seeded_not_bitwise_deterministic": True,
        "runtime": {name: importlib.metadata.version(name) for name in ["torch", "transformers", "numpy", "scipy", "Pillow"]},
        "source_sha256": {name: sha256_file(Path(__file__).with_name(name)) for name in source_files},
        "test_used_for_selection": False, "risk_classifier_trained": False, "status": "running"}
    write_json(output / "run.json", seal(run))
    optimizer = torch.optim.AdamW(model.parameters(), lr=config["learning_rate"], weight_decay=config["weight_decay"])
    train_rows = [row for row in bundle["images"] if row["dataset_split"] == "train"]
    val_rows = [row for row in bundle["images"] if row["dataset_split"] == "val"]
    rng, history, best, stalled = random.Random(plan["seed"]), [], -1., 0
    for epoch in range(config["epochs"]):
        model.train()
        ordered = list(enumerate(train_rows))
        rng.shuffle(ordered)
        total, batches = 0., 0
        started = time.perf_counter()
        for start in range(0, len(ordered), config["batch_size"]):
            photos, annotations = [], []
            for index, row in ordered[start:start + config["batch_size"]]:
                with Image.open(image_path(raw, row["file"])) as original:
                    photo, boxes = augment(original.convert("RGB"), row["objects"], rng, config)
                photos.append(photo)
                annotations.append(targets(row, boxes, mapping, index))
            inputs = processor(images=photos, annotations=annotations, return_tensors="pt")
            labels = [{key: value.to(device) for key, value in entry.items()} for entry in inputs["labels"]]
            optimizer.zero_grad(set_to_none=True)
            loss = model(pixel_values=inputs["pixel_values"].to(device), labels=labels).loss
            if not torch.isfinite(loss):
                raise RuntimeError("Nonfinite detector loss; no completed checkpoint produced")
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), config["gradient_clip_norm"], error_if_nonfinite=True)
            optimizer.step()
            total += float(loss.detach().cpu())
            batches += 1
        metrics = validate(model, processor, val_rows, raw, names, config["confidence_threshold"], device)
        score = metrics["map50"]
        if score is None or not math.isfinite(score):
            raise PipelineBlocked("Validation AP undefined; cannot select a checkpoint")
        record = {"epoch": epoch + 1, "train_loss": total / batches, "val_map50": score,
                  "seconds": time.perf_counter() - started, "val_detection": metrics}
        history.append(record)
        print(json.dumps({key: record[key] for key in ["epoch", "train_loss", "val_map50", "seconds"]}), flush=True)
        write_json(output / "history.json", history)
        if score > best + config["min_delta"]:
            best, stalled = score, 0
            model.save_pretrained(output / "best", safe_serialization=True)
            processor.save_pretrained(output / "best")
            run["best_epoch"] = epoch + 1
        else:
            stalled += 1
        if stalled >= config["patience"]:
            break
    run.update(status="completed", completed_at=utc_now(), best_val_map50=best, epochs_completed=len(history),
        checkpoint_sha256={path.name: sha256_file(path) for path in (output / "best").iterdir() if path.is_file()})
    write_json(output / "run.json", seal(run))
    return run


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bundle", type=Path, default=HOME / "training_bundle/bundle.json")
    parser.add_argument("--raw", type=Path, default=DEFAULT_RAW)
    parser.add_argument("--output", type=Path, default=ROOT / "models/stage5/rtdetr_r18")
    parser.add_argument("--device", choices=["cuda", "cpu"], default="cuda")
    args = parser.parse_args()
    try:
        result = train(args.bundle, args.raw, args.output, args.device)
        print(json.dumps({"status": result["status"], "best_epoch": result["best_epoch"], "best_val_map50": result["best_val_map50"]}))
    except (PipelineBlocked, FileNotFoundError) as error:
        print(json.dumps({"status": "blocked", "reason": str(error), "model_created": False}))
        raise SystemExit(2)
