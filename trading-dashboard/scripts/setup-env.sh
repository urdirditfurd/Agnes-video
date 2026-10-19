#!/usr/bin/env bash
# =============================================================================
# setup-env.sh — prépare .env (ne casse PAS le mot de passe Postgres existant)
#
# Usage:
#   bash scripts/setup-env.sh --no-ssl
#   bash scripts/setup-env.sh --no-ssl --force-secrets   # régénère tout
# =============================================================================

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT}/.env"
EXAMPLE="${ROOT}/.env.example"
MODE="--no-ssl"
FORCE_SECRETS=false

for arg in "$@"; do
  case "$arg" in
    --no-ssl|--ssl) MODE="$arg" ;;
    --force-secrets) FORCE_SECRETS=true ;;
    -h|--help)
      echo "Usage: bash scripts/setup-env.sh [--no-ssl|--ssl] [--force-secrets]"
      exit 0
      ;;
  esac
done

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
log()  { echo -e "${GREEN}[setup-env]${NC} $*"; }
warn() { echo -e "${YELLOW}[setup-env]${NC} $*"; }
err()  { echo -e "${RED}[setup-env]${NC} $*" >&2; }

get_kv() {
  local key="$1"
  if [[ -f "${ENV_FILE}" ]] && grep -q "^${key}=" "${ENV_FILE}"; then
    grep "^${key}=" "${ENV_FILE}" | head -1 | cut -d= -f2-
  fi
}

is_placeholder() {
  local v="$1"
  [[ -z "$v" || "$v" == CHANGE_ME* || "$v" == *"votredomaine.com"* || "$v" == "https://CHANGEME" ]]
}

if [[ ! -f "${EXAMPLE}" ]]; then
  err "Fichier .env.example introuvable"
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  cp "${EXAMPLE}" "${ENV_FILE}"
  log "Créé ${ENV_FILE} depuis .env.example"
else
  log "Fichier .env existant — conservation des secrets déjà valides"
fi

detect_ip() {
  curl -4 -fsS ifconfig.me 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1"
}

set_kv() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "${ENV_FILE}"; then
    local esc
    esc="$(printf '%s' "${value}" | sed -e 's/[\/&]/\\&/g')"
    sed -i "s|^${key}=.*|${key}=${esc}|" "${ENV_FILE}"
  else
    echo "${key}=${value}" >> "${ENV_FILE}"
  fi
}

gen_fernet() {
  python3 - <<'PY'
import base64, os
print(base64.urlsafe_b64encode(os.urandom(32)).decode())
PY
}
gen_secret() {
  python3 - <<'PY'
import secrets
print(secrets.token_hex(32))
PY
}
gen_password() {
  python3 - <<'PY'
import secrets
print(secrets.token_urlsafe(18))
PY
}

# --- Secrets : ne régénère que si placeholder / --force-secrets ---
CUR_FERNET="$(get_kv FERNET_KEY)"
CUR_SECRET="$(get_kv SECRET_KEY)"
CUR_ADMIN="$(get_kv ADMIN_PASSWORD)"
CUR_DBPASS="$(get_kv POSTGRES_PASSWORD)"

if [[ "${FORCE_SECRETS}" == "true" ]] || is_placeholder "${CUR_FERNET}"; then
  set_kv "FERNET_KEY" "$(gen_fernet)"
  log "FERNET_KEY généré"
else
  log "FERNET_KEY conservé"
fi

if [[ "${FORCE_SECRETS}" == "true" ]] || is_placeholder "${CUR_SECRET}"; then
  set_kv "SECRET_KEY" "$(gen_secret)"
  log "SECRET_KEY généré"
else
  log "SECRET_KEY conservé"
fi

if [[ "${FORCE_SECRETS}" == "true" ]] || is_placeholder "${CUR_ADMIN}"; then
  ADMIN_PASSWORD="$(gen_password)"
  set_kv "ADMIN_PASSWORD" "${ADMIN_PASSWORD}"
  log "ADMIN_PASSWORD généré"
else
  ADMIN_PASSWORD="${CUR_ADMIN}"
  log "ADMIN_PASSWORD conservé"
fi

# Postgres : critique — le volume garde le 1er mot de passe
if [[ "${FORCE_SECRETS}" == "true" ]] || is_placeholder "${CUR_DBPASS}"; then
  DB_PASSWORD="$(gen_password)"
  set_kv "POSTGRES_PASSWORD" "${DB_PASSWORD}"
  warn "POSTGRES_PASSWORD généré — si un volume DB existe déjà, faire: docker compose down -v"
else
  DB_PASSWORD="${CUR_DBPASS}"
  log "POSTGRES_PASSWORD conservé (évite le mismatch volume Docker)"
fi

set_kv "POSTGRES_USER" "trading"
set_kv "POSTGRES_DB" "trading_bot"
# Toujours resynchroniser DATABASE_URL avec le mot de passe actuel
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
    log "Mode NO-SSL — DOMAIN=${IP}"
    ;;
  --ssl)
    warn "Éditez DOMAIN et CERTBOT_EMAIL dans .env avant deploy.sh --full"
    set_kv "ENABLE_SSL" "true"
    ;;
esac

chmod 600 "${ENV_FILE}"

echo
log "=============================================="
log " .env prêt"
log " ADMIN_PASSWORD = ${ADMIN_PASSWORD}"
warn " Notez ce mot de passe."
log " Ensuite: bash deploy.sh --no-ssl"
log "=============================================="
