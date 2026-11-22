"""RT-DETR decoding and ONNX inference share normalized XYXY and unknown risk state."""
from __future__ import annotations

import math
from pathlib import Path

from dataset_common import sha256_file
from experiment_stage4 import unseal
from stage2_common import PipelineBlocked, RISK_IDS


def decode(logits, boxes, names, threshold=.25, maximum=200):
    """Focal-loss RT-DETR: top Q over flattened sigmoid(query,class), as HF processor."""
    if not 0 < threshold <= 1 or len(logits) != len(boxes) or not names or maximum < 1:
        raise ValueError("Invalid detector output shape/threshold")
    candidates = []
    for query, (scores, box) in enumerate(zip(logits, boxes)):
        if len(scores) != len(names) or len(box) != 4:
            raise ValueError("RT-DETR class/box shape mismatch")
        if any(not math.isfinite(float(v)) for v in [*scores, *box]):
            raise ValueError("Nonfinite model output")
        for label, score in enumerate(scores):
            score = float(score)
            confidence = 1 / (1 + math.exp(-score)) if score >= 0 else math.exp(score) / (1 + math.exp(score))
            candidates.append((confidence, query, label))
    selected = sorted(candidates, key=lambda entry: (-entry[0], entry[1], entry[2]))[:len(logits)]
    result = []
    for confidence, query, label in selected:
        if confidence < threshold:
            continue
        cx, cy, width, height = map(float, boxes[query])
        if width <= 0 or height <= 0:
            continue
        x1, y1, x2, y2 = [max(0., min(1., value)) for value in
                          [cx - width / 2, cy - height / 2, cx + width / 2, cy + height / 2]]
        if x1 >= x2 or y1 >= y2:
            continue
        result.append({"category": names[label], "bbox": {"xMin": x1, "yMin": y1, "xMax": x2, "yMax": y2},
            "confidence": confidence, "evidence": "Fine-tuned object detector proposal; risk state not established"})
        if len(result) >= maximum:
            break
    return result


def unknown_risks():
    return {key: {"present": "unknown", "severity": "UNKNOWN", "evidence": "Object detection alone cannot establish this risk"} for key in RISK_IDS}


class OnnxDetector:
    def __init__(self, directory, threads=2):
        import onnxruntime as ort
        directory = Path(directory)
        self.metadata = unseal(directory / "export.json")
        if self.metadata.get("kind") != "stage5_verified_detector_onnx" or not self.metadata.get("parity_passed"):
            raise PipelineBlocked("Only a trained, parity-checked ONNX artifact is supported")
        path = directory / "detector.onnx"
        if sha256_file(path) != self.metadata["onnx_sha256"]:
            raise PipelineBlocked("ONNX model bytes changed")
        config = self.metadata["processor"]
        if config.get("do_normalize") is not False or config.get("do_rescale") is not True or config.get("do_pad") is not False:
            raise PipelineBlocked("Unsupported RT-DETR preprocessing; export a matching processor")
        if abs(config.get("rescale_factor", 0) - 1 / 255) > 1e-10 or config.get("resample") != 2:
            raise PipelineBlocked("Unsupported image rescale/interpolation")
        self.size = self.metadata["image_size"]
        self.names = self.metadata["classes"]
        options = ort.SessionOptions()
        options.intra_op_num_threads = threads
        self.session = ort.InferenceSession(str(path), sess_options=options, providers=["CPUExecutionProvider"])

    def preprocess(self, image):
        import numpy as np
        from PIL import Image
        image = image.convert("RGB").resize((self.size, self.size), Image.Resampling.BILINEAR)
        return (np.asarray(image, dtype=np.float32) / 255).transpose(2, 0, 1)[None].copy()

    def __call__(self, image, threshold=None):
        logits, boxes = self.session.run(["logits", "pred_boxes"], {"pixel_values": self.preprocess(image)})
        return decode(logits[0], boxes[0], self.names, self.metadata["confidence_threshold"] if threshold is None else threshold)
