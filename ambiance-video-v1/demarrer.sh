#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
echo ""
echo "============================================"
echo " Ambiance Video Studio — demarrage local"
echo "============================================"
echo ""
echo "NE PAS ouvrir index.html en double-clic (file://)."
echo "NE FERMEZ PAS cette fenetre pendant l'usage."
echo ""
echo "Serveur : http://127.0.0.1:8765/"
echo ""
exec python3 serve.py
