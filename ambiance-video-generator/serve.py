#!/usr/bin/env python3
"""Local static server + Kling API proxy (avoids browser CORS / file://)."""

from __future__ import annotations

import json
import mimetypes
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST = "127.0.0.1"
PORT = int(os.environ.get("PORT", "8765"))
ROOT = os.path.dirname(os.path.abspath(__file__))
KLING_UPSTREAM = "https://api.klingai.com/v1"
ALLOWED_FETCH_HOSTS = (
    "klingai.com",
    "kling.ai",
    "kwcdn.com",
    "kuaishou.com",
    "klserver.com",
)


def _is_allowed_fetch_url(url: str) -> bool:
    try:
        parsed = urllib.parse.urlparse(url)
    except Exception:
        return False
    if parsed.scheme not in ("http", "https"):
        return False
    host = (parsed.hostname or "").lower()
    return any(host == h or host.endswith("." + h) for h in ALLOWED_FETCH_HOSTS)


class Handler(BaseHTTPRequestHandler):
    server_version = "AmbianceKlingProxy/1.0"

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _send(self, code: int, body: bytes, content_type: str, extra=None) -> None:
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        # Same-origin UI calls; still useful if opened via tunnel.
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        if extra:
            for k, v in extra.items():
                self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _json_err(self, code: int, message: str) -> None:
        payload = json.dumps({"error": message}).encode("utf-8")
        self._send(code, payload, "application/json; charset=utf-8")

    def do_OPTIONS(self) -> None:
        self._send(204, b"", "text/plain")

    def do_HEAD(self) -> None:
        self._handle_static(head_only=True)

    def do_GET(self) -> None:
        if self.path.startswith("/api/kling"):
            self._proxy_kling()
            return
        if self.path.startswith("/api/fetch"):
            self._proxy_fetch()
            return
        self._handle_static()

    def do_POST(self) -> None:
        if self.path.startswith("/api/kling"):
            self._proxy_kling()
            return
        self._json_err(404, "Not found")

    def _handle_static(self, head_only: bool = False) -> None:
        parsed = urllib.parse.urlparse(self.path)
        rel = urllib.parse.unquote(parsed.path)
        if rel in ("", "/"):
            rel = "/index.html"
        # Prevent path traversal
        safe = os.path.normpath(rel.lstrip("/"))
        if safe.startswith(".."):
            self._json_err(403, "Forbidden")
            return
        full = os.path.join(ROOT, safe)
        if not full.startswith(ROOT) or not os.path.isfile(full):
            self._json_err(404, "File not found")
            return
        ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype in ("application/javascript", "application/json"):
            ctype += "; charset=utf-8"
        with open(full, "rb") as f:
            data = f.read()
        if head_only:
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            return
        self._send(200, data, ctype)

    def _read_body(self) -> bytes:
        length = int(self.headers.get("Content-Length") or "0")
        if length <= 0:
            return b""
        return self.rfile.read(length)

    def _proxy_kling(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        suffix = parsed.path[len("/api/kling") :]
        if not suffix.startswith("/"):
            suffix = "/" + suffix
        target = KLING_UPSTREAM + suffix
        if parsed.query:
            target += "?" + parsed.query

        headers = {
            "Accept": "application/json",
            "User-Agent": "AmbianceVideoGenerator/1.0",
        }
        auth = self.headers.get("Authorization")
        if auth:
            headers["Authorization"] = auth
        ctype = self.headers.get("Content-Type")
        body = None
        if self.command == "POST":
            body = self._read_body()
            headers["Content-Type"] = ctype or "application/json"

        req = urllib.request.Request(target, data=body, headers=headers, method=self.command)
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                data = resp.read()
                resp_ctype = resp.headers.get("Content-Type") or "application/json"
                self._send(resp.status, data, resp_ctype)
        except urllib.error.HTTPError as e:
            data = e.read()
            resp_ctype = e.headers.get("Content-Type") if e.headers else "application/json"
            self._send(e.code, data or b"", resp_ctype or "application/json")
        except Exception as e:
            self._json_err(502, "Proxy Kling failed: %s" % e)

    def _proxy_fetch(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed.query)
        url = (qs.get("url") or [""])[0]
        if not url:
            self._json_err(400, "Missing url")
            return
        if not _is_allowed_fetch_url(url):
            self._json_err(403, "Host not allowed for /api/fetch")
            return
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "AmbianceVideoGenerator/1.0"},
            method="GET",
        )
        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                data = resp.read()
                ctype = resp.headers.get("Content-Type") or "application/octet-stream"
                self._send(resp.status, data, ctype)
        except urllib.error.HTTPError as e:
            data = e.read()
            self._send(e.code, data or b"", "application/octet-stream")
        except Exception as e:
            self._json_err(502, "Proxy fetch failed: %s" % e)


def main() -> None:
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print("")
    print("  Ambiance Video Generator (proxy Kling CORS)")
    print("  → http://%s:%s/" % (HOST, PORT))
    print("  Ouvre cette URL dans le navigateur (PAS le fichier .html en file://)")
    print("  Ctrl+C pour arrêter")
    print("")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nArrêt.")
        httpd.server_close()


if __name__ == "__main__":
    main()
