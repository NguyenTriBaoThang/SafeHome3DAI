"""Optional OWLv2 CPU inference. Imported/downloaded only after verified-data gates."""
from __future__ import annotations

from importlib.metadata import version

MODEL = "google/owlv2-base-patch16-ensemble"
REVISION = "cfd3195ba4ea9592eec887ded089f4c08eff231d"
VERSIONS = {"torch": "2.9.0", "transformers": "4.57.1"}
QUERIES = {
    "bed": "a bed", "chair": "a chair", "table": "a table", "cabinet": "a cabinet",
    "nightstand": "a bedside table", "door": "a door", "toilet": "a toilet",
    "sink": "a sink", "bathtub": "a bathtub", "sofa": "a sofa", "rug": "a rug",
    "electrical_cable": "an electrical cable on the floor", "grab_bar": "a bathroom grab bar",
    "obstacle_route": "an object blocking a walkway", "threshold_step": "a doorway threshold step",
    "lamp": "a lamp", "light_switch": "a light switch",
}


def check_dependencies():
    for package, required in VERSIONS.items():
        if version(package) != required:
            raise ValueError(f"Optional detector requires {package}=={required}")


class Owlv2Detector:
    def __init__(self, seed=20261122):
        check_dependencies()
        import torch
        from transformers import Owlv2ForObjectDetection, Owlv2Processor
        self.torch = torch
        self.torch.set_num_threads(2)
        self.torch.manual_seed(seed)
        self.torch.use_deterministic_algorithms(True)
        # Pin the checkpoint and use safetensors, never remote Python/pickle weights.
        self.processor = Owlv2Processor.from_pretrained(MODEL, revision=REVISION, use_fast=False)
        self.model = Owlv2ForObjectDetection.from_pretrained(MODEL, revision=REVISION,
            use_safetensors=True).to("cpu").eval()

    def __call__(self, image, threshold):
        names = list(QUERIES)
        inputs = self.processor(text=[list(QUERIES.values())], images=image, return_tensors="pt")
        with self.torch.inference_mode():
            outputs = self.model(**inputs)
        found = self.processor.post_process_object_detection(outputs, threshold=threshold,
            target_sizes=self.torch.tensor([[image.height, image.width]]))[0]
        objects = []
        for score, label, coords in zip(found["scores"], found["labels"], found["boxes"]):
            x1, y1, x2, y2 = coords.tolist()
            box = dict(zip(["xMin", "yMin", "xMax", "yMax"],
                [max(0, min(1, x1 / image.width)), max(0, min(1, y1 / image.height)),
                 max(0, min(1, x2 / image.width)), max(0, min(1, y2 / image.height))]))
            if box["xMin"] < box["xMax"] and box["yMin"] < box["yMax"]:
                objects.append({"category": names[int(label)], "bbox": box, "confidence": float(score),
                    "evidence": "OWLv2 text-conditioned proposal; state not established by detector"})
        # Same-class NMS; deterministic order, a maximum of 200 proposals in the shared contract.
        from baseline_metrics import iou
        kept = []
        for obj in sorted(objects, key=lambda item: (-item["confidence"], item["category"], tuple(item["bbox"].values()))):
            if not any(other["category"] == obj["category"] and iou(other["bbox"], obj["bbox"]) > .5 for other in kept):
                kept.append(obj)
        return kept[:200]
