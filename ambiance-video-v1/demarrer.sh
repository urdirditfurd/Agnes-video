#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
echo ""
echo "============================================"
echo " Ambiance Video Studio v1 — démarrage local"
echo "============================================"
echo ""
echo "NE PAS ouvrir index.html en double-clic (file://)."
echo "Sinon : ERR_FILE_NOT_FOUND sur lib/ffmpeg/"
echo ""
echo "Serveur : http://127.0.0.1:8765/"
echo ""
if command -v xdg-open >/dev/null 2>&1; then
  (sleep 1 && xdg-open "http://127.0.0.1:8765/") &
elif command -v open >/dev/null 2>&1; then
  (sleep 1 && open "http://127.0.0.1:8765/") &
fi
python3 -m http.server 8765
