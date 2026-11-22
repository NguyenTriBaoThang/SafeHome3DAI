"""Explicit AI-reference exploration; never creates human verification or official metrics."""
from __future__ import annotations

import argparse
import csv
import importlib.metadata
import json
import os
from collections import Counter
from pathlib import Path

from annotation_contract import prompt_for
from baseline_report import fmt, table
from dataset_common import DEFAULT_RAW, ROOT, atomic_text, image_path, sha256_file, utc_now, write_json
from experiment_stage4 import (CODE, PLAN, Predictor, exclusive_job, exemplars, image_input,
                               read_plan, run_experiment, seal, unseal)
from owlv2_detector import MODEL, REVISION, VERSIONS
from stage2_common import PipelineBlocked, RISK_IDS, digest, load_definitions, load_taxonomy, strict_result

HOME = ROOT / "data/processed/stage4/exploratory"
CANDIDATES = ROOT / "data/processed/stage4/ai_candidate_plan"
NOTES = ROOT / "data/annotations/ai_reference/stage4_visual_notes.json"
REPORTS = ROOT / "reports/stage4_exploratory"
DISCLAIMER = "NHAN AI - THAM DO; CHUA PHAI DO CHINH XAC CHINH THUC / AI-reference agreement, not human-verified accuracy"
POLICY = ("All eight predeclared experiments, same complete val membership; failures remain misses. "
          "Only zero-failure configurations eligible. If val has HIGH positives: HIGH recall, risk recall, risk F1, "
          "mAP50, risk precision. Otherwise: mAP50 only; HIGH/risk efficacy unassessed. "
          "Lexicographic ascending experiment id breaks exact ties. One locked winner on exploratory test once.")
MEASURED = {"RISK-003", "RISK-004", "RISK-005", "RISK-007", "RISK-008"}


def candidate_rows(directory=CANDIDATES):
    with (directory / "candidate_manifest.csv").open(encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))
    ids, groups = set(), {}
    for row in rows:
        key, split, group = row["image_id"], row["proposed_split"], row["group_id"]
        if key in ids or split not in {"train", "val", "test"} or not group:
            raise PipelineBlocked("Invalid exploratory candidate membership")
        if group in groups and groups[group] != split:
            raise PipelineBlocked("Exploratory group leakage")
        if row["candidate_status"] != "ai_only_not_verified" or row["dataset_split"] != "evaluation":
            raise PipelineBlocked("Exploration requires unchanged raw split and explicit AI status")
        if row["human_scene_verified"].strip() or row["human_risk_verified"].strip():
            raise PipelineBlocked("AI candidates must not acquire human verification flags")
        ids.add(key)
        groups[group] = split
        row["dataset_split"] = split  # In-memory experimental assignment only.
    if not rows or {row["dataset_split"] for row in rows} != {"train", "val", "test"}:
        raise PipelineBlocked("All three exploratory splits required")
    return rows


def reference(row, note, categories, definitions, raw=DEFAULT_RAW):
    from PIL import Image
    with Image.open(image_path(raw, row["file"])) as photo:
        width, height = photo.size
    objects = []
    for category, x1, y1, x2, y2 in note["objects"]:
        objects.append({"category": category, "bbox": dict(zip(["xMin", "yMin", "xMax", "yMax"],
            [x1 / width, y1 / height, x2 / width, y2 / height])), "confidence": 1,
            "evidence": "AI visual reference rectangle; not human verified"})
    risks = {}
    known = note.get("known", {})
    if not set(known).issubset(RISK_IDS) or set(known) & MEASURED:
        raise ValueError("AI visual references cannot establish measured risks")
    for definition in definitions:
        key = definition["risk_id"]
        applicable = row["room"] in definition["registry_rooms"]
        present = known.get(key, "unknown") if applicable else "unknown"
        risks[key] = {"present": present, "visible": True if key in known and applicable else "unknown",
            "applicable": applicable, "severity": "HIGH" if present is True else "UNKNOWN",
            "evidence": ("Not applicable under unchanged registry. " if not applicable else
                "Uncalibrated single image cannot establish measurement/nighttime/reach. " if key in MEASURED else
                "Assessment limited to visible region; occlusion/fastening/support uncertainty retained. ") + note["note"]}
    payload = strict_result({"objects": objects, "risks": risks}, categories, definitions, row["room"])
    return {"image_id": row["image_id"], "image_sha256": row["sha256"], "split": row["dataset_split"],
        "review_status": "ai_reference_not_human_verified", "human_verified": False,
        "source": "Codex_visual_review", "note": note["note"], **payload}


class AIPredictor(Predictor):
    def predict(self, row, experiment):
        if experiment["strategy"] != "few_shot":
            return super().predict(row, experiment)
        shots = []
        for key in self.config["exemplars"]:
            example, record = self.rows[key], self.truth[key]
            if example["dataset_split"] != "train" or example["group_id"] == row["group_id"]:
                raise PipelineBlocked("AI few-shot leakage")
            answer = strict_result({"objects": record["objects"], "risks": record["risks"]},
                                   self.categories, self.definitions, example["room"])
            shots.append({**image_input(self.raw, example), "split": "train", "imageId": key,
                "prompt": prompt_for(self.categories, self.definitions, example["room"]) +
                    "\nExample labels are AI references, not human verified.", "answer": answer})
        payload = strict_result(self.call(row, RISK_IDS, True, shots), self.categories, self.definitions, row["room"])
        return {"status": "success", "objects": [obj for obj in payload["objects"] if obj["confidence"] >= experiment["object_threshold"]],
            "risks": payload["risks"], "risk_supported": True, "model_used": self.config["model"]}


def choose(results, experiments):
    if set(results) != {item["id"] for item in experiments}:
        return None, "comparison_incomplete"
    eligible = [key for key in sorted(results) if results[key]["status"] == "completed"]
    if not eligible:
        return None, "no_zero_failure_configuration"
    high = results[eligible[0]]["summary"]["high_positive"]
    keys = ["high_recall", "risk_recall", "risk_f1", "map50", "risk_precision"] if high else ["map50"]
    eligible = [key for key in eligible if results[key]["summary"].get(keys[0]) is not None]
    if not eligible:
        return None, "no_supported_selection_metric"
    winner = max(eligible, key=lambda key: tuple(results[key]["summary"].get(metric)
        if results[key]["summary"].get(metric) is not None else -1 for metric in keys))
    return winner, "high_recall_first" if high else "objects_only_no_HIGH_positive_reference"


def prepare(model, home=HOME):
    if not model:
        raise PipelineBlocked("Explicit configured Gemini model required")
    rows, plan = candidate_rows(), read_plan(PLAN)
    categories, definitions = load_taxonomy(), load_definitions(DEFAULT_RAW)
    notes = json.loads(NOTES.read_text(encoding="utf-8"))
    if notes.get("source") != "Codex_visual_review" or notes.get("review_status") != "ai_reference_not_human_verified":
        raise PipelineBlocked("AI reference provenance missing")
    shots = exemplars(rows, notes["images"], plan["seed"])
    needed = {row["image_id"] for row in rows if row["dataset_split"] != "train"} | set(shots)
    if set(notes["images"]) != needed:
        raise PipelineBlocked("References must cover complete val/test and preselected train exemplars only")
    for row in rows:
        if sha256_file(image_path(DEFAULT_RAW, row["file"])) != row["sha256"]:
            raise PipelineBlocked("Candidate image checksum mismatch")
    refs = {split: [reference(row, notes["images"][row["image_id"]], categories, definitions)
        for row in rows if row["dataset_split"] == split and row["image_id"] in needed] for split in ["train", "val", "test"]}
    runtime = {name: importlib.metadata.version(name) for name in VERSIONS}
    sdk = ROOT / "node_modules/@google/genai/package.json"
    runtime["@google/genai"] = json.loads(sdk.read_text(encoding="utf-8"))["version"]
    sources = sorted(set(CODE + ["scripts/ml/explore_stage4.py", "scripts/ml/baseline_report.py"]))
    config = {"mode": "AI_REFERENCE_EXPLORATORY", "disclaimer": DISCLAIMER, "model": model,
        "plan": plan, "selection_policy": POLICY, "exemplars": shots, "reference_source": notes["source"],
        "candidate_manifest_sha256": sha256_file(CANDIDATES / "candidate_manifest.csv"),
        "candidate_plan_sha256": sha256_file(CANDIDATES / "candidate_plan.json"),
        "visual_notes_sha256": sha256_file(NOTES), "reference_sha256": {split: digest(value) for split, value in refs.items()},
        "source_sha256": {name: sha256_file(ROOT / name) for name in sources}, "runtime": runtime,
        "detector": {"model": MODEL, "revision": REVISION, "device": "cpu", "cpu_threads": 2},
        "scored_classes": [entry["name"] for entry in categories if entry["name"] != "other"],
        "unscored_classes": {"other": "Open-ended class not exhaustively annotated; omitted, not a negative class"},
        "baseline_generation": "Unchanged adapter/provider-default sampling, unseeded, timeout 3500ms",
        "raw_manifest_sha256": sha256_file(DEFAULT_RAW / "manifest.csv"),
        "human_decisions_sha256": sha256_file(ROOT / "data/review/decisions.json"),
        "official_accuracy": False, "human_verification_created": False}
    config_id = digest(config)
    home.mkdir(parents=True, exist_ok=True)
    protocol_path = home / "protocol.json"
    if protocol_path.exists():
        protocol = unseal(protocol_path)
        if protocol["config_id"] != config_id or protocol["config"] != config:
            raise PipelineBlocked("Exploratory protocol changed after sealing; do not retune or replace frozen artifacts")
    else:
        for split, values in refs.items():
            write_json(home / ("references_" + split + ".json"), seal({"mode": "AI_REFERENCE_EXPLORATORY", "images": values}))
        write_json(protocol_path, seal({"created_at": utc_now(), "config_id": config_id, "config": config,
            "reference_files_sha256": {split: sha256_file(home / ("references_" + split + ".json")) for split in refs},
            "membership": [{key: row[key] for key in ["image_id", "dataset_split", "group_id", "sha256"]} for row in rows]}))
    for split in refs:
        if unseal(home / ("references_" + split + ".json"))["images"] != refs[split]:
            raise PipelineBlocked("Sealed AI references changed")
    return rows, config, config_id, categories, definitions


def load_ready(model, home):
    protocol = unseal(home / "protocol.json")
    config = protocol["config"]
    if config["model"] != model or protocol["config_id"] != digest(config):
        raise PipelineBlocked("Configured model/protocol changed")
    checks = {**config["source_sha256"], "data/raw/manifest.csv": config["raw_manifest_sha256"],
        "data/review/decisions.json": config["human_decisions_sha256"],
        str(NOTES.relative_to(ROOT)): config["visual_notes_sha256"],
        str((CANDIDATES / "candidate_manifest.csv").relative_to(ROOT)): config["candidate_manifest_sha256"],
        str((CANDIDATES / "candidate_plan.json").relative_to(ROOT)): config["candidate_plan_sha256"]}
    for name, expected in checks.items():
        if sha256_file(ROOT / name) != expected:
            raise PipelineBlocked("Input/source changed after exploratory freeze: " + name)
    for split, expected in protocol["reference_files_sha256"].items():
        # Byte integrity only: do not parse test annotations while selecting on validation.
        if sha256_file(home / ("references_" + split + ".json")) != expected:
            raise PipelineBlocked("Frozen AI reference file changed")
    for name in VERSIONS:
        if importlib.metadata.version(name) != config["runtime"][name]:
            raise PipelineBlocked("Detector runtime changed after freeze")
    sdk = json.loads((ROOT / "node_modules/@google/genai/package.json").read_text(encoding="utf-8"))
    if sdk["version"] != config["runtime"]["@google/genai"]:
        raise PipelineBlocked("Gemini SDK changed after freeze")
    rows = candidate_rows()
    for row in rows:
        if sha256_file(image_path(DEFAULT_RAW, row["file"])) != row["sha256"]:
            raise PipelineBlocked("Candidate image changed after freeze")
    return rows, config, protocol["config_id"], load_taxonomy(), load_definitions(DEFAULT_RAW)


def write_report(report, reports=REPORTS):
    reports.mkdir(parents=True, exist_ok=True)
    write_json(reports / "comparison.json", seal(report))
    lines = ["# Giai đoạn 4 — thăm dò với nhãn AI", "", "**CHƯA PHẢI ĐỘ CHÍNH XÁC CHÍNH THỨC.**",
        "Nhãn tham chiếu do Codex xem ảnh và ước lượng bbox trước khi xem dự đoán Gemini/OWLv2; chưa được con người xác nhận.",
        "Chỉ số dưới đây là mức khớp với nhãn AI, có thể sai cả nhãn lẫn bbox. Không dùng để kết luận an toàn hay triển khai.", "",
        "Trạng thái: " + report["status"], "Model: `" + report["config"]["model"] + "`; seed 20261122; temperature 0.1 (baseline giữ mặc định).",
        "Ứng viên 38 ảnh/37 nhóm: train 27, val 6, test 5. Chỉ 3 exemplar train được gán nhãn; không huấn luyện.",
        "17 lớp có tên được chấm; `other` không gán hết nên loại khỏi chấm, không coi là âm. Lớp không có support có AP=null.",
        "RISK-003/004/005/007/008 giữ unknown. Unknown/N/A loại khỏi mẫu số nhị phân; lỗi inference vẫn tính bỏ sót.", "",
        "Quy tắc chọn đã khóa trước inference: " + POLICY, ""]
    values = []
    for key, result in report.get("results", {}).items():
        s = result["summary"]
        values.append([key, result["status"], result["metrics"]["inference_failures"], s["high_positive"],
            fmt(s["high_recall"]), fmt(s["risk_recall"]), fmt(s["risk_f1"]), fmt(s["map50"])])
    lines += table(["Val", "Trạng thái", "Lỗi/6", "HIGH support", "HIGH recall", "Risk recall", "Risk F1", "mAP50 AI"], values)
    lines += ["", "Cấu hình chọn: `" + str(report.get("winner")) + "`; cơ sở: " + report.get("selection_basis", "pending") + ".",
        "**Không có HIGH dương tính thì HIGH recall không xác định; chọn theo bbox không chứng minh phát hiện nguy cơ.**", ""]
    test = report.get("test")
    if test:
        lines += ["## Test thăm dò — một lượt của cấu hình đã khóa", "",
            "Trạng thái: " + test["status"] + "; ảnh: " + str(test["metrics"]["images"]) +
            "; lỗi: " + str(test["metrics"]["inference_failures"]) + "; mAP50 so nhãn AI: " + fmt(test["summary"]["map50"]) + ".",
            "HIGH support: " + str(test["summary"]["high_positive"]) + "; HIGH recall: " + fmt(test["summary"]["high_recall"]) + ".", ""]
    lines += ["Gemini invocations đã ghi cache: " + str(report.get("total_gemini_invocations", 0)) +
        "; OWLv2 invocations: " + str(report.get("total_detector_invocations", 0)) + ". Số này gồm lời gọi lỗi, không phải số HTTP retry nội bộ SDK.",
        "JSON mỗi cấu hình có AP/P/R theo lớp, P/R/F1 theo nguy cơ, support, group bootstrap CI95 (1.000 lần, mẫu rất nhỏ). Gallery lỗi HTML nằm cùng thư mục val/test; bbox tham chiếu màu xanh, dự đoán màu đỏ.",
        "Dữ liệu gốc và quyết định duyệt của người dùng không bị ghi lại. Không tạo human_scene_verified/human_risk_verified, bundle verified hay khóa test chính thức.",
        "Dừng ở Giai đoạn 4. Muốn benchmark chính thức cần ảnh đúng bối cảnh, nhãn và bbox do con người kiểm tra, cùng dữ liệu đo cho các nguy cơ chưa quan sát được.", ""]
    atomic_text(reports / "comparison.md", "\n".join(lines))


def run(action, model, home=HOME, reports=REPORTS):
    if action == "prepare":
        rows, config, config_id, categories, definitions = prepare(model, home)
        return {"status": "prepared", "config_id": config_id, "official_accuracy": False}
    rows, config, config_id, categories, definitions = load_ready(model, home)
    with exclusive_job(home):
        winner_path, test_lock = home / "winner.json", home / "final_test_lock.json"
        comparison = home / "comparison.json"
        if action == "val" and winner_path.exists():
            return {"status": "selection_already_sealed", "api_calls": 0, "winner": unseal(winner_path)["winner"]}
        train_val = [entry for split in ["train", "val"] for entry in unseal(home / ("references_" + split + ".json"))["images"]]
        truth = {entry["image_id"]: entry for entry in train_val}
        predictor = AIPredictor(DEFAULT_RAW, rows, truth, categories, definitions, config)
        scored = [entry for entry in categories if entry["name"] in config["scored_classes"]]
        report = {"status": "running_validation", "generated_at": utc_now(), "config": config,
            "config_id": config_id, "official_accuracy": False, "results": {}, "winner": None}
        if action == "val":
            if test_lock.exists():
                raise PipelineBlocked("Validation cannot run after exploratory test started")
            for exp in config["plan"]["experiments"]:
                report["results"][exp["id"]] = run_experiment(exp, [row for row in rows if row["dataset_split"] == "val"],
                    truth, predictor, config_id, home / "cache", config["plan"], DEFAULT_RAW, reports / "val", metric_categories=scored)
                write_report(report, reports)
            winner, basis = choose(report["results"], config["plan"]["experiments"])
            report.update(winner=winner, selection_basis=basis, status="validation_complete" if winner else "validation_no_eligible_winner")
            if winner:
                write_json(winner_path, seal({"config_id": config_id, "winner": winner, "basis": basis, "selected_at": utc_now()}))
        elif action == "final-test":
            if not winner_path.exists() or not comparison.exists():
                raise PipelineBlocked("Complete and seal validation selection first")
            report, winner = unseal(comparison), unseal(winner_path)
            report.pop("content_sha256", None)
            if winner["config_id"] != config_id or report["config_id"] != config_id or report["winner"] != winner["winner"]:
                raise PipelineBlocked("Validation winner/configuration mismatch")
            if report.get("test"):
                return {"status": "test_already_completed", "api_calls": 0, "winner": winner["winner"]}
            lock = {"config_id": config_id, "winner": winner["winner"]}
            if test_lock.exists():
                if unseal(test_lock)["identity"] != lock:
                    raise PipelineBlocked("Exploratory test lock mismatch")
            else:
                write_json(test_lock, seal({"identity": lock, "started_at": utc_now()}))
            # Test reference semantics loaded only after immutable validation selection.
            truth.update({entry["image_id"]: entry for entry in unseal(home / "references_test.json")["images"]})
            exp = next(item for item in config["plan"]["experiments"] if item["id"] == winner["winner"])
            report["test"] = run_experiment(exp, [row for row in rows if row["dataset_split"] == "test"],
                truth, predictor, config_id, home / "cache", config["plan"], DEFAULT_RAW, reports / "test",
                attempts_path=home / "test_attempts.json", metric_categories=scored)
            report["status"] = "exploratory_complete" if report["test"]["status"] == "completed" else "exploratory_test_incomplete"
        else:
            raise ValueError("Unsupported exploratory action")
        records = [unseal(path) for path in (home / "cache" / config_id).glob("*/*.json")]
        report["total_gemini_invocations"] = sum(entry["gemini_invocations"] for entry in records)
        report["total_detector_invocations"] = sum(entry["detector_invocations"] for entry in records)
        report["updated_at"] = utc_now()
        write_json(comparison, seal(report))
        write_report(report, reports)
        return {"status": report["status"], "winner": report["winner"], "api_calls": predictor.calls,
            "official_accuracy": False, "report": str(reports / "comparison.md")}


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["prepare", "val", "final-test"])
    args = parser.parse_args()
    try:
        print(json.dumps(run(args.action, os.getenv("GEMINI_MODEL")), ensure_ascii=False), flush=True)
    except (PipelineBlocked, ValueError, OSError, KeyError) as error:
        print(json.dumps({"status": "blocked", "error": str(error), "official_accuracy": False}), flush=True)
        raise SystemExit(2)
