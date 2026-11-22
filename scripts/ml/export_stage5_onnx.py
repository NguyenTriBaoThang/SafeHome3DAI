"""Export a completed Stage 5 checkpoint, verify parity on val, then time real val images."""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

from dataset_common import DEFAULT_RAW, ROOT, image_path, sha256_file, utc_now, write_json
from detector_stage5 import OnnxDetector
from experiment_stage4 import seal, unseal
from stage2_common import PipelineBlocked
from stage5_common import HOME, load_training_bundle


def completed_run(directory, bundle_path):
    run = unseal(directory / "run.json")
    if run.get("kind") != "stage5_detector_training" or run.get("status") != "completed" or run.get("risk_classifier_trained") is not False:
        raise PipelineBlocked("A completed detector-only training run is required")
    if run["bundle_sha256"] != sha256_file(bundle_path):
        raise PipelineBlocked("Checkpoint belongs to another training bundle")
    for name, expected in run["checkpoint_sha256"].items():
        if Path(name).name != name or sha256_file(directory / "best" / name) != expected:
            raise PipelineBlocked("Selected checkpoint changed")
    return run


def export(directory, bundle_path, raw, output):
    bundle = load_training_bundle(bundle_path, raw)
    run = completed_run(directory, bundle_path)
    if output.exists() or output.resolve().is_relative_to(raw.resolve()) or output.resolve().is_relative_to((directory / "best").resolve()):
        raise PipelineBlocked("Export needs a new directory outside raw and the selected checkpoint")
    import numpy as np
    import onnx
    import onnxruntime as ort
    import torch
    from PIL import Image
    from transformers import RTDetrForObjectDetection, RTDetrImageProcessor
    model = RTDetrForObjectDetection.from_pretrained(directory / "best", use_safetensors=True).cpu().eval()
    if not model.config.use_focal_loss:
        raise PipelineBlocked("Standalone decoder requires RT-DETR focal-loss scores")
    processor = RTDetrImageProcessor.from_pretrained(directory / "best")
    config = processor.to_dict()
    if config.get("do_normalize") is not False or config.get("do_pad") is not False or config.get("do_rescale") is not True or config.get("resample") != 2:
        raise PipelineBlocked("Export only supports the checked RT-DETR bilinear/rescale preprocessing")
    size = bundle["plan"]["training"]["image_size"]
    class Outputs(torch.nn.Module):
        def __init__(self, model):
            super().__init__()
            self.model = model

        def forward(self, pixel_values):
            result = self.model(pixel_values=pixel_values)
            return result.logits, result.pred_boxes
    wrapper = Outputs(model).eval()
    rows = sorted([row for row in bundle["images"] if row["dataset_split"] == "val"], key=lambda row: row["image_id"])[:3]
    with Image.open(image_path(raw, rows[0]["file"])) as image:
        sample = processor(images=image.convert("RGB"), return_tensors="pt")["pixel_values"]
    output.mkdir(parents=True)
    target = output / "detector.onnx"
    with torch.inference_mode():
        torch.onnx.export(wrapper, (sample,), str(target), input_names=["pixel_values"], output_names=["logits", "pred_boxes"],
            opset_version=17, dynamo=False, external_data=False)
    onnx.checker.check_model(onnx.load(str(target)))
    options = ort.SessionOptions()
    options.intra_op_num_threads = 2
    session = ort.InferenceSession(str(target), sess_options=options, providers=["CPUExecutionProvider"])
    parity = []
    for row in rows:
        with Image.open(image_path(raw, row["file"])) as original:
            image = original.convert("RGB")
        inputs = processor(images=image, return_tensors="pt")["pixel_values"]
        manual = (np.asarray(image.resize((size, size), Image.Resampling.BILINEAR), dtype=np.float32) / 255).transpose(2, 0, 1)[None]
        if not np.allclose(manual, inputs.numpy(), atol=1e-6):
            raise PipelineBlocked("Standalone ONNX preprocessing differs from the training processor")
        with torch.inference_mode():
            expected = wrapper(inputs)
        actual = session.run(["logits", "pred_boxes"], {"pixel_values": inputs.numpy()})
        errors = {}
        for name, before, after in zip(["logits", "pred_boxes"], expected, actual):
            before = before.numpy()
            errors[name] = float(np.max(np.abs(before - after)))
            if not np.allclose(before, after, rtol=1e-3, atol=1e-4):
                raise PipelineBlocked("ONNX parity failed on validation image; export is not usable")
        parity.append({"image_id": row["image_id"], "max_absolute_error": errors})
    metadata = {"kind": "stage5_verified_detector_onnx", "exported_at": utc_now(), "onnx_sha256": sha256_file(target),
        "training_run_sha256": sha256_file(directory / "run.json"), "training_bundle_sha256": sha256_file(bundle_path),
        "classes": run["classes"], "untrained_classes": run["untrained_classes"], "processor": config,
        "image_size": size, "batch_size": 1, "opset": 17, "output_box_format": "normalized_cxcywh",
        "output_score_format": "focal_sigmoid_logits", "confidence_threshold": bundle["plan"]["training"]["confidence_threshold"],
        "parity_passed": True, "parity": parity, "test_used": False, "risk_assessment": "not_supported_unknown"}
    write_json(output / "export.json", seal(metadata))
    return metadata


def benchmark(directory, bundle_path, raw, report_path, repeats=30, warmup=3):
    if repeats < 1 or warmup < 0:
        raise ValueError("Invalid latency sample count")
    bundle = load_training_bundle(bundle_path, raw)
    detector = OnnxDetector(directory)
    if detector.metadata["training_bundle_sha256"] != sha256_file(bundle_path):
        raise PipelineBlocked("ONNX artifact/bundle mismatch")
    from PIL import Image
    import numpy as np
    rows = [row for row in bundle["images"] if row["dataset_split"] == "val"]
    for index in range(warmup):
        with Image.open(image_path(raw, rows[index % len(rows)]["file"])) as image:
            detector(image)
    samples = []
    for index in range(repeats):
        row = rows[index % len(rows)]
        started = time.perf_counter_ns()
        with Image.open(image_path(raw, row["file"])) as image:
            objects = detector(image)
        samples.append({"image_id": row["image_id"], "milliseconds": (time.perf_counter_ns() - started) / 1e6, "objects": len(objects)})
    values = [row["milliseconds"] for row in samples]
    report = {"measured_at": utc_now(), "provider": "onnxruntime CPUExecutionProvider", "threads": 2,
        "onnx_sha256": detector.metadata["onnx_sha256"], "scope": "val only: file decode + preprocess + inference + postprocess; warmup excluded",
        "warmup": warmup, "repeats": repeats, "p50_ms": float(np.percentile(values, 50)),
        "p95_ms": float(np.percentile(values, 95)), "samples": samples, "browser_performance_measured": False}
    write_json(report_path, seal(report))
    return report


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["export", "benchmark"])
    parser.add_argument("--run", type=Path, default=ROOT / "models/stage5/rtdetr_r18")
    parser.add_argument("--bundle", type=Path, default=HOME / "training_bundle/bundle.json")
    parser.add_argument("--raw", type=Path, default=DEFAULT_RAW)
    parser.add_argument("--onnx", type=Path, default=ROOT / "models/stage5/rtdetr_r18/onnx")
    parser.add_argument("--report", type=Path, default=ROOT / "reports/stage5/latency.json")
    args = parser.parse_args()
    try:
        result = export(args.run, args.bundle, args.raw, args.onnx) if args.action == "export" else benchmark(args.onnx, args.bundle, args.raw, args.report)
        print(json.dumps({"status": "completed", "action": args.action}))
    except (PipelineBlocked, FileNotFoundError) as error:
        print(json.dumps({"status": "blocked", "reason": str(error), "action": args.action}))
        raise SystemExit(2)
