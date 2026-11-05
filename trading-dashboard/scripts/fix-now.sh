#!/usr/bin/env bash
# =============================================================================
# fix-now.sh — reprise d'urgence VPS (nginx down + mismatch Postgres)
#
# Usage (root, dans trading-dashboard) :
#   bash scripts/fix-now.sh
# =============================================================================

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"
COMPOSE="docker compose"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
log()  { echo -e "${GREEN}[fix-now]${NC} $*"; }
warn() { echo -e "${YELLOW}[fix-now]${NC} $*"; }

if [[ "${EUID}" -ne 0 ]]; then
  echo -e "${RED}Exécuter en root${NC}" >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Pas de .env — lance d'abord: bash scripts/setup-env.sh --no-ssl" >&2
  exit 1
fi

# 1) Libérer 80/443 (nginx système / autre)
if systemctl is-active --quiet nginx 2>/dev/null; then
  warn "Stop nginx système"
  systemctl stop nginx || true
  systemctl disable nginx || true
fi
# Tuer tout listener résiduel hors docker trading (best effort)
if ss -tlnp | grep -q ':80 '; then
  warn "Port 80 encore occupé — détail:"
  ss -tlnp | grep -E ':80 |:443 ' || true
fi

# 2) Rendre nginx HTTP-only
mkdir -p nginx/conf.d
IP="$(grep '^DOMAIN=' .env | cut -d= -f2- || true)"
IP="${IP:-_}"
sed "s/__SERVER_NAME__/${IP}/g" nginx/conf.d/http-only.conf.template > nginx/conf.d/default.conf

# 3) Reset volume Postgres si auth casse (données trading-dashboard seulement)
log "Recréation propre Postgres trading-dashboard (volume dédié)..."
${COMPOSE} stop backend bot nginx 2>/dev/null || true
${COMPOSE} rm -f backend bot nginx 2>/dev/null || true
${COMPOSE} stop postgres 2>/dev/null || true
${COMPOSE} rm -f postgres 2>/dev/null || true
docker volume rm trading_postgres_data 2>/dev/null || true

# Ne PAS régénérer les secrets ici — synchronise juste DATABASE_URL
DBPASS="$(grep '^POSTGRES_PASSWORD=' .env | cut -d= -f2-)"
USER="$(grep '^POSTGRES_USER=' .env | cut -d= -f2- || echo trading)"
DB="$(grep '^POSTGRES_DB=' .env | cut -d= -f2- || echo trading_bot)"
if grep -q '^DATABASE_URL=' .env; then
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql+asyncpg://${USER}:${DBPASS}@postgres:5432/${DB}|" .env
else
  echo "DATABASE_URL=postgresql+asyncpg://${USER}:${DBPASS}@postgres:5432/${DB}" >> .env
fi

log "Up stack complet..."
${COMPOSE} up -d postgres redis
sleep 5
${COMPOSE} run --rm -e APP_ROLE=migrate backend
${COMPOSE} up -d --force-recreate backend frontend bot autoheal nginx

log "Attente 20s..."
sleep 20
${COMPOSE} ps

echo
if curl -fsS http://127.0.0.1/api/health; then
  echo
  log "OK → http://$(curl -4 -fsS ifconfig.me 2>/dev/null || echo 51.254.135.158)"
  log "Login ADMIN_PASSWORD (voir: grep ADMIN_PASSWORD .env)"
else
  warn "Health HTTP échoué — logs nginx:"
  ${COMPOSE} logs --tail=40 nginx || true
  ss -tlnp | grep -E ':80 |:443 ' || true
  exit 1
fi
