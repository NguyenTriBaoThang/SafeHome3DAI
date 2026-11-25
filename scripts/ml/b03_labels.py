"""B03: kiểm tra nhãn, độ đồng thuận, chốt nhãn tham chiếu và chấm điểm dự đoán.

Chỉ dùng stdlib. Lệnh: validate | agreement | finalize | score (xem docs/collaboration/B03_LABELING_RUNBOOK.md).
Nhãn thô, manifest và nhật ký bất đồng nằm trong .private/ (không commit); chỉ số tổng hợp ẩn danh mới được commit.
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCHEMA_DIR = ROOT / "data_schemas"
STATES = ["present", "absent", "uncertain", "not_assessable"]
RISKS = [f"RISK-00{i}" for i in range(1, 9)]
# Phạm vi áp dụng theo docs/RISK_RULE_REGISTRY.md; RISK-002 ở BATHROOM chỉ tùy chọn (CSV nguồn có, registry không).
REQUIRED = {"BEDROOM": {"RISK-001", "RISK-002", "RISK-003", "RISK-004", "RISK-007", "RISK-008"},
            "BATHROOM": {"RISK-003", "RISK-004", "RISK-005", "RISK-006", "RISK-007"}}
OPTIONAL = {"BEDROOM": set(), "BATHROOM": {"RISK-002"}}
MANIFEST_COLS = ["image_id", "household_id", "consent_id", "room_type", "scene_id", "lighting", "occlusion",
                 "approved_for_third_party", "split", "reviewer", "private_path", "sha256"]
SMALL_N = 30  # ponytail: ngưỡng quy ước của nhóm cho "mẫu nhỏ"; không phải ngưỡng thống kê chuẩn
DIS_COLS = ["image_id", "risk", "a1_state", "a2_state", "a1_note", "a2_note", "final_state", "resolution_note"]


def load_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


# ---------- schema (tập con JSON Schema: type/enum/required/properties/additionalProperties/items/pattern/min/max) ----------
def check_schema(inst, sch, where="$"):
    errs = []
    if "enum" in sch and inst not in sch["enum"]:
        return [f"{where}: {inst!r} không thuộc {sch['enum']}"]
    t = sch.get("type")
    py = {"object": dict, "array": list, "string": str, "number": (int, float)}.get(t)
    if py and (not isinstance(inst, py) or isinstance(inst, bool)):
        return [f"{where}: cần kiểu {t}"]
    if t == "string" and "pattern" in sch and not re.search(sch["pattern"], inst):
        errs.append(f"{where}: {inst!r} sai định dạng")
    if t == "number":
        if "minimum" in sch and inst < sch["minimum"] or "maximum" in sch and inst > sch["maximum"]:
            errs.append(f"{where}: {inst} ngoài khoảng")
    if t == "array":
        if len(inst) < sch.get("minItems", 0) or len(inst) > sch.get("maxItems", 10 ** 9):
            errs.append(f"{where}: sai số phần tử ({len(inst)})")
        for i, x in enumerate(inst):
            errs += check_schema(x, sch.get("items", {}), f"{where}[{i}]")
    if t == "object":
        props = sch.get("properties", {})
        for k in sch.get("required", []):
            if k not in inst:
                errs.append(f"{where}: thiếu {k}")
        for k, v in inst.items():
            if "propertyNames" in sch and not re.search(sch["propertyNames"]["pattern"], k):
                errs.append(f"{where}: khóa {k!r} không hợp lệ")
            if k in props:
                errs += check_schema(v, props[k], f"{where}.{k}")
            elif sch.get("additionalProperties") is False:
                errs.append(f"{where}: khóa thừa {k}")
            elif isinstance(sch.get("additionalProperties"), dict):
                errs += check_schema(v, sch["additionalProperties"], f"{where}.{k}")
    return errs


def check_label_records(records, name="labels"):
    errs = check_schema(records, load_json(SCHEMA_DIR / "hazard_labels.schema.json"), name)
    if errs:
        return errs
    seen = set()
    for i, r in enumerate(records):
        w = f"{name}[{r['image_id']}]"
        if r["image_id"] in seen:
            errs.append(f"{w}: image_id trùng trong file")
        seen.add(r["image_id"])
        keys = set(r["hazards"])
        req, opt = REQUIRED[r["room_type"]], OPTIONAL[r["room_type"]]
        if req - keys:
            errs.append(f"{w}: thiếu {sorted(req - keys)}")
        if keys - req - opt:
            errs.append(f"{w}: RISK không áp dụng cho {r['room_type']}: {sorted(keys - req - opt)}")
        for k, h in r["hazards"].items():
            if h["state"] in ("present", "uncertain") and not h["evidence_note"].strip():
                errs.append(f"{w}.{k}: {h['state']} cần evidence_note")
        for j, o in enumerate(r["objects"]):
            x0, y0, x1, y1 = o["bbox"]
            if not (x1 > x0 and y1 > y0):
                errs.append(f"{w}.objects[{j}]: bbox phải có xMax>xMin, yMax>yMin")
    if len({r["annotator_id"] for r in records}) > 1:
        errs.append(f"{name}: một file chỉ được có một annotator_id")
    return errs


def read_manifest(path):
    with open(path, newline="", encoding="utf-8") as f:
        rd = csv.DictReader(f)
        return rd.fieldnames, list(rd)


def check_manifest(fields, rows):
    errs = []
    if fields != MANIFEST_COLS:
        return [f"manifest: header phải đúng {MANIFEST_COLS}"]
    ids, hashes, hh_split = Counter(), {}, {}
    for n, r in enumerate(rows, 2):
        w = f"manifest dòng {n} ({r['image_id']})"
        ids[r["image_id"]] += 1
        if not r["consent_id"].strip():
            errs.append(f"{w}: thiếu consent_id")
        if r["approved_for_third_party"].strip().lower() not in ("yes", "no", "true", "false"):
            errs.append(f"{w}: approved_for_third_party phải là yes/no (true/false) tường minh")
        if r["split"] != "test":
            errs.append(f"{w}: split phải là 'test'")
        p = r["private_path"].replace("\\", "/")
        if not p.startswith(".private/") or ".." in p.split("/"):
            errs.append(f"{w}: private_path phải là đường dẫn tương đối dưới .private/")
        if r["room_type"] not in REQUIRED:
            errs.append(f"{w}: room_type phải là BEDROOM|BATHROOM")
        if not re.fullmatch(r"[0-9a-fA-F]{64}", r["sha256"]):
            errs.append(f"{w}: sha256 phải là 64 ký tự hex")
        elif r["sha256"].lower() in hashes:
            errs.append(f"{w}: trùng hash ảnh với {hashes[r['sha256'].lower()]}")
        else:
            hashes[r["sha256"].lower()] = r["image_id"]
        hh_split.setdefault(r["household_id"], set()).add(r["split"])
    errs += [f"manifest: image_id trùng {i}" for i, c in ids.items() if c > 1]
    errs += [f"manifest: hộ {h} bị tách nhiều split {sorted(s)}" for h, s in hh_split.items() if len(s) > 1]
    return errs


def cmd_validate(a):
    errs = []
    manifest = {}
    if a.manifest:
        fields, rows = read_manifest(a.manifest)
        errs += check_manifest(fields, rows)
        manifest = {r["image_id"]: r for r in rows}
    for p in a.labels or []:
        recs = load_json(p)
        e = check_label_records(recs, Path(p).name)
        errs += e
        if not e and manifest:
            for r in recs:
                m = manifest.get(r["image_id"])
                if not m:
                    errs.append(f"{Path(p).name}[{r['image_id']}]: không có trong manifest")
                elif (m["household_id"], m["room_type"]) != (r["household_id"], r["room_type"]):
                    errs.append(f"{Path(p).name}[{r['image_id']}]: household/room không khớp manifest")
    if a.final:
        g = load_json(a.final)
        errs += check_schema(g, load_json(SCHEMA_DIR / "hazard_ground_truth.schema.json"), Path(a.final).name)
    print("\n".join(errs) if errs else "OK: không có lỗi")
    return 1 if errs else 0


# ---------- thống kê ----------
def wilson(k, n, z=1.96):
    if n == 0:
        return None
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return round(max(0.0, c - h), 4), round(min(1.0, c + h), 4)


def kappa(pairs):
    """Cohen's kappa; None nếu không có cặp hoặc kỳ vọng ngẫu nhiên = 1."""
    n = len(pairs)
    if not n:
        return None
    po = sum(a == b for a, b in pairs) / n
    ca, cb = Counter(a for a, _ in pairs), Counter(b for _, b in pairs)
    pe = sum(ca[s] * cb[s] for s in ca) / (n * n)
    return None if pe == 1 else round((po - pe) / (1 - pe), 4)


def index_labels(path):
    recs = load_json(path)
    errs = check_label_records(recs, Path(path).name)
    if errs:
        sys.exit("\n".join(errs))
    return recs[0]["annotator_id"] if recs else "?", {r["image_id"]: r for r in recs}


def paired(a1, a2):
    for img in sorted(set(a1) & set(a2)):
        for k in sorted(set(a1[img]["hazards"]) & set(a2[img]["hazards"])):
            yield img, k, a1[img]["hazards"][k], a2[img]["hazards"][k]


def cmd_agreement(a):
    id1, l1 = index_labels(a.a1)
    id2, l2 = index_labels(a.a2)
    miss = set(l1) ^ set(l2)
    if miss:
        sys.exit(f"Annotator 2 phải review 100%: ảnh chỉ có ở một bên: {sorted(miss)}")
    by, dis = {k: [] for k in RISKS}, []
    for img, k, h1, h2 in paired(l1, l2):
        by[k].append((h1["state"], h2["state"]))
        if h1["state"] != h2["state"]:
            dis.append({"image_id": img, "risk": k, "a1_state": h1["state"], "a2_state": h2["state"],
                        "a1_note": h1["evidence_note"], "a2_note": h2["evidence_note"], "final_state": "", "resolution_note": ""})
    out = {}
    for k, pr in by.items():
        if not pr:
            continue
        pa = [p for p in pr if p[0] in ("present", "absent") and p[1] in ("present", "absent")]
        out[k] = {"n_pairs": len(pr), "raw_agreement": round(sum(x == y for x, y in pr) / len(pr), 4),
                  "kappa_4state": kappa(pr), "n_binary_subset": len(pa), "kappa_present_absent": kappa(pa),
                  "a1_counts": dict(Counter(x for x, _ in pr)), "a2_counts": dict(Counter(y for _, y in pr))}
        if len(pr) < SMALL_N:
            out[k]["warning"] = "mẫu nhỏ, thăm dò"
    if a.out:
        Path(a.out).parent.mkdir(parents=True, exist_ok=True)
        with open(a.out, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, DIS_COLS)
            w.writeheader()
            w.writerows(dis)
    res = {"annotators": [id1, id2], "n_disagreements": len(dis), "per_risk": out}
    print(json.dumps(res, ensure_ascii=False, indent=2))
    if a.json_out:
        Path(a.json_out).write_text(json.dumps(res, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0


def cmd_finalize(a):
    id1, l1 = index_labels(a.a1)
    id2, l2 = index_labels(a.a2)
    if set(l1) != set(l2):
        sys.exit("Hai file phải có cùng tập ảnh")
    with open(a.resolutions, newline="", encoding="utf-8") as f:
        res = {(r["image_id"], r["risk"]): r for r in csv.DictReader(f)}
    images = []
    for img in sorted(l1):
        r1, hz = l1[img], {}
        for k in sorted(set(r1["hazards"]) & set(l2[img]["hazards"])):
            s1, s2 = r1["hazards"][k]["state"], l2[img]["hazards"][k]["state"]
            item = {"raw": {id1: s1, id2: s2}}
            if s1 == s2:
                item.update(final=s1, resolution="agreed")
            else:
                r = res.get((img, k))
                if not r or r["final_state"] not in STATES or not r["resolution_note"].strip():
                    sys.exit(f"Bất đồng chưa chốt (cần final_state hợp lệ + resolution_note): {img} {k}")
                item.update(final=r["final_state"], resolution="discussed", resolution_note=r["resolution_note"])
            hz[k] = item
        images.append({"image_id": img, "household_id": r1["household_id"], "room_type": r1["room_type"], "hazards": hz})
    gt = {"guideline_version": r1["guideline_version"], "disagreement_log_ref": str(a.resolutions), "images": images}
    errs = check_schema(gt, load_json(SCHEMA_DIR / "hazard_ground_truth.schema.json"))
    if errs:
        sys.exit("\n".join(errs))
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(json.dumps(gt, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Đã ghi {a.out}: {len(images)} ảnh")
    return 0


def prf(tp, fp, fn):
    p = tp / (tp + fp) if tp + fp else None
    r = tp / (tp + fn) if tp + fn else None
    f = 2 * p * r / (p + r) if p and r else (0.0 if p is not None and r is not None else None)
    return p, r, f


def score(ref, preds):
    """ref: dict (image, risk)->final state; preds: dict (image, risk)->present|absent|unknown. Không có 'accuracy' tổng."""
    out = {}
    for k in RISKS:
        cells = {i: s for (i, kk), s in ref.items() if kk == k}
        if not cells:
            continue
        pv = lambda i: preds.get((i, k), "unknown")
        tp = sum(s == "present" and pv(i) == "present" for i, s in cells.items())
        fn = sum(s == "present" and pv(i) != "present" for i, s in cells.items())
        fp = sum(s == "absent" and pv(i) == "present" for i, s in cells.items())
        tn = sum(s == "absent" and pv(i) != "present" for i, s in cells.items())
        p, r, f = prf(tp, fp, fn)
        n_pres, n_abs = tp + fn, fp + tn
        e = {"n_ref_present": n_pres, "n_ref_absent": n_abs, "tp": tp, "fp": fp, "fn": fn, "tn": tn,
             "n_pred_unknown_on_scored_cells": sum(pv(i) == "unknown" for i, s in cells.items() if s in ("present", "absent")),
             "precision": p, "recall": r, "f1": f,
             "precision_wilson95": wilson(tp, tp + fp), "recall_wilson95": wilson(tp, tp + fn),
             "on_reference_uncertain": dict(Counter(pv(i) for i, s in cells.items() if s == "uncertain")),
             "on_reference_not_assessable": dict(Counter(pv(i) for i, s in cells.items() if s == "not_assessable"))}
        if min(n_pres, n_abs) < SMALL_N:
            e["warning"] = "mẫu nhỏ, thăm dò"
        out[k] = e
    return out


def cmd_score(a):
    gt = load_json(a.reference)
    ref = {(im["image_id"], k): h["final"] for im in gt["images"] for k, h in im["hazards"].items()}
    preds = {}
    for im in load_json(a.predictions):
        for k, h in im["hazards"].items():
            s = h["state"] if isinstance(h, dict) else h
            if s not in ("present", "absent", "unknown"):
                sys.exit(f"Dự đoán {im['image_id']} {k}: state phải là present|absent|unknown, nhận {s!r}")
            preds[(im["image_id"], k)] = s
    res = score(ref, preds)
    txt = json.dumps(res, ensure_ascii=False, indent=2)
    print(txt)
    if a.json_out:
        Path(a.json_out).write_text(txt, encoding="utf-8")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)
    v = sub.add_parser("validate")
    v.add_argument("--labels", nargs="*")
    v.add_argument("--manifest")
    v.add_argument("--final")
    v.set_defaults(fn=cmd_validate)
    g = sub.add_parser("agreement")
    g.add_argument("--a1", required=True)
    g.add_argument("--a2", required=True)
    g.add_argument("--out", help="CSV danh sách bất đồng (mặc định nên nằm trong .private/)")
    g.add_argument("--json-out", help="chỉ số tổng hợp ẩn danh (được phép commit)")
    g.set_defaults(fn=cmd_agreement)
    f = sub.add_parser("finalize")
    f.add_argument("--a1", required=True)
    f.add_argument("--a2", required=True)
    f.add_argument("--resolutions", required=True, help="CSV bất đồng đã điền final_state + resolution_note")
    f.add_argument("--out", required=True)
    f.set_defaults(fn=cmd_finalize)
    s = sub.add_parser("score")
    s.add_argument("--reference", required=True)
    s.add_argument("--predictions", required=True)
    s.add_argument("--json-out")
    s.set_defaults(fn=cmd_score)
    a = ap.parse_args(argv)
    return a.fn(a)


if __name__ == "__main__":
    sys.exit(main())
