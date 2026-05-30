from __future__ import annotations

import json
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SAVE_DIR = ROOT / "docs" / "evidence" / "p4-25-combat-asset-batch-01" / "layout-editor-saves"


class ReviewHandler(SimpleHTTPRequestHandler):
    def do_POST(self) -> None:
        if self.path != "/__save_card_layout":
            self.send_error(404, "Unknown endpoint")
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = self.rfile.read(length).decode("utf-8")
            data = json.loads(payload)
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
            SAVE_DIR.mkdir(parents=True, exist_ok=True)
            latest_path = SAVE_DIR / "latest-layout.json"
            timestamped_path = SAVE_DIR / f"{timestamp}-layout.json"
            encoded = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
            latest_path.write_text(encoded, encoding="utf-8")
            timestamped_path.write_text(encoded, encoding="utf-8")
            body = json.dumps({
                "ok": True,
                "path": str(latest_path.relative_to(ROOT)).replace("\\", "/"),
                "timestampedPath": str(timestamped_path.relative_to(ROOT)).replace("\\", "/")
            }).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception as exc:
            body = json.dumps({"ok": False, "error": str(exc)}).encode("utf-8")
            self.send_response(500)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Serve the mobile review pages and accept layout saves.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8787)
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.host, args.port), ReviewHandler)
    print(f"Serving {ROOT} on http://{args.host}:{args.port}/")
    server.serve_forever()


if __name__ == "__main__":
    main()
