"""Shared contracts and fail-closed gates for reviewed-only stage 2 tooling."""
from __future__ import annotations

import csv
import hashlib
import json
import math
import re

from dataset_common import ROOT, image_path, license_status, sha256_file
from review_dataset import ReviewStore

STAGE2 = ROOT / "data/processed/stage2"
RISK_IDS = [f"RISK-{i:03}" for i in range(1, 9)]
SPLITS = {"train": .70, "val": .15, "test": .15}


class PipelineBlocked(ValueError):
    pass


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def load_taxonomy():
    path = ROOT / "src/lib/vision/taxonomy.ts"
    source = path.read_text(encoding="utf-8").split("export const CATEGORY_TAXONOMY", 1)[1].split("\n};", 1)[0]
    entries = re.findall(r'^  (\w+): \{\s*category: "([^"]+)",\s*vietnameseName: "([^"]+)",\s*description: "([^"]+)",', source, re.M)
    categories = [{"id": i, "name": key, "vietnamese_name": vi, "definition": definition}
                  for i, (key, category, vi, definition) in enumerate(entries, 1) if key == category]
    if len(categories) != 18 or len({entry["name"] for entry in categories}) != 18:
        raise PipelineBlocked("Expected 18 defined taxonomy classes; refusing to invent missing classes")
    return categories


def load_definitions(raw):
    with (raw / "risk_definitions_FROM_REPO.csv").open(encoding="utf-8-sig", newline="") as stream:
        definitions = list(csv.DictReader(stream))
    if {row["risk_id"] for row in definitions} != set(RISK_IDS) or len(definitions) != 8:
        raise PipelineBlocked("Expected exactly eight risk definitions")
    registry = (ROOT / "src/lib/risk/riskRuleRegistry.ts").read_text(encoding="utf-8")
    for row in definitions:
        rule = row["risk_id"][-3:]
        match = re.search(r"export const ruleRisk" + rule + r"\b.*?applicableRoomTypes: \[([^]]+)\]", registry, re.S)
        if not match:
            raise PipelineBlocked("Cannot read risk applicability from registry")
        row["registry_rooms"] = [room.lower() for room in re.findall(r'"([A-Z_]+)"', match[1])]
        row["csv_rooms"] = row["applies_to_rooms"].split("|")
    return definitions


def reviewed_inputs(raw, review):
    store = ReviewStore(raw, review)
    state = store.state()
    eligible, excluded = [], {}
    for original in store.rows:
        row = dict(original)
        decision = state["decisions"].get(row["image_id"], {})
        if decision.get("decision") != "keep":
            excluded[row["image_id"]] = "scene_" + decision.get("decision", "pending")
            continue
        if not decision.get("reviewer", "").strip() or not decision.get("at"):
            raise PipelineBlocked("Keep decision lacks reviewer or timestamp")
        if row["room"] not in {"bedroom", "bathroom", "hallway"}:
            raise PipelineBlocked("Unexpected room type in reviewed input")
        if license_status(row) != "metadata_complete":
            excluded[row["image_id"]] = "license_metadata_needs_review"
            continue
        item = store.by_id[row["image_id"]]
        if not item["image_ok"] or not item["integrity_ok"]:
            raise PipelineBlocked("Kept image failed audit integrity; audit again")
        if sha256_file(image_path(store.raw, row["file"])) != row["sha256"].strip().lower():
            raise PipelineBlocked("Kept image bytes changed since import")
        row.update(human_scene_verified="true", scene_review_decision="keep",
                   scene_reviewer=decision["reviewer"], scene_reviewed_at=decision["at"])
        eligible.append(row)
    return store, state, eligible, excluded


def fingerprint(store, state, grouping_config, categories, definitions):
    return {"raw_manifest_sha256": store.manifest_hash, "review_sha256": digest(state),
            "grouping": grouping_config, "taxonomy_sha256": digest(categories),
            "definitions_sha256": digest(definitions),
            "registry_sha256": sha256_file(ROOT / "src/lib/risk/riskRuleRegistry.ts")}


def load_frozen(frozen, raw, review):
    snapshot = json.loads((frozen / "snapshot.json").read_text(encoding="utf-8"))
    store, state, eligible, excluded = reviewed_inputs(raw, review)
    categories, definitions = load_taxonomy(), load_definitions(raw)
    grouping = snapshot["fingerprint"]["grouping"]
    if grouping.get("manual_groups_file"):
        from pathlib import Path
        manual = Path(grouping["manual_groups_file"])
        actual = sha256_file(manual) if manual.exists() else None
        if actual != grouping.get("manual_groups_sha256"):
            raise PipelineBlocked("Manual household groups changed after test was frozen")
    current = fingerprint(store, state, snapshot["fingerprint"]["grouping"], categories, definitions)
    if current != snapshot["fingerprint"]:
        raise PipelineBlocked("Frozen snapshot no longer matches review/taxonomy/rules; do not reshuffle test")
    manifest_path = frozen / "manifest.csv"
    if sha256_file(manifest_path) != snapshot["manifest_sha256"]:
        raise PipelineBlocked("Frozen manifest was modified")
    with manifest_path.open(encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream))
    expected = {row["image_id"] for row in eligible}
    if {row["image_id"] for row in rows} != expected:
        raise PipelineBlocked("Frozen membership does not match reviewed eligible images")
    assignments = {}
    for row in rows:
        if row["human_scene_verified"] != "true" or row["dataset_split"] not in SPLITS:
            raise PipelineBlocked("Frozen manifest contains unverified image or invalid split")
        group = row["group_id"]
        if group in assignments and assignments[group] != row["dataset_split"]:
            raise PipelineBlocked("Group leakage detected in frozen manifest")
        assignments[group] = row["dataset_split"]
    return snapshot, rows, categories, definitions


def tri(value):
    if value is True or value == "1" or type(value) is int and value == 1:
        return True
    if value is False or value == "0" or type(value) is int and value == 0:
        return False
    if value is None or isinstance(value, str) and value.strip().lower() in {"", "unknown", "unlabeled"}:
        return "unknown"
    raise ValueError("Risk label must be true/false/unknown or 1/0; blank stays unknown")


def strict_result(payload, categories, definitions, room):
    """Validate model JSON without inventing values, clamping boxes or empty negatives."""
    if not isinstance(payload, dict) or set(payload) != {"objects", "risks"}:
        raise ValueError("Expected objects and risks only")
    names = {entry["name"] for entry in categories}
    objects = payload["objects"]
    if not isinstance(objects, list) or len(objects) > 200:
        raise ValueError("Invalid object array")
    for obj in objects:
        if not isinstance(obj, dict) or set(obj) != {"category", "bbox", "confidence", "evidence"} or obj["category"] not in names:
            raise ValueError("Invalid object/category")
        box = obj["bbox"]
        if not isinstance(box, dict) or set(box) != {"xMin", "yMin", "xMax", "yMax"}:
            raise ValueError("Invalid bbox fields")
        values = [box[key] for key in ["xMin", "yMin", "xMax", "yMax"]]
        if any(type(v) not in {int, float} or not math.isfinite(v) or not 0 <= v <= 1 for v in values):
            raise ValueError("Bbox must be finite normalized 0..1 values")
        if box["xMin"] >= box["xMax"] or box["yMin"] >= box["yMax"]:
            raise ValueError("Degenerate or reversed bbox")
        confidence = obj["confidence"]
        if type(confidence) not in {float, int} or not math.isfinite(confidence) or not 0 <= confidence <= 1:
            raise ValueError("Invalid object confidence")
        if not isinstance(obj["evidence"], str) or not obj["evidence"].strip():
            raise ValueError("Object requires visible evidence")
    risks = payload["risks"]
    if not isinstance(risks, dict) or set(risks) != set(RISK_IDS):
        raise ValueError("Exactly eight risk results required")
    by_id = {row["risk_id"]: row for row in definitions}
    for risk_id, risk in risks.items():
        if not isinstance(risk, dict) or set(risk) != {"present", "visible", "applicable", "severity", "evidence"}:
            raise ValueError("Invalid risk fields")
        for key in ["present", "visible"]:
            if risk[key] is not True and risk[key] is not False and risk[key] != "unknown":
                raise ValueError("Risk fields must be booleans or literal unknown")
        if type(risk["applicable"]) is not bool or risk["applicable"] != (room in by_id[risk_id]["registry_rooms"]):
            raise ValueError("Risk applicability must match the current registry")
        if risk["severity"] not in {"HIGH", "MEDIUM", "LOW", "UNKNOWN"}:
            raise ValueError("Invalid risk severity")
        if not isinstance(risk["evidence"], str) or not risk["evidence"].strip():
            raise ValueError("Each risk needs evidence or an explanation of unknown")
        if (risk["visible"] is not True or not risk["applicable"]) and risk["present"] != "unknown":
            raise ValueError("Unobservable or nonapplicable risks must stay unknown")
        if risk["present"] == "unknown" and risk["severity"] != "UNKNOWN":
            raise ValueError("Unknown risk cannot have a definite severity")
        if risk_id in {"RISK-003", "RISK-004", "RISK-005", "RISK-007", "RISK-008"} and risk["present"] != "unknown":
            raise ValueError("Single uncalibrated photo cannot establish measured/nighttime/reachability risk")
    return payload
