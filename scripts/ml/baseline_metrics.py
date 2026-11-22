"""Detection AP50 and abstention-aware risk metrics, with group bootstrap CIs."""
from __future__ import annotations

import random
from collections import Counter, defaultdict

from stage2_common import RISK_IDS


def divide(a, b):
    return a / b if b else None


def iou(a, b):
    intersection = max(0, min(a["xMax"], b["xMax"]) - max(a["xMin"], b["xMin"])) * max(0, min(a["yMax"], b["yMax"]) - max(a["yMin"], b["yMin"]))
    area_a = (a["xMax"] - a["xMin"]) * (a["yMax"] - a["yMin"])
    area_b = (b["xMax"] - b["xMin"]) * (b["yMax"] - b["yMin"])
    return divide(intersection, area_a + area_b - intersection) or 0


def detection_metrics(examples, categories, threshold=.5):
    classes = {}
    for category in categories:
        name = category["name"]
        targets, predictions = {}, []
        for index, example in enumerate(examples):
            targets[index] = [obj for obj in example["truth"]["objects"] if obj["category"] == name]
            candidates = [obj for obj in example["prediction"].get("objects", []) if obj["category"] == name]
            # COCO-style maxDets=100 per image/category, descending confidence.
            candidates = sorted(candidates, key=lambda obj: obj["confidence"], reverse=True)[:100]
            predictions.extend((obj["confidence"], index, k, obj) for k, obj in enumerate(candidates))
        predictions.sort(key=lambda value: (-value[0], value[1], value[2]))
        matched = defaultdict(set)
        ranked = []
        for confidence, index, _, obj in predictions:
            available = [(iou(obj["bbox"], truth["bbox"]), key) for key, truth in enumerate(targets[index]) if key not in matched[index]]
            overlap, target = max(available, default=(0, None))
            hit = overlap >= .5 and target is not None
            if hit:
                matched[index].add(target)
            ranked.append((confidence, hit))
        positives = sum(len(items) for items in targets.values())
        tp, fp, points = 0, 0, []
        for confidence, hit in ranked:
            tp += hit
            fp += not hit
            points.append((divide(tp, positives) or 0, tp / (tp + fp)))
        ap = None
        if positives:
            # Interpolated precision on recall 0, .01, ... 1; no-support classes remain undefined.
            ap = sum(max((precision for recall, precision in points if recall >= target / 100), default=0) for target in range(101)) / 101
        selected = [hit for confidence, hit in ranked if confidence >= threshold]
        threshold_tp = sum(selected)
        threshold_fp = len(selected) - threshold_tp
        classes[name] = {"gt_objects": positives, "predicted_objects": len(ranked), "ap50": ap,
                         "tp": threshold_tp, "fp": threshold_fp, "fn": positives - threshold_tp,
                         "precision": divide(threshold_tp, len(selected)), "recall": divide(threshold_tp, positives),
                         "positive_images": sum(bool(items) for items in targets.values()), "warning": "<20 positive objects" if positives < 20 else None}
    aps = [value["ap50"] for value in classes.values() if value["ap50"] is not None]
    return {"map50": sum(aps) / len(aps) if aps else None, "classes_with_ground_truth": len(aps),
            "iou": .5, "recall_grid_points": 101, "confidence_threshold_for_pr": threshold, "classes": classes}


def risk_metrics(examples):
    results = {}
    for risk_id in RISK_IDS:
        counts = Counter(tp=0, fp=0, tn=0, fn=0, abstain_positive=0, abstain_negative=0, excluded_unknown=0, excluded_not_applicable=0)
        high_positive, high_hits = 0, 0
        for example in examples:
            truth = example["truth"]["risks"][risk_id]
            if not truth["applicable"]:
                counts["excluded_not_applicable"] += 1
                continue
            actual = truth["present"]
            if actual == "unknown":
                counts["excluded_unknown"] += 1
                continue
            predicted = example["prediction"].get("risks", {}).get(risk_id, {}).get("present", "unknown")
            if actual is True:
                if truth["severity"] == "HIGH":
                    high_positive += 1
                    high_hits += predicted is True
                counts["tp" if predicted is True else "fn" if predicted is False else "abstain_positive"] += 1
            else:
                counts["fp" if predicted is True else "tn" if predicted is False else "abstain_negative"] += 1
        positive = counts["tp"] + counts["fn"] + counts["abstain_positive"]
        negative = counts["fp"] + counts["tn"] + counts["abstain_negative"]
        missed = counts["fn"] + counts["abstain_positive"]
        answered = counts["tp"] + counts["fp"] + counts["tn"] + counts["fn"]
        results[risk_id] = {**dict(counts), "positive": positive, "negative": negative,
            "precision": divide(counts["tp"], counts["tp"] + counts["fp"]),
            "recall": divide(counts["tp"], positive),
            "f1": divide(2 * counts["tp"], 2 * counts["tp"] + counts["fp"] + missed),
            "prediction_coverage": divide(answered, positive + negative),
            "high_positive": high_positive, "high_recall": divide(high_hits, high_positive),
            "warning": "<20 positive verified images; uncertain estimate" if positive < 20 else None}
    return results


def percentile(values, fraction):
    values = sorted(values)
    position = (len(values) - 1) * fraction
    lower = int(position)
    upper = min(lower + 1, len(values) - 1)
    return values[lower] + (values[upper] - values[lower]) * (position - lower)


def evaluate(examples, categories, bootstrap=1000, seed=20261122, threshold=.5):
    detections, risks = detection_metrics(examples, categories, threshold), risk_metrics(examples)
    grouped = defaultdict(list)
    for example in examples:
        grouped[example["group_id"]].append(example)
    samples = defaultdict(list)
    keys = sorted(grouped)
    rng = random.Random(seed)
    # Whole groups are sampled to preserve within-house/source correlation.
    if len(keys) >= 2:
        for _ in range(bootstrap):
            draw = [item for key in rng.choices(keys, k=len(keys)) for item in grouped[key]]
            det, risk = detection_metrics(draw, categories, threshold), risk_metrics(draw)
            if det["map50"] is not None:
                samples["map50"].append(det["map50"])
            for name, value in det["classes"].items():
                for metric in ["ap50", "precision", "recall"]:
                    if value[metric] is not None:
                        samples[f"object/{name}/{metric}"].append(value[metric])
            for risk_id, value in risk.items():
                for metric in ["precision", "recall", "f1", "high_recall"]:
                    if value[metric] is not None:
                        samples[f"risk/{risk_id}/{metric}"].append(value[metric])

    def interval(key):
        values = samples[key]
        return {"lower": percentile(values, .025), "upper": percentile(values, .975), "valid_replicates": len(values)} if values else None

    detections["map50_ci95"] = interval("map50")
    for name, value in detections["classes"].items():
        value["ci95"] = {metric: interval(f"object/{name}/{metric}") for metric in ["ap50", "precision", "recall"]}
    for risk_id, value in risks.items():
        value["ci95"] = {metric: interval(f"risk/{risk_id}/{metric}") for metric in ["precision", "recall", "f1", "high_recall"]}
    return {"images": len(examples), "groups": len(keys), "inference_failures": sum(example["prediction"].get("status") != "success" for example in examples),
            "detection": detections, "risk": risks, "bootstrap": {"unit": "group", "iterations": bootstrap, "seed": seed,
            "confidence": .95, "warning": "Fewer than two groups; CI unavailable" if len(keys) < 2 else None}}
