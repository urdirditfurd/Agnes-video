#!/usr/bin/env python3
"""Serveur HTTP local multithread pour Ambiance Video Studio.

python -m http.server est mono-thread : le fetch du .wasm (~32 Mo) peut
bloquer / faire échouer d'autres requêtes. ThreadingHTTPServer évite ça.
"""
from __future__ import annotations

import functools
import os
import sys
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = 8765
HOST = "127.0.0.1"


class AmbianceHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".wasm": "application/wasm",
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".webm": "video/webm",
        ".mp4": "video/mp4",
        ".mp3": "audio/mpeg",
    }

    def end_headers(self) -> None:
        # Aide les Workers / WASM en local
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def main() -> int:
    root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(root)

    handler = functools.partial(AmbianceHandler, directory=root)
    try:
        httpd = ThreadingHTTPServer((HOST, PORT), handler)
    except OSError as exc:
        print("")
        print("Impossible d'ouvrir %s:%s — %s" % (HOST, PORT, exc))
        print("Fermez l'ancien demarrer.bat / le processus sur le port %s." % PORT)
        print("")
        return 1

    url = "http://%s:%s/" % (HOST, PORT)
    print("")
    print("============================================")
    print(" Ambiance Animation Studio — serveur local")
    print("============================================")
    print("")
    print(" NE FERMEZ PAS cette fenetre pendant l'usage.")
    print(" Sinon : ERR_CONNECTION_REFUSED sur ffmpeg-core.")
    print("")
    print(" URL : %s" % url)
    print(" Ctrl+C pour arreter")
    print("")

    open_browser = "--no-browser" not in sys.argv
    if open_browser:
        try:
            webbrowser.open(url)
        except Exception:
            pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nArret du serveur.")
    finally:
        httpd.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
