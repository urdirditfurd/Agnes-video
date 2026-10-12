#!/usr/bin/env bash
cd "$(dirname "$0")"
echo ""
echo "  Ambiance Video Generator (proxy Kling anti-CORS)"
echo "  → http://127.0.0.1:8765/"
echo "  N'ouvre PAS index.html en file:// — utilise cette URL."
echo ""
exec python3 serve.py
