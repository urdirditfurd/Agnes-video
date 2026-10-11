#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo ""
echo "============================================"
echo " Ambiance Animation Studio — demarrage"
echo "============================================"
echo ""
echo "1) Cette fenetre DOIT rester ouverte"
echo "2) Ouvrez ensuite : http://127.0.0.1:8765/"
echo "3) Ne double-cliquez PAS index.html (file://)"
echo ""

if [[ ! -f index.html ]]; then
  echo "ERREUR: index.html introuvable (mauvais dossier)."
  exit 1
fi
if [[ ! -f lib/ffmpeg/ffmpeg.js ]]; then
  echo "ERREUR: lib/ffmpeg/ manquant — dossier incomplet."
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERREUR: python3 introuvable. Installez Python 3."
  exit 1
fi

exec python3 serve.py
