"""Serve an offline scene-review UI on loopback; export a separate working manifest."""
from __future__ import annotations

import argparse
import copy
import json
import mimetypes
import secrets
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from dataset_common import (DEFAULT_RAW, DEFAULT_REVIEW, load_manifest, load_review,
                            image_path, room_counts, sha256_file, utc_now, working_rows,
                            write_csv, write_json)

ASSETS = Path(__file__).parent / "review_ui"
EXTRA_FIELDS = ["scene_review_decision", "scene_reviewer", "scene_reviewed_at", "scene_review_note", "candidate_eligible"]


class ReviewStore:
    def __init__(self, raw, review):
        self.raw, self.review = raw.resolve(), review.resolve()
        if self.review.is_relative_to(self.raw):
            raise ValueError("Review output must be outside raw")
        self.fields, self.rows = load_manifest(self.raw)
        if set(self.fields) & set(EXTRA_FIELDS):
            raise ValueError("Raw manifest already contains working review fields")
        self.manifest_hash = sha256_file(self.raw / "manifest.csv")
        self.audit = json.loads((self.review / "audit.json").read_text(encoding="utf-8"))
        if self.audit["manifest_sha256"] != self.manifest_hash:
            raise ValueError("Audit belongs to another manifest. Run audit_dataset.py again")
        self.by_id = {item["image_id"]: item for item in self.audit["items"]}
        self.rows_by_id = {row["image_id"]: row for row in self.rows}
        if set(self.by_id) != set(self.rows_by_id):
            raise ValueError("Audit image IDs do not match manifest")
        self.lock = threading.Lock()

    def state(self):
        if sha256_file(self.raw / "manifest.csv") != self.manifest_hash:
            raise ValueError("Raw manifest changed; stop server and regenerate audit")
        return load_review(self.review, self.manifest_hash, self.by_id)

    def export(self, state=None):
        state = state if state is not None else self.state()
        rows = working_rows(self.rows, state, self.by_id)
        write_csv(self.review / "manifest_reviewed.csv", self.fields + EXTRA_FIELDS, rows)
        summary = {"manifest_sha256": self.manifest_hash, "revision": state["revision"],
                   "generated_at": utc_now(), "rooms": room_counts(self.rows, state, self.by_id)}
        write_json(self.review / "shortfalls.json", summary)
        return summary

    def save(self, payload):
        with self.lock:
            state = self.state()
            if payload.get("revision") != state["revision"]:
                raise FileExistsError("Review changed in another tab. Reload before saving")
            key = payload.get("image_id")
            action = payload.get("decision")
            reviewer, note = payload.get("reviewer"), payload.get("note", "")
            if not isinstance(key, str) or key not in self.by_id or action not in {"keep", "reject", "replace", "pending"}:
                raise ValueError("Invalid image or decision")
            if not isinstance(reviewer, str) or not reviewer.strip() or len(reviewer) > 100:
                raise ValueError("Reviewer name is required (maximum 100 characters)")
            if not isinstance(note, str) or len(note) > 2000:
                raise ValueError("Note must be text, maximum 2000 characters")
            if action == "keep":
                row = self.rows_by_id[key]
                if not self.by_id[key]["image_ok"] or sha256_file(image_path(self.raw, row["file"])) != row["sha256"].strip().lower():
                    raise ValueError("Image is unreadable or changed since import. Audit again before Keep")
            state = copy.deepcopy(state)
            entry = {"decision": action, "reviewer": reviewer.strip(), "note": note.strip(), "at": utc_now()}
            state["history"].append({"image_id": key, "before": state["decisions"].get(key), "after": entry})
            if action == "pending":
                state["decisions"].pop(key, None)
            else:
                state["decisions"][key] = entry
            state["revision"] += 1
            write_json(self.review / "decisions.json", state)
            # Derived exports can always be regenerated from the authoritative decisions.json.
            summary = self.export(state)
            return {"revision": state["revision"], "decision": state["decisions"].get(key), "summary": summary}

    def public_state(self):
        state = self.state()
        return {"manifest_sha256": self.manifest_hash, "revision": state["revision"],
                "items": [{**row, "audit": self.by_id[row["image_id"]],
                           "review": state["decisions"].get(row["image_id"])} for row in self.rows],
                "summary": self.export(state)}


def handler_for(store, token):
    class Handler(BaseHTTPRequestHandler):
        def host_ok(self):
            return self.headers.get("Host") == f"127.0.0.1:{self.server.server_port}"

        def reply(self, status, body, content_type="application/json; charset=utf-8"):
            if not isinstance(body, bytes):
                body = json.dumps(body, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            if not self.host_ok():
                return self.reply(403, {"error": "Use the loopback URL printed by the server"})
            url = urlparse(self.path)
            try:
                if url.path == "/favicon.ico":
                    return self.reply(204, b"", "image/x-icon")
                if url.path == "/api/state":
                    with store.lock:
                        return self.reply(200, {**store.public_state(), "token": token})
                if url.path == "/image":
                    key = parse_qs(url.query).get("id", [""])[0]
                    row = store.rows_by_id.get(key)
                    if not row:
                        return self.reply(404, {"error": "Unknown image"})
                    path = image_path(store.raw, row["file"])
                    return self.reply(200, path.read_bytes(), mimetypes.guess_type(path.name)[0] or "image/jpeg")
                assets = {"/": ("index.html", "text/html; charset=utf-8"),
                          "/app.js": ("app.js", "text/javascript; charset=utf-8"),
                          "/style.css": ("style.css", "text/css; charset=utf-8")}
                if url.path in assets:
                    name, mime = assets[url.path]
                    return self.reply(200, (ASSETS / name).read_bytes(), mime)
                if url.path == "/export.csv":
                    with store.lock:
                        store.export()
                        return self.reply(200, (store.review / "manifest_reviewed.csv").read_bytes(), "text/csv; charset=utf-8")
                return self.reply(404, {"error": "Not found"})
            except (ValueError, OSError, KeyError) as error:
                return self.reply(409, {"error": str(error)})

        def do_POST(self):
            origin = f"http://127.0.0.1:{self.server.server_port}"
            if not self.host_ok() or self.headers.get("Origin") != origin or not secrets.compare_digest(self.headers.get("X-Review-Token", ""), token):
                return self.reply(403, {"error": "Invalid origin or review token"})
            if self.path != "/api/decision":
                return self.reply(404, {"error": "Not found"})
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if length < 1 or length > 16000 or self.headers.get_content_type() != "application/json":
                    return self.reply(400, {"error": "Expected JSON, maximum 16000 bytes"})
                payload = json.loads(self.rfile.read(length))
                if not isinstance(payload, dict):
                    raise ValueError("Expected a JSON object")
                return self.reply(200, store.save(payload))
            except FileExistsError as error:
                return self.reply(409, {"error": str(error)})
            except (ValueError, TypeError, OSError) as error:
                return self.reply(400, {"error": str(error)})

    return Handler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw", type=Path, default=DEFAULT_RAW)
    parser.add_argument("--review", type=Path, default=DEFAULT_REVIEW)
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--export-only", action="store_true")
    args = parser.parse_args()
    store = ReviewStore(args.raw, args.review)
    print(json.dumps(store.export(), ensure_ascii=False, indent=2), flush=True)
    if args.export_only:
        return
    server = ThreadingHTTPServer(("127.0.0.1", args.port), handler_for(store, secrets.token_urlsafe(32)))
    server.daemon_threads = True
    print(f"Review UI: http://127.0.0.1:{server.server_port} (Ctrl+C to stop)", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
