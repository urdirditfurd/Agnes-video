#!/usr/bin/env python3
"""Serveur HTTP local multithread pour Ambiance Animation Studio.

Écoute sur 0.0.0.0 (toutes interfaces) pour éviter les refus de connexion
selon l’OS / le navigateur. Si 8765 est pris, essaie 8766–8770.
"""
from __future__ import annotations

import functools
import os
import socket
import sys
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PREFERRED_PORTS = [8765, 8766, 8767, 8768, 8769, 8770]
HOST = "0.0.0.0"


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
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def port_free(host: str, port: int) -> bool:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind((host, port))
        return True
    except OSError:
        return False
    finally:
        sock.close()


def pick_port() -> int:
    for port in PREFERRED_PORTS:
        if port_free(HOST, port):
            return port
    raise OSError("Aucun port libre parmi %s" % PREFERRED_PORTS)


def main() -> int:
    root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(root)

    # Garde-fous pack incomplet
    index_path = os.path.join(root, "index.html")
    ffmpeg_js = os.path.join(root, "lib", "ffmpeg", "ffmpeg.js")
    if not os.path.isfile(index_path):
        print("ERREUR: index.html introuvable dans", root)
        return 1
    if not os.path.isfile(ffmpeg_js):
        print("ERREUR: lib/ffmpeg/ manquant — téléchargez le dossier COMPLET.")
        return 1

    handler = functools.partial(AmbianceHandler, directory=root)
    try:
        port = pick_port()
        httpd = ThreadingHTTPServer((HOST, port), handler)
    except OSError as exc:
        print("")
        print("Impossible de demarrer le serveur :", exc)
        print("Fermez les anciennes fenetres demarrer.bat / demarrer.sh")
        print("")
        return 1

    url_local = "http://127.0.0.1:%s/" % port
    # Fichier pratique pour les scripts / l’utilisateur
    try:
        with open(os.path.join(root, ".server-url.txt"), "w", encoding="utf-8") as fh:
            fh.write(url_local + "\n")
    except OSError:
        pass

    print("")
    print("============================================")
    print(" Ambiance Animation Studio — serveur OK")
    print("============================================")
    print("")
    print("  Ouvrez dans Chrome / Edge :")
    print("")
    print("     %s" % url_local)
    if port != 8765:
        print("")
        print("  (Le port 8765 etait occupe — utilisation de %s)" % port)
    print("")
    print("  NE FERMEZ PAS cette fenetre.")
    print("  Ctrl+C pour arreter.")
    print("")

    open_browser = "--no-browser" not in sys.argv
    if open_browser:
        try:
            webbrowser.open(url_local)
        except Exception:
            pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nArret du serveur.")
    finally:
        httpd.server_close()
        try:
            os.remove(os.path.join(root, ".server-url.txt"))
        except OSError:
            pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
