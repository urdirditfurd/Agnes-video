#!/usr/bin/env bash
cd "$(dirname "$0")"
echo ""
echo "  Ambiance Video Generator (Agnes IA)"
echo "  → http://127.0.0.1:8765/"
echo "  Ou ouvre index.html directement."
echo ""
exec python3 -m http.server 8765
