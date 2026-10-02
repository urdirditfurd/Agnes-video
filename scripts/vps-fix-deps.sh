#!/usr/bin/env bash
# Mission 2 — corriger uuid + express-rate-limit sur le VPS Kids Studio
set -euo pipefail
cd /opt/kids-studio
npm install uuid@9 express-rate-limit
echo "=== package.json (deps) ==="
node -e "const p=require('./package.json'); console.log(JSON.stringify({uuid:p.dependencies.uuid, 'express-rate-limit':p.dependencies['express-rate-limit']},null,2))"
pm2 restart kids-studio
pm2 logs kids-studio --lines 20 --nostream
curl -s http://127.0.0.1:3001/health
echo
curl -s http://127.0.0.1/api/health
echo
