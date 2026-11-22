"""Plan grouped stratified splits; freeze only a fully scene-reviewed dataset."""
from __future__ import annotations

import argparse
import csv
import html
import json
import random
import re
import tempfile
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import unquote, urlsplit, urlunsplit

from dataset_common import DEFAULT_RAW, DEFAULT_REVIEW, ROOT, sha256_file, utc_now, write_csv, write_json
from stage2_common import (STAGE2, SPLITS, PipelineBlocked, digest, fingerprint,
                           load_definitions, load_frozen, load_taxonomy, reviewed_inputs)


def author_key(value):
    text = html.unescape(re.sub(r"<[^>]*>", " ", value))
    text = " ".join(unicodedata.normalize("NFKC", text).casefold().split())
    if not text or re.search(r"\b(unknown|anonymous|unidentified|not specified|various authors)\b", text):
        return ""
    return "" if text in {"own work", "self", "n/a", "na", "none", "-"} else text


def source_key(value):
    parts = urlsplit(value.strip())
    if parts.scheme not in {"http", "https"} or not parts.hostname:
        return ""
    path = unicodedata.normalize("NFKC", unquote(parts.path)).replace("_", " ").rstrip("/").casefold()
    return urlunsplit(("https", parts.hostname.casefold(), path, "", ""))


def build_groups(rows, audit_by_id, near_distance=4, overrides=None):
    """Connect all raw rows, including excluded rows which can bridge related images."""
    parent = {row["image_id"]: row["image_id"] for row in rows}
    edges = []

    def find(key):
        while parent[key] != key:
            parent[key] = parent[parent[key]]
            key = parent[key]
        return key

    def connect(left, right, reason):
        a, b = find(left), find(right)
        if a != b:
            parent[max(a, b)] = min(a, b)
        edges.append({"left": left, "right": right, "reason": reason})

    for field, normalizer in [("sha256", lambda value: value.strip().lower()), ("source_page", source_key), ("author", author_key)]:
        first = {}
        for row in sorted(rows, key=lambda item: item["image_id"]):
            key = normalizer(row.get(field, ""))
            if not key:
                continue
            if key in first:
                connect(first[key], row["image_id"], field)
            else:
                first[key] = row["image_id"]
    # Both hash conventions are used conservatively; SHA verifies the exact bytes.
    for kind in ["manifest_dhash", "computed_dhash"]:
        hashes = []
        for row in rows:
            value = row.get("dhash_64", "") if kind == "manifest_dhash" else audit_by_id[row["image_id"]].get("dhash_64", "")
            if re.fullmatch(r"[0-9a-fA-F]{16}", value or ""):
                hashes.append((row["image_id"], int(value, 16)))
        for i, (left, value) in enumerate(hashes):
            for right, other in hashes[i + 1:]:
                if (value ^ other).bit_count() <= near_distance:
                    connect(left, right, kind)
    if overrides and overrides.exists():
        first = {}
        with overrides.open(encoding="utf-8-sig", newline="") as stream:
            for row in csv.DictReader(stream):
                if not row.get("household_group", "").strip():
                    continue
                key = row.get("image_id")
                if key not in parent or not row.get("reviewer", "").strip() or not row.get("evidence", "").strip():
                    raise PipelineBlocked("Manual household groups require known image_id, reviewer and evidence")
                group = row["household_group"].strip()
                if group in first:
                    connect(first[group], key, "manual_household")
                else:
                    first[group] = key
    members = defaultdict(list)
    for key in sorted(parent):
        members[find(key)].append(key)
    group_map = {}
    for group in members.values():
        group_id = "group_" + digest(group)[:16]
        for key in group:
            group_map[key] = group_id
    return group_map, edges


def assign_groups(rows, groups, seed=20261122):
    rooms = sorted({row["room"] for row in rows})
    if set(rooms) != {"bedroom", "bathroom", "hallway"}:
        raise PipelineBlocked("Need eligible images in all three room strata before freezing")
    members = defaultdict(Counter)
    for row in rows:
        members[groups[row["image_id"]]][row["room"]] += 1
    for room in rooms:
        if sum(counts[room] > 0 for counts in members.values()) < 3:
            raise PipelineBlocked(f"{room}: fewer than three independent groups; cannot populate train/val/test without leakage")
    totals = Counter(row["room"] for row in rows)
    targets = {split: {room: totals[room] * ratio for room in rooms} for split, ratio in SPLITS.items()}

    def score(counts, final=False):
        loss = sum(((counts[split][room] - targets[split][room]) / max(1, totals[room])) ** 2
                   for split in SPLITS for room in rooms)
        if final:
            loss += 100 * sum(counts[split][room] == 0 for split in SPLITS for room in rooms)
        return loss

    best = None
    for attempt in range(48):
        rng = random.Random(seed + attempt)
        order = list(sorted(members))
        rng.shuffle(order)
        order.sort(key=lambda key: sum(members[key].values()), reverse=True)
        counts = {split: Counter() for split in SPLITS}
        assignments = {}
        for group in order:
            candidates = []
            for split in SPLITS:
                counts[split].update(members[group])
                candidates.append((score(counts), split))
                counts[split].subtract(members[group])
            # Seeded tie handling; no global random-state dependence.
            rng.shuffle(candidates)
            chosen = min(candidates, key=lambda candidate: candidate[0])[1]
            assignments[group] = chosen
            counts[chosen].update(members[group])
        for _ in range(12):
            changed = False
            for group in order:
                old = assignments[group]
                current = score(counts, True)
                for split in SPLITS:
                    if split == old:
                        continue
                    counts[old].subtract(members[group])
                    counts[split].update(members[group])
                    new = score(counts, True)
                    if new + 1e-12 < current:
                        assignments[group], old, current, changed = split, split, new, True
                    else:
                        counts[split].subtract(members[group])
                        counts[old].update(members[group])
            if not changed:
                break
        candidate = (score(counts, True), assignments, counts)
        if best is None or candidate[0] < best[0]:
            best = candidate
    _, assignments, counts = best
    if any(counts[split][room] == 0 for split in SPLITS for room in rooms):
        raise PipelineBlocked("Group constraints prevented a split with all room strata represented")
    output = [{**row, "dataset_split": assignments[groups[row["image_id"]]], "group_id": groups[row["image_id"]]} for row in rows]
    actual = {split: {room: counts[split][room] for room in rooms} for split in SPLITS}
    return output, {"target_ratios": SPLITS, "actual_counts": actual, "groups": len(members), "group_leakage": 0,
                    "note": "Ratios are approximate under whole-group constraints; never split a group to hit a percentage."}


def run_split(raw, review, output, freeze=False, seed=20261122, near_distance=4, household_groups=None):
    output = output.resolve()
    if output.is_relative_to(raw.resolve()) or output.is_relative_to(review.resolve()):
        raise PipelineBlocked("Processed outputs must be outside raw and review")
    store, state, eligible, excluded = reviewed_inputs(raw, review)
    overrides = household_groups or review / "household_groups.csv"
    config = {"seed": seed, "near_distance": near_distance, "author_policy": "same_non_generic_author",
              "manual_groups_file": str(overrides.resolve()),
              "manual_groups_sha256": sha256_file(overrides) if overrides.exists() else None}
    groups, edges = build_groups(store.rows, store.by_id, near_distance, overrides)
    output.mkdir(parents=True, exist_ok=True)
    group_rows = [{"image_id": row["image_id"], "room": row["room"], "group_id": groups[row["image_id"]],
                   "eligible": str(row["image_id"] not in excluded).lower(), "exclusion": excluded.get(row["image_id"], ""),
                   "author_key": author_key(row.get("author", "")), "source_key": source_key(row.get("source_page", ""))} for row in store.rows]
    write_csv(output / "groups.csv", list(group_rows[0]), group_rows)
    summary = {"status": "plan", "generated_at": utc_now(), "raw_images": len(store.rows), "eligible_images": len(eligible),
               "excluded": dict(Counter(excluded.values())), "groups_all_raw": len(set(groups.values())),
               "group_edges": len(edges), "config": config, "human_group_review_needed": True}
    write_json(output / "group_edges.json", edges)
    if not eligible:
        summary.update(status="blocked", reason="No human-scene-verified and license-eligible images; no split or prelabels created")
        write_json(output / "split_plan.json", summary)
        return summary
    try:
        assigned, allocation = assign_groups(eligible, groups, seed)
    except PipelineBlocked as error:
        summary.update(status="blocked", reason=str(error))
        write_json(output / "split_plan.json", summary)
        return summary
    summary["allocation"] = allocation
    write_json(output / "split_plan.json", summary)
    if not freeze:
        return summary
    if any(decision == "scene_pending" for decision in excluded.values()):
        raise PipelineBlocked("Finish human scene review before freezing membership; pending images remain")
    categories, definitions = load_taxonomy(), load_definitions(raw)
    locked = fingerprint(store, state, config, categories, definitions)
    frozen = output / "frozen"
    if frozen.exists():
        existing, _, _, _ = load_frozen(frozen, raw, review)
        if existing["fingerprint"] != locked:
            raise PipelineBlocked("Frozen dataset already exists with different configuration; test cannot be reshuffled")
        return {**summary, "status": "already_frozen"}
    with tempfile.TemporaryDirectory(prefix="freeze-", dir=output) as temporary:
        staging = Path(temporary)
        write_csv(staging / "manifest.csv", list(assigned[0]), assigned)
        snapshot = {"created_at": utc_now(), "fingerprint": locked, "allocation": allocation,
                    "manifest_sha256": sha256_file(staging / "manifest.csv"),
                    "test_image_ids": sorted(row["image_id"] for row in assigned if row["dataset_split"] == "test"),
                    "test_policy": "Frozen membership; no prompt/hyperparameter tuning on test; prelabels are not ground truth"}
        write_json(staging / "snapshot.json", snapshot)
        write_json(staging / "taxonomy.json", categories)
        write_json(staging / "risk_definitions.json", definitions)
        if digest(store.state()) != locked["review_sha256"]:
            raise PipelineBlocked("Scene review changed during freeze; retry the plan after review settles")
        staging.rename(frozen)
    return {**summary, "status": "frozen", "snapshot": str(frozen / "snapshot.json")}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw", type=Path, default=DEFAULT_RAW)
    parser.add_argument("--review", type=Path, default=DEFAULT_REVIEW)
    parser.add_argument("--output", type=Path, default=STAGE2)
    parser.add_argument("--freeze", action="store_true", help="Write an immutable snapshot after complete human scene review")
    parser.add_argument("--seed", type=int, default=20261122)
    parser.add_argument("--near-distance", type=int, choices=range(0, 65), default=4)
    parser.add_argument("--household-groups", type=Path)
    args = parser.parse_args()
    try:
        result = run_split(args.raw, args.review, args.output, args.freeze, args.seed, args.near_distance, args.household_groups)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        if result["status"] == "blocked":
            raise SystemExit(2)
    except (ValueError, OSError) as error:
        parser.exit(2, f"Stage 2 blocked: {error}\n")
