#!/usr/bin/env bash
# =============================================================================
# setup-env.sh — prépare .env pour déploiement VPS (secrets + validation)
#
# Usage:
#   bash scripts/setup-env.sh --no-ssl
#   bash scripts/setup-env.sh --ssl
# =============================================================================

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT}/.env"
EXAMPLE="${ROOT}/.env.example"
MODE="${1:---no-ssl}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
log()  { echo -e "${GREEN}[setup-env]${NC} $*"; }
warn() { echo -e "${YELLOW}[setup-env]${NC} $*"; }
err()  { echo -e "${RED}[setup-env]${NC} $*" >&2; }

if [[ ! -f "${EXAMPLE}" ]]; then
  err "Fichier .env.example introuvable"
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  cp "${EXAMPLE}" "${ENV_FILE}"
  log "Créé ${ENV_FILE} depuis .env.example"
else
  log "Fichier .env existant — mise à jour des champs critiques"
fi

# Secrets
SECRETS="$(python3 - <<'PY'
import base64, os, secrets
print(base64.urlsafe_b64encode(os.urandom(32)).decode())
print(secrets.token_hex(32))
print(secrets.token_urlsafe(18))
PY
)"
FERNET_KEY="$(echo "${SECRETS}" | sed -n '1p')"
SECRET_KEY="$(echo "${SECRETS}" | sed -n '2p')"
ADMIN_PASSWORD="$(echo "${SECRETS}" | sed -n '3p')"
DB_PASSWORD="$(python3 - <<'PY'
import secrets
print(secrets.token_urlsafe(24))
PY
)"

detect_ip() {
  curl -4 -fsS ifconfig.me 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1"
}

set_kv() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "${ENV_FILE}"; then
    # Escape sed specials in value minimally
    local esc
    esc="$(printf '%s' "${value}" | sed -e 's/[\/&]/\\&/g')"
    sed -i "s/^${key}=.*/${key}=${esc}/" "${ENV_FILE}"
  else
    echo "${key}=${value}" >> "${ENV_FILE}"
  fi
}

set_kv "FERNET_KEY" "${FERNET_KEY}"
set_kv "SECRET_KEY" "${SECRET_KEY}"
set_kv "ADMIN_PASSWORD" "${ADMIN_PASSWORD}"
set_kv "POSTGRES_PASSWORD" "${DB_PASSWORD}"
set_kv "POSTGRES_USER" "trading"
set_kv "POSTGRES_DB" "trading_bot"
set_kv "DATABASE_URL" "postgresql+asyncpg://trading:${DB_PASSWORD}@postgres:5432/trading_bot"
set_kv "REDIS_URL" "redis://redis:6379/0"
set_kv "BINANCE_TESTNET" "true"
set_kv "LOG_LEVEL" "INFO"
set_kv "TZ" "Europe/Paris"

case "${MODE}" in
  --no-ssl)
    IP="$(detect_ip)"
    set_kv "DOMAIN" "${IP}"
    set_kv "CERTBOT_EMAIL" "admin@localhost"
    set_kv "CERTBOT_STAGING" "false"
    set_kv "CORS_ORIGINS" "*"
    set_kv "ENABLE_SSL" "false"
    log "Mode NO-SSL — DOMAIN=${IP}, CORS=*"
    ;;
  --ssl)
    warn "Éditez DOMAIN et CERTBOT_EMAIL dans .env avant deploy.sh --full"
    set_kv "ENABLE_SSL" "true"
    set_kv "CORS_ORIGINS" "https://CHANGEME"
    ;;
  *)
    err "Usage: bash scripts/setup-env.sh [--no-ssl|--ssl]"
    exit 1
    ;;
esac

chmod 600 "${ENV_FILE}"

echo
log "=============================================="
log " .env prêt (${ENV_FILE})"
log " ADMIN_PASSWORD = ${ADMIN_PASSWORD}"
warn " Notez ce mot de passe maintenant (non réaffiché)."
log " Ensuite:"
if [[ "${MODE}" == "--no-ssl" ]]; then
  log "   bash deploy.sh --no-ssl"
else
  log "   nano .env   # DOMAIN + CERTBOT_EMAIL"
  log "   bash deploy.sh --full"
fi
log "=============================================="
