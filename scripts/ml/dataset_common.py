"""Local dataset helpers. Raw metadata and risk labels are never rewritten."""
from __future__ import annotations

import csv
import hashlib
import io
import json
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_RAW = ROOT / "data/raw"
DEFAULT_REVIEW = ROOT / "data/review"
TARGETS = {"bedroom": 175, "bathroom": 175, "hallway": 150}


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def sha256_file(path):
    with Path(path).open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def image_path(raw, name):
    # Reject absolute paths, Windows drives, backslashes, traversal and symlinks
    # outside raw, including when these tools are used on another OS.
    if not name or "\\" in name or ":" in name:
        raise ValueError("Invalid relative image path")
    relative = Path(name)
    resolved = (raw / relative).resolve()
    if relative.is_absolute() or ".." in relative.parts or not resolved.is_relative_to(raw.resolve()):
        raise ValueError("Image path escapes raw dataset")
    if relative.parts[0] != "images" or relative.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise ValueError("Expected an image inside images/")
    return resolved


def load_manifest(raw):
    with (raw / "manifest.csv").open(encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        fields = reader.fieldnames
        required = {"image_id", "file", "room", "license_short", "license_url", "author", "attribution",
                    "sha256", "dhash_64", "human_scene_verified", "human_risk_verified", "dataset_split"}
        if not fields or not required.issubset(fields):
            raise ValueError("Manifest is missing required columns")
        rows = list(reader)
    ids = [row["image_id"] for row in rows]
    if not rows or len(ids) != len(set(ids)) or any(not key.strip() for key in ids):
        raise ValueError("Manifest must have nonempty, unique image IDs")
    for row in rows:
        image_path(raw, row["file"])
    return fields, rows


def atomic_text(path, text):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    name = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", newline="", dir=path.parent,
                                         prefix=".tmp-", delete=False) as stream:
            name = stream.name
            stream.write(text)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(name, path)
    finally:
        if name and Path(name).exists():
            Path(name).unlink()


def write_json(path, obj):
    atomic_text(path, json.dumps(obj, ensure_ascii=False, indent=2) + "\n")


def write_csv(path, fields, rows):
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=fields)
    writer.writeheader()
    writer.writerows(rows)
    atomic_text(path, stream.getvalue())


def license_status(row):
    """Conservative metadata gate, not legal approval. Never invent license URLs."""
    short = row["license_short"].strip()
    url = urlparse(row["license_url"].strip())
    if url.scheme not in {"http", "https"} or url.hostname not in {"creativecommons.org", "www.creativecommons.org"}:
        return "needs_license_review"
    path = re.sub(r"/deed(?:\.[a-z_-]+)?$", "", url.path.lower().rstrip("/"))
    cc = re.fullmatch(r"CC (BY(?:-SA)?) (2\.0|2\.5|3\.0|4\.0)(?: ([a-z]{2}))?", short)
    if cc:
        kind, version, jurisdiction = cc.groups()
        expected = f"/licenses/{kind.lower()}/{version}" + (f"/{jurisdiction}" if jurisdiction else "")
        if path != expected or not row["author"].strip():
            return "needs_license_review"
        return "metadata_complete"
    if short == "CC0" and path == "/publicdomain/zero/1.0":
        return "metadata_complete"
    if short == "Public domain" and path == "/publicdomain/mark/1.0":
        return "metadata_complete"
    return "needs_license_review"


def empty_review(manifest_hash):
    return {"manifest_sha256": manifest_hash, "revision": 0, "decisions": {}, "history": []}


def load_review(review_dir, manifest_hash, valid_ids):
    path = review_dir / "decisions.json"
    state = json.loads(path.read_text(encoding="utf-8")) if path.exists() else empty_review(manifest_hash)
    if state.get("manifest_sha256") != manifest_hash:
        raise ValueError("Review belongs to a different manifest; refusing to mix datasets")
    if set(state["decisions"]) - set(valid_ids):
        raise ValueError("Review contains unknown image IDs")
    for decision in state["decisions"].values():
        if decision.get("decision") not in {"keep", "reject", "replace"}:
            raise ValueError("Invalid saved review decision")
    return state


def working_rows(rows, state, audit_by_id):
    result = []
    for source in rows:
        row = dict(source)
        decision = state["decisions"].get(row["image_id"], {})
        action = decision.get("decision", "pending")
        # Only explicit human Keep is true. Blank stays unknown, never an automatic negative.
        row["human_scene_verified"] = "true" if action == "keep" else "false" if action in {"reject", "replace"} else ""
        row.update(scene_review_decision=action, scene_reviewer=decision.get("reviewer", ""),
                   scene_reviewed_at=decision.get("at", ""), scene_review_note=decision.get("note", ""))
        audit = audit_by_id[row["image_id"]]
        eligible = action == "keep" and audit["image_ok"] and audit["integrity_ok"] and audit["license_status"] == "metadata_complete"
        row["candidate_eligible"] = str(eligible).lower()
        result.append(row)
    return result


def room_counts(rows, state, audit_by_id, targets=None):
    output = {}
    for room, target in (targets or TARGETS).items():
        subset = [row for row in working_rows(rows, state, audit_by_id) if row["room"] == room]
        counts = {action: sum(row["scene_review_decision"] == action for row in subset)
                  for action in ["pending", "keep", "reject", "replace"]}
        eligible = sum(row["candidate_eligible"] == "true" for row in subset)
        output[room] = {"target": target, "total": len(subset), **counts, "eligible_candidates": eligible,
                        "shortfall_confirmed_now": max(0, target - eligible),
                        "minimum_replacements_after_decisions": max(0, target - counts["pending"] - counts["keep"])}
    return output
