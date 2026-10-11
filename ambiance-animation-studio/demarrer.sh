#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo ""
echo "============================================"
echo " Ambiance Animation Studio — demarrage"
echo "============================================"
echo ""
echo "Cette fenetre DOIT rester ouverte."
echo "Si « can't connect » : le serveur n'est pas lance."
echo ""

if [[ ! -f index.html ]]; then
  echo "[X] index.html introuvable (mauvais dossier)."
  exit 1
fi
if [[ ! -f lib/ffmpeg/ffmpeg.js ]]; then
  echo "[X] lib/ffmpeg/ manquant — dossier incomplet."
  exit 1
fi
echo "[OK] Pack complet"
echo ""

if command -v python3 >/dev/null 2>&1; then
  echo "[1] Python3..."
  exec python3 serve.py
fi

if command -v node >/dev/null 2>&1; then
  echo "[1] Node.js (pas de python3)..."
  exec node serve.mjs
fi

echo "ERREUR: installez python3 ou node, puis relancez."
exit 1
