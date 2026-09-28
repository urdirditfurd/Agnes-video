#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Déploiement Trading Dashboard sur VPS OVH (Ubuntu)
#
# Usage:
#   bash deploy.sh --no-ssl     # HTTP sur IP (pas de domaine requis) ← recommandé pour démarrer
#   bash deploy.sh --full       # HTTPS Let's Encrypt (domaine DNS requis)
#   bash deploy.sh --update     # pull + rebuild
#   bash deploy.sh --renew-ssl  # renouvellement certificat
#
# Exemple immédiat (votre VPS) :
#   cd ~/Agnes-video/trading-dashboard
#   bash scripts/setup-env.sh --no-ssl
#   bash deploy.sh --no-ssl
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.yml"
ENV_FILE="${PROJECT_DIR}/.env"
SYSTEMD_UNIT="trading-dashboard.service"
COMPOSE="docker compose"
ENABLE_SSL=true

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err()  { echo -e "${RED}[error]${NC} $*" >&2; }

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    err "Exécuter en root (vous l'êtes déjà sur OVH en root@...)."
    exit 1
  fi
}

install_docker() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    log "Docker OK: $(docker --version)"
    return 0
  fi
  log "Installation Docker Engine + Compose..."
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg lsb-release
  install -m 0755 -d /etc/apt/keyrings
  if [[ ! -f /etc/apt/keyrings/docker.gpg ]]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
      | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
  fi
  local codename
  codename="$(. /etc/os-release && echo "${VERSION_CODENAME}")"
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${codename} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
}

load_env() {
  if [[ ! -f "${ENV_FILE}" ]]; then
    err ".env manquant. Lancez: bash scripts/setup-env.sh --no-ssl"
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a

  : "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD manquant}"
  : "${FERNET_KEY:?FERNET_KEY manquant}"
  : "${SECRET_KEY:?SECRET_KEY manquant}"
  : "${ADMIN_PASSWORD:?ADMIN_PASSWORD manquant}"

  if [[ "${FERNET_KEY}" == CHANGE_ME* ]] || [[ "${SECRET_KEY}" == CHANGE_ME* ]] || [[ "${ADMIN_PASSWORD}" == CHANGE_ME* ]]; then
    err "Secrets CHANGE_ME détectés. Relancer: bash scripts/setup-env.sh --no-ssl"
    exit 1
  fi

  if [[ "${ENABLE_SSL}" == "true" ]]; then
    : "${DOMAIN:?DOMAIN manquant}"
    : "${CERTBOT_EMAIL:?CERTBOT_EMAIL manquant}"
    if [[ "${DOMAIN}" == *"votredomaine.com"* ]] || [[ "${DOMAIN}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      err "Mode SSL: DOMAIN doit être un vrai nom de domaine (pas IP / pas placeholder)."
      err "Sans domaine: bash deploy.sh --no-ssl"
      exit 1
    fi
    log "Mode SSL — domaine: ${DOMAIN}"
  else
    DOMAIN="${DOMAIN:-_}"
    log "Mode NO-SSL — HTTP (server_name=${DOMAIN})"
  fi
}

render_nginx_http_only() {
  mkdir -p "${PROJECT_DIR}/nginx/conf.d"
  rm -f "${PROJECT_DIR}/nginx/conf.d/"*.conf
  local server_name="${DOMAIN}"
  if [[ -z "${server_name}" || "${server_name}" == *"votredomaine.com"* ]]; then
    server_name="_"
  fi
  sed "s/__SERVER_NAME__/${server_name}/g" \
    "${PROJECT_DIR}/nginx/conf.d/http-only.conf.template" \
    > "${PROJECT_DIR}/nginx/conf.d/default.conf"
  log "Nginx HTTP-only rendu (server_name=${server_name})"
}

render_nginx_bootstrap() {
  mkdir -p "${PROJECT_DIR}/nginx/conf.d"
  rm -f "${PROJECT_DIR}/nginx/conf.d/"*.conf
  sed "s/__DOMAIN__/${DOMAIN}/g" \
    "${PROJECT_DIR}/nginx/conf.d/bootstrap.conf.template" \
    > "${PROJECT_DIR}/nginx/conf.d/default.conf"
}

render_nginx_ssl() {
  mkdir -p "${PROJECT_DIR}/nginx/conf.d"
  rm -f "${PROJECT_DIR}/nginx/conf.d/"*.conf
  sed "s/__DOMAIN__/${DOMAIN}/g" \
    "${PROJECT_DIR}/nginx/conf.d/trading.conf.template" \
    > "${PROJECT_DIR}/nginx/conf.d/default.conf"
}

obtain_ssl() {
  local live_dir="${PROJECT_DIR}/certbot/conf/live/${DOMAIN}"
  if [[ -f "${live_dir}/fullchain.pem" ]]; then
    log "Certificat déjà présent pour ${DOMAIN}"
    return 0
  fi
  local staging_flag=()
  if [[ "${CERTBOT_STAGING:-false}" == "true" ]]; then
    staging_flag=(--staging)
  fi
  ${COMPOSE} --profile ssl -f "${COMPOSE_FILE}" run --rm --entrypoint certbot certbot certonly \
    --webroot -w /var/www/certbot -d "${DOMAIN}" \
    --email "${CERTBOT_EMAIL}" --agree-tos --no-eff-email --non-interactive \
    "${staging_flag[@]}"
  [[ -f "${live_dir}/fullchain.pem" ]] || { err "Échec SSL — vérifier DNS A → IP VPS"; exit 1; }
}

renew_ssl() {
  ENABLE_SSL=true
  load_env
  cd "${PROJECT_DIR}"
  ${COMPOSE} --profile ssl -f "${COMPOSE_FILE}" run --rm --entrypoint certbot certbot renew --webroot -w /var/www/certbot
  ${COMPOSE} -f "${COMPOSE_FILE}" exec -T nginx nginx -s reload || true
}

install_systemd() {
  sed "s|__PROJECT_DIR__|${PROJECT_DIR}|g" \
    "${PROJECT_DIR}/scripts/${SYSTEMD_UNIT}" \
    > "/etc/systemd/system/${SYSTEMD_UNIT}"
  systemctl daemon-reload
  systemctl enable --now "${SYSTEMD_UNIT}"
  log "systemd ${SYSTEMD_UNIT} activé"
}

install_ssl_cron() {
  cat > /etc/cron.d/trading-dashboard-ssl <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
0 3,15 * * * root cd ${PROJECT_DIR} && ${COMPOSE} --profile ssl -f ${COMPOSE_FILE} run --rm --entrypoint certbot certbot renew --quiet --webroot -w /var/www/certbot && ${COMPOSE} -f ${COMPOSE_FILE} exec -T nginx nginx -s reload >/dev/null 2>&1 || true
EOF
  chmod 644 /etc/cron.d/trading-dashboard-ssl
}

configure_firewall() {
  if ! command -v ufw >/dev/null 2>&1; then
    warn "ufw absent — ouvrir 22/80 (et 443 si SSL) dans le firewall OVH"
    return 0
  fi
  ufw allow OpenSSH >/dev/null 2>&1 || ufw allow 22/tcp >/dev/null 2>&1 || true
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
  warn "Règles ufw ajoutées (activer manuellement: ufw enable)"
}

compose_up() {
  cd "${PROJECT_DIR}"
  local profile_args=()
  if [[ "${ENABLE_SSL}" == "true" ]]; then
    profile_args=(--profile ssl)
  fi

  # Libérer 80/443 si nginx système encore actif
  if systemctl is-active --quiet nginx 2>/dev/null; then
    warn "Nginx système encore actif → stop"
    systemctl stop nginx || true
    systemctl disable nginx || true
  fi

  log "Build images..."
  ${COMPOSE} "${profile_args[@]}" -f "${COMPOSE_FILE}" build --pull

  log "Migrations..."
  if ! ${COMPOSE} -f "${COMPOSE_FILE}" run --rm -e APP_ROLE=migrate backend; then
    warn "Migrations échouées (souvent mismatch mot de passe Postgres)."
    warn "Correction: bash scripts/fix-now.sh"
    # Continue quand même pour démarrer nginx si possible
  fi

  log "Up services (+ autoheal + nginx)..."
  ${COMPOSE} "${profile_args[@]}" -f "${COMPOSE_FILE}" up -d --remove-orphans --force-recreate

  # Nginx parfois resté en Created après un échec de bind précédent
  ${COMPOSE} -f "${COMPOSE_FILE}" up -d --force-recreate nginx || true

  log "Attente healthchecks (45s)..."
  sleep 45
  ${COMPOSE} "${profile_args[@]}" -f "${COMPOSE_FILE}" ps

  if ! curl -fsS http://127.0.0.1/api/health >/dev/null 2>&1 \
     && ! curl -fk https://127.0.0.1/api/health >/dev/null 2>&1; then
    warn "Port 80 inaccessible — état nginx:"
    ${COMPOSE} -f "${COMPOSE_FILE}" ps nginx || true
    ss -tlnp | grep -E ':80 |:443 ' || warn "Rien n'écoute sur 80/443"
  fi
}

wait_http_health() {
  local base="$1"
  local i
  for i in $(seq 1 30); do
    if curl -fsS "${base}/api/health" >/dev/null 2>&1; then
      log "API healthy: ${base}/api/health"
      return 0
    fi
    sleep 2
  done
  warn "API pas encore healthy — vérifier: docker compose logs backend"
  return 1
}

deploy_no_ssl() {
  require_root
  ENABLE_SSL=false
  load_env
  install_docker
  configure_firewall
  mkdir -p "${PROJECT_DIR}/certbot/conf" "${PROJECT_DIR}/certbot/www"
  render_nginx_http_only
  compose_up
  install_systemd

  local host="${DOMAIN}"
  if [[ "${host}" == "_" || -z "${host}" ]]; then
    host="$(curl -4 -fsS ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
  fi
  wait_http_health "http://127.0.0.1" || true

  echo
  log "=============================================="
  log " Déploiement NO-SSL OK"
  log " Dashboard → http://${host}"
  log " API       → http://${host}/api/health"
  log " Docs      → http://${host}/docs"
  log " Login     → ADMIN_PASSWORD (dans .env)"
  log "=============================================="
  warn "HTTP non chiffré — à réserver au test / réseau de confiance."
  warn "Plus tard avec domaine: bash scripts/setup-env.sh && bash deploy.sh --full"
  warn "Garder BINANCE_TESTNET=true jusqu'à validation."
}

full_deploy() {
  require_root
  ENABLE_SSL=true
  load_env
  install_docker
  configure_firewall
  mkdir -p "${PROJECT_DIR}/certbot/conf" "${PROJECT_DIR}/certbot/www"
  render_nginx_bootstrap
  cd "${PROJECT_DIR}"
  ${COMPOSE} -f "${COMPOSE_FILE}" up -d postgres redis
  ${COMPOSE} -f "${COMPOSE_FILE}" build --pull
  ${COMPOSE} -f "${COMPOSE_FILE}" up -d nginx frontend backend bot autoheal
  sleep 5
  obtain_ssl
  render_nginx_ssl
  ${COMPOSE} -f "${COMPOSE_FILE}" exec -T nginx nginx -s reload \
    || ${COMPOSE} -f "${COMPOSE_FILE}" up -d --force-recreate nginx
  compose_up
  install_systemd
  install_ssl_cron
  wait_http_health "https://${DOMAIN}" || true
  echo
  log "=============================================="
  log " Déploiement SSL OK → https://${DOMAIN}"
  log "=============================================="
}

update_only() {
  require_root
  # Détecte le mode depuis la conf nginx actuelle
  if grep -q "ssl_certificate" "${PROJECT_DIR}/nginx/conf.d/default.conf" 2>/dev/null; then
    ENABLE_SSL=true
  else
    ENABLE_SSL=false
  fi
  load_env
  install_docker
  cd "${PROJECT_DIR}"
  if [[ -d "${PROJECT_DIR}/../.git" ]]; then
    log "git pull (repo parent)..."
    git -C "${PROJECT_DIR}/.." pull --ff-only || warn "git pull échoué"
  elif [[ -d "${PROJECT_DIR}/.git" ]]; then
    git -C "${PROJECT_DIR}" pull --ff-only || warn "git pull échoué"
  fi
  if [[ "${ENABLE_SSL}" == "true" ]]; then
    render_nginx_ssl
  else
    render_nginx_http_only
  fi
  compose_up
  log "Update terminé."
}

main() {
  local mode="${1:-}"
  case "${mode}" in
    --no-ssl)    deploy_no_ssl ;;
    --renew-ssl) renew_ssl ;;
    --update)    update_only ;;
    ""|--full)   full_deploy ;;
    -h|--help)
      cat <<EOF
Usage: bash deploy.sh [--no-ssl|--full|--update|--renew-ssl]

  --no-ssl      HTTP sur IP/domaine (pas de Let's Encrypt) — démarrage rapide VPS
  --full        HTTPS Let's Encrypt (DNS A requis)
  --update      Rebuild rolling (conserve le mode SSL/HTTP actuel)
  --renew-ssl   Renouvelle le certificat
EOF
      ;;
    *)
      err "Option inconnue: ${mode} (voir --help)"
      exit 1
      ;;
  esac
}

main "${1:-}"
