"""Plan AI-reviewed candidates separately; never creates verified labels or freezes test."""
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

from dataset_common import (DEFAULT_RAW, DEFAULT_REVIEW, ROOT, image_path, license_status,
                            sha256_file, utc_now, write_csv, write_json)
from review_dataset import ReviewStore
from split_dataset import assign_groups, build_groups
from stage2_common import PipelineBlocked, digest

OUTPUT = ROOT / "data/processed/stage4/ai_candidate_plan"


def prepare(raw=DEFAULT_RAW, review=DEFAULT_REVIEW, ai_path=None, output=OUTPUT, seed=20261122):
    ai_path = ai_path or review / "ai_scene/review.json"
    if any(output.resolve().is_relative_to(path.resolve()) for path in [raw, review]) or output.resolve() == ai_path.resolve():
        raise PipelineBlocked("Candidate plan must stay outside raw and review sources")
    store = ReviewStore(raw, review)
    proposals = json.loads(ai_path.read_text(encoding="utf-8"))
    records = proposals.get("images", [])
    ids = [record["image_id"] for record in records]
    if (proposals.get("review_source") != "AI_visual_review" or proposals.get("manifest_sha256") != store.manifest_hash or
            len(ids) != len(set(ids)) or set(ids) != set(store.rows_by_id)):
        raise PipelineBlocked("AI proposals must cover the complete original manifest with matching provenance")
    selected, exclusions = [], Counter()
    for record in records:
        key = record["image_id"]
        row = store.rows_by_id[key]
        if record.get("review_status") != "ai_reviewed_proposal" or not record.get("ai_scene_reviewed"):
            raise PipelineBlocked("AI proposals have an unexpected review status")
        if record.get("decision") not in {"keep", "reject", "needs_review"}:
            raise PipelineBlocked("Unknown AI review decision")
        if record.get("image_sha256") != row["sha256"]:
            raise PipelineBlocked("AI proposal image identity changed")
        if record["decision"] != "keep":
            exclusions["ai_" + record["decision"]] += 1
            continue
        if license_status(row) != "metadata_complete":
            exclusions["license_metadata_needs_review"] += 1
            continue
        if record.get("observed_room") != row["room"]:
            raise PipelineBlocked("AI keep must match the requested room")
        item = store.by_id[key]
        if not item["image_ok"] or not item["integrity_ok"] or sha256_file(image_path(raw, row["file"])) != row["sha256"]:
            raise PipelineBlocked("AI-kept candidate failed image integrity checks")
        selected.append({**row, "ai_scene_reviewed": "true", "ai_review_note": record["note"],
                         "candidate_status": "ai_only_not_verified"})
    manual_groups = review / "household_groups.csv"
    groups, edges = build_groups(store.rows, store.by_id, overrides=manual_groups)
    group_counts = {room: len({groups[row["image_id"]] for row in selected if row["room"] == room})
                    for room in ["bedroom", "bathroom", "hallway"]}
    report = {"created_at": utc_now(), "status": "planning_only", "candidate_images": len(selected),
        "candidate_rooms": dict(Counter(row["room"] for row in selected)), "excluded": dict(exclusions),
        "independent_groups_per_room": group_counts, "groups_in_candidates": len({groups[row["image_id"]] for row in selected}),
        "groups_all_raw": len(set(groups.values())), "seed": seed,
        "raw_manifest_sha256": store.manifest_hash, "ai_review_sha256": sha256_file(ai_path),
        "manual_groups_sha256": sha256_file(manual_groups) if manual_groups.exists() else None,
        "human_review_revision_seen": store.state()["revision"],
        "human_verification_created": False, "ground_truth_created": False, "official_test_frozen": False,
        "inference_calls": 0, "metric_status": "not_evaluated_no_ground_truth", "blockers": []}
    try:
        assigned, allocation = assign_groups(selected, groups, seed)
        report["proposed_allocation"] = allocation
    except PipelineBlocked as error:
        assigned = [{**row, "group_id": groups[row["image_id"]]} for row in selected]
        report["blockers"].append(str(error))
    exported = []
    for row in assigned:
        original = store.rows_by_id[row["image_id"]]
        proposed = row.get("dataset_split") if "proposed_allocation" in report else "unassigned"
        exported.append({**row, "dataset_split": original["dataset_split"], "proposed_split": proposed,
                         "human_scene_verified": original["human_scene_verified"],
                         "human_risk_verified": original["human_risk_verified"]})
    output.mkdir(parents=True, exist_ok=True)
    if exported:
        write_csv(output / "candidate_manifest.csv", list(exported[0]), exported)
    write_json(output / "group_edges.json", edges)
    report["plan_sha256"] = digest({key: value for key, value in report.items() if key != "created_at"})
    write_json(output / "candidate_plan.json", report)
    return report


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw", type=Path, default=DEFAULT_RAW)
    parser.add_argument("--review", type=Path, default=DEFAULT_REVIEW)
    parser.add_argument("--ai-review", type=Path)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--seed", type=int, default=20261122)
    args = parser.parse_args()
    try:
        print(json.dumps(prepare(args.raw, args.review, args.ai_review, args.output, args.seed), ensure_ascii=False, indent=2))
    except (OSError, ValueError, KeyError, TypeError) as error:
        parser.exit(2, "Candidate preparation blocked: " + type(error).__name__ + "\n")
