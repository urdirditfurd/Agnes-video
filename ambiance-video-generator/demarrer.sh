#!/usr/bin/env bash
cd "$(dirname "$0")"
echo ""
echo "  Ambiance Video Generator (optionnel)"
echo "  Tu peux aussi ouvrir index.html directement, ou GitHub Pages."
echo "  → http://127.0.0.1:8765/"
echo ""
exec python3 -m http.server 8765
