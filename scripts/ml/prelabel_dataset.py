"""Gemini prelabels for frozen, human-reviewed images; unknown is never an empty negative."""
from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import subprocess
from pathlib import Path

from annotation_contract import prompt_for, response_schema
from dataset_common import DEFAULT_RAW, DEFAULT_REVIEW, ROOT, image_path, sha256_file, utc_now, write_json
from stage2_common import (RISK_IDS, STAGE2, PipelineBlocked, digest, load_frozen,
                           reviewed_inputs, strict_result)

BRIDGE = Path(__file__).with_name("gemini_prelabel.cjs")


def node_transport(request):
    process = subprocess.run(["node", str(BRIDGE)], input=json.dumps(request), text=True, encoding="utf-8",
                             capture_output=True, timeout=80, cwd=ROOT, shell=False)
    if process.returncode:
        # The bridge emits a sanitized code, not API request bodies or secrets.
        try:
            code = json.loads(process.stderr)["error"]
        except (ValueError, KeyError, TypeError):
            code = "BRIDGE_FAILED"
        raise RuntimeError(code)
    return json.loads(process.stdout)


def recipe(categories, definitions, snapshot, model, mode, seed, temperature):
    prompts, schemas = {}, {}
    jobs = [("combined", RISK_IDS, True)] if mode == "combined" else [("objects", [], True), *[(key, [key], False) for key in RISK_IDS]]
    for room in ["bedroom", "bathroom", "hallway"]:
        for name, risks, objects in jobs:
            prompts[room + "/" + name] = prompt_for(categories, definitions, room, risks, objects)
            schemas[name] = response_schema(categories, risks, objects)
    return {"model": model, "mode": mode, "seed": seed, "temperature": temperature,
            "snapshot_sha256": digest(snapshot), "prompts": prompts, "schemas": schemas,
            "bridge_sha256": sha256_file(BRIDGE), "validator_sha256": sha256_file(Path(__file__).with_name("stage2_common.py"))}


def check_cached(record, row, run_id, categories, definitions):
    if record.get("image_id") != row["image_id"] or record.get("image_sha256") != row["sha256"] or record.get("run_id") != run_id or record.get("review_status") != "prelabeled":
        raise PipelineBlocked("Cached prelabel provenance mismatch")
    return strict_result(record["payload"], categories, definitions, row["room"])


def run_prelabels(raw, review, frozen, output, model=None, mode="combined", seed=20261122,
                  temperature=.1, limit=None, include_test=False, dry_run=False, transport=None):
    store, state, eligible, excluded = reviewed_inputs(raw, review)
    if not eligible:
        return {"status": "blocked", "reason": "No human-scene-verified eligible images", "api_calls": 0, "images_completed": 0}
    if not (frozen / "snapshot.json").exists():
        raise PipelineBlocked("No frozen grouped split. Complete scene review and run split_dataset.py --freeze")
    snapshot, rows, categories, definitions = load_frozen(frozen, raw, review)
    if not model and not dry_run:
        raise PipelineBlocked("Select an explicit supported Gemini model via --model or GEMINI_MODEL")
    if mode not in {"combined", "per-risk"} or not 0 <= temperature <= .3 or limit is not None and limit < 1:
        raise ValueError("Invalid mode, low-temperature setting or limit")
    output = output.resolve()
    if any(output.is_relative_to(path.resolve()) for path in [raw, review, frozen]):
        raise PipelineBlocked("Prelabels must be outside raw/review/frozen")
    selected = [row for row in rows if include_test or row["dataset_split"] != "test"]
    if limit is not None:
        selected = selected[:limit]
    settings = recipe(categories, definitions, snapshot, model, mode, seed, temperature)
    run_id = digest(settings)
    report = {"status": "dry_run" if dry_run else "running", "run_id": run_id, "images_selected": len(selected),
              "expected_calls_without_cache": len(selected) * (1 if mode == "combined" else 9),
              "api_calls": 0, "images_completed": 0, "cache_hits": 0, "failures": [], "includes_test": include_test}
    if dry_run:
        return report
    if transport is None and not os.environ.get("GEMINI_API_KEY"):
        raise PipelineBlocked("GEMINI_API_KEY is missing from process environment; no API calls made")
    if transport is None:
        probe = subprocess.run(["node", "-e", "import('@google/genai').then(()=>process.exit(0)).catch(()=>process.exit(1))"],
                               capture_output=True, timeout=15, cwd=ROOT, shell=False)
        if probe.returncode:
            raise PipelineBlocked("Declared @google/genai dependency is not installed; install project dependencies before live inference")
    transport = transport or node_transport
    # Persist a test prompt/config lock BEFORE any test image request, across all output runs.
    if any(row["dataset_split"] == "test" for row in selected):
        lock = frozen.parent / "test_prelabel_lock.json"
        if lock.exists():
            if json.loads(lock.read_text(encoding="utf-8"))["run_id"] != run_id:
                raise PipelineBlocked("Test prelabel configuration is locked; cannot tune or switch models/prompts")
        else:
            with lock.open("x", encoding="utf-8") as stream:
                json.dump({"run_id": run_id, "created_at": utc_now(), "policy": "Only resume the identical prelabel configuration; never tune on test"}, stream)
    run_dir = output / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    write_json(run_dir / "run_config.json", settings)
    for row in selected:
        key = row["image_id"]
        # IDs never become paths: names are derived from a hash of the ID.
        destination = run_dir / (digest(key) + ".json")
        if destination.exists():
            check_cached(json.loads(destination.read_text(encoding="utf-8")), row, run_id, categories, definitions)
            report["cache_hits"] += 1
            continue
        if sha256_file(image_path(raw, row["file"])) != row["sha256"].strip().lower():
            raise PipelineBlocked("Image changed before inference")
        image_data = base64.b64encode(image_path(raw, row["file"]).read_bytes()).decode("ascii")
        jobs = ["combined"] if mode == "combined" else ["objects", *RISK_IDS]
        combined, responses = {}, []
        try:
            for job in jobs:
                request = {"model": model, "prompt": settings["prompts"][row["room"] + "/" + job],
                           "schema": settings["schemas"][job], "seed": seed, "temperature": temperature,
                           "mimeType": mimetypes.guess_type(row["file"])[0] or "image/jpeg", "imageBase64": image_data}
                report["api_calls"] += 1
                response = transport(request)
                payload = response["payload"]
                expected_fields = {"objects", "risks"} if job == "combined" else {"objects"} if job == "objects" else {"risks"}
                if not isinstance(payload, dict) or set(payload) != expected_fields:
                    raise ValueError("Wrong top-level fields from model")
                if job.startswith("RISK-") and set(payload["risks"]) != {job}:
                    raise ValueError("Per-risk response must contain only the requested risk")
                if "objects" in payload:
                    combined["objects"] = payload["objects"]
                if "risks" in payload:
                    combined.setdefault("risks", {}).update(payload["risks"])
                responses.append({"job": job, "model_version": response.get("modelVersion", model), "usage": response.get("usageMetadata")})
            strict_result(combined, categories, definitions, row["room"])
            record = {"image_id": key, "image_sha256": row["sha256"], "split": row["dataset_split"],
                      "run_id": run_id, "review_status": "prelabeled", "created_at": utc_now(),
                      "responses": responses, "payload": combined}
            write_json(destination, record)
            report["images_completed"] += 1
        except (ValueError, RuntimeError, KeyError, TypeError, subprocess.TimeoutExpired) as error:
            # Keep only a sanitized error type/code; never replace failed calls with negatives.
            safe_code = str(error) if isinstance(error, RuntimeError) and str(error) in {"MISSING_API_KEY", "SDK_NOT_INSTALLED", "EMPTY_BLOCKED_OR_TRUNCATED", "API_OR_JSON_ERROR", "BRIDGE_FAILED"} else type(error).__name__
            report["failures"].append({"image_id": key, "error": safe_code})
        write_json(run_dir / "run_report.json", report)
        print(json.dumps({"image_id": key, "completed": report["images_completed"], "api_calls": report["api_calls"], "failures": len(report["failures"])}), flush=True)
    report["status"] = "completed" if not report["failures"] else "incomplete"
    write_json(run_dir / "run_report.json", report)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw", type=Path, default=DEFAULT_RAW)
    parser.add_argument("--review", type=Path, default=DEFAULT_REVIEW)
    parser.add_argument("--frozen", type=Path, default=STAGE2 / "frozen")
    parser.add_argument("--output", type=Path, default=STAGE2 / "prelabels")
    parser.add_argument("--model", default=os.environ.get("GEMINI_MODEL"))
    parser.add_argument("--mode", choices=["combined", "per-risk"], default="combined")
    parser.add_argument("--seed", type=int, default=20261122)
    parser.add_argument("--temperature", type=float, default=.1)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--include-test", action="store_true", help="Lock config and prelabel held-out test; prefer independent blind manual labeling")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    try:
        result = run_prelabels(args.raw, args.review, args.frozen, args.output, args.model, args.mode,
                              args.seed, args.temperature, args.limit, args.include_test, args.dry_run)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        if result["status"] in {"blocked", "incomplete"}:
            raise SystemExit(2)
    except (ValueError, OSError) as error:
        parser.exit(2, f"Prelabel blocked: {error}\n")
