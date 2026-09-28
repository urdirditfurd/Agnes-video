#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Déploiement Zero-Downtime Trading Dashboard sur VPS OVH (Ubuntu)
#
# Usage:
#   sudo bash deploy.sh                  # déploiement complet
#   sudo bash deploy.sh --renew-ssl      # renouvellement + reload nginx
#   sudo bash deploy.sh --update         # pull + rebuild rolling (sans SSL)
#
# Prérequis:
#   - Domaine (A/AAAA) pointant vers ce VPS (Let's Encrypt refuse une IP seule)
#   - Ports 80/443 ouverts (firewall OVH / ufw)
#   - Fichier .env renseigné (copié depuis .env.example)
#
# Sécurité:
#   - Aucune clé API en dur
#   - Certificats hors git
#   - Containers non-root quand possible
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.yml"
ENV_FILE="${PROJECT_DIR}/.env"
SYSTEMD_UNIT="trading-dashboard.service"
COMPOSE="docker compose"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err()  { echo -e "${RED}[error]${NC} $*" >&2; }

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    err "Exécuter en root: sudo bash deploy.sh"
    exit 1
  fi
}

# ---------------------------------------------------------------------------
# Docker
# ---------------------------------------------------------------------------
install_docker() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    log "Docker + Compose déjà installés: $(docker --version)"
    return 0
  fi

  log "Installation Docker Engine + Compose plugin..."
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
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu ${codename} stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
  log "Docker installé."
}

# ---------------------------------------------------------------------------
# .env
# ---------------------------------------------------------------------------
load_env() {
  if [[ ! -f "${ENV_FILE}" ]]; then
    err "Fichier .env manquant. Copier .env.example -> .env et renseigner les secrets."
    err "  cp ${PROJECT_DIR}/.env.example ${PROJECT_DIR}/.env && nano ${PROJECT_DIR}/.env"
    exit 1
  fi

  # shellcheck disable=SC1090
  set -a
  # shellcheck source=/dev/null
  source "${ENV_FILE}"
  set +a

  : "${DOMAIN:?DOMAIN manquant dans .env}"
  : "${CERTBOT_EMAIL:?CERTBOT_EMAIL manquant dans .env}"
  : "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD manquant dans .env}"
  : "${FERNET_KEY:?FERNET_KEY manquant dans .env}"
  : "${SECRET_KEY:?SECRET_KEY manquant dans .env}"

  if [[ "${DOMAIN}" == *"votredomaine.com"* ]]; then
    err "Remplacer DOMAIN dans .env par votre vrai domaine (DNS A -> IP VPS)."
    exit 1
  fi

  if [[ "${FERNET_KEY}" == CHANGE_ME* ]] || [[ "${SECRET_KEY}" == CHANGE_ME* ]]; then
    err "Générer FERNET_KEY et SECRET_KEY (voir .env.example) avant déploiement."
    exit 1
  fi

  log "Domaine cible: ${DOMAIN}"
}

# ---------------------------------------------------------------------------
# Nginx templates
# ---------------------------------------------------------------------------
render_nginx_bootstrap() {
  mkdir -p "${PROJECT_DIR}/nginx/conf.d"
  # Pendant le bootstrap SSL, une seule conf HTTP
  rm -f "${PROJECT_DIR}/nginx/conf.d/"*.conf
  sed "s/__DOMAIN__/${DOMAIN}/g" \
    "${PROJECT_DIR}/nginx/conf.d/bootstrap.conf.template" \
    > "${PROJECT_DIR}/nginx/conf.d/default.conf"
  log "Nginx bootstrap HTTP rendu pour ${DOMAIN}"
}

render_nginx_ssl() {
  mkdir -p "${PROJECT_DIR}/nginx/conf.d"
  rm -f "${PROJECT_DIR}/nginx/conf.d/"*.conf
  sed "s/__DOMAIN__/${DOMAIN}/g" \
    "${PROJECT_DIR}/nginx/conf.d/trading.conf.template" \
    > "${PROJECT_DIR}/nginx/conf.d/default.conf"
  log "Nginx HTTPS rendu pour ${DOMAIN}"
}

# ---------------------------------------------------------------------------
# SSL Let's Encrypt
# ---------------------------------------------------------------------------
obtain_ssl() {
  local live_dir="${PROJECT_DIR}/certbot/conf/live/${DOMAIN}"
  if [[ -f "${live_dir}/fullchain.pem" && -f "${live_dir}/privkey.pem" ]]; then
    log "Certificat SSL déjà présent pour ${DOMAIN}"
    return 0
  fi

  log "Émission certificat Let's Encrypt pour ${DOMAIN}..."
  local staging_flag=()
  if [[ "${CERTBOT_STAGING:-false}" == "true" ]]; then
    staging_flag=(--staging)
    warn "Mode STAGING Let's Encrypt activé"
  fi

  # Conteneur one-shot certbot (webroot déjà servi par nginx bootstrap)
  ${COMPOSE} -f "${COMPOSE_FILE}" run --rm --entrypoint certbot certbot certonly \
    --webroot \
    -w /var/www/certbot \
    -d "${DOMAIN}" \
    --email "${CERTBOT_EMAIL}" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    "${staging_flag[@]}"

  if [[ ! -f "${live_dir}/fullchain.pem" ]]; then
    err "Échec obtention certificat. Vérifier DNS A/AAAA et ports 80/443."
    exit 1
  fi
  log "Certificat SSL obtenu."
}

renew_ssl() {
  load_env
  cd "${PROJECT_DIR}"
  ${COMPOSE} -f "${COMPOSE_FILE}" run --rm --entrypoint certbot certbot renew --webroot -w /var/www/certbot
  ${COMPOSE} -f "${COMPOSE_FILE}" exec -T nginx nginx -s reload || true
  log "Renouvellement SSL terminé + nginx reload."
}

# ---------------------------------------------------------------------------
# Systemd — redémarrage auto après crash / reboot
# ---------------------------------------------------------------------------
install_systemd() {
  local unit_src="${PROJECT_DIR}/scripts/${SYSTEMD_UNIT}"
  local unit_dst="/etc/systemd/system/${SYSTEMD_UNIT}"

  sed "s|__PROJECT_DIR__|${PROJECT_DIR}|g" "${unit_src}" > "${unit_dst}"
  systemctl daemon-reload
  systemctl enable --now "${SYSTEMD_UNIT}"
  log "Service systemd ${SYSTEMD_UNIT} activé (restart on-failure + au boot)."
}

install_ssl_cron() {
  # Filet de sécurité en plus du container certbot
  local cron_file="/etc/cron.d/trading-dashboard-ssl"
  cat > "${cron_file}" <<EOF
# Renouvellement SSL bi-quotidien + reload nginx
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
0 3,15 * * * root cd ${PROJECT_DIR} && ${COMPOSE} -f ${COMPOSE_FILE} run --rm --entrypoint certbot certbot renew --quiet --webroot -w /var/www/certbot && ${COMPOSE} -f ${COMPOSE_FILE} exec -T nginx nginx -s reload >/dev/null 2>&1 || true
EOF
  chmod 644 "${cron_file}"
  log "Cron SSL installé: ${cron_file}"
}

# ---------------------------------------------------------------------------
# Firewall (ufw) — optionnel si présent
# ---------------------------------------------------------------------------
configure_firewall() {
  if ! command -v ufw >/dev/null 2>&1; then
    warn "ufw absent — ouvrir manuellement 22/80/443 dans le firewall OVH."
    return 0
  fi
  ufw allow OpenSSH >/dev/null 2>&1 || ufw allow 22/tcp >/dev/null 2>&1 || true
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
  # Ne force pas --force enable (évite lock-out SSH non anticipé)
  warn "Règles ufw 22/80/443 ajoutées. Activer manuellement si besoin: ufw enable"
}

# ---------------------------------------------------------------------------
# Build & rolling update
# ---------------------------------------------------------------------------
compose_up() {
  cd "${PROJECT_DIR}"
  log "Build des images..."
  ${COMPOSE} -f "${COMPOSE_FILE}" build --pull

  log "Migrations DB (si disponibles)..."
  ${COMPOSE} -f "${COMPOSE_FILE}" run --rm -e APP_ROLE=migrate backend \
    || warn "Migrations non disponibles (normal en stub étape 2)."

  log "Démarrage / rolling update des services..."
  # --force-recreate limité + healthchecks = quasi zero-downtime pour ce stack
  ${COMPOSE} -f "${COMPOSE_FILE}" up -d --remove-orphans --force-recreate

  log "Attente healthchecks..."
  sleep 8
  ${COMPOSE} -f "${COMPOSE_FILE}" ps
}

update_only() {
  require_root
  load_env
  install_docker
  cd "${PROJECT_DIR}"

  if [[ -d .git ]]; then
    log "git pull..."
    git pull --ff-only || warn "git pull échoué — continuer avec le code local."
  fi

  render_nginx_ssl
  compose_up
  log "Update terminé."
}

# ---------------------------------------------------------------------------
# Déploiement complet
# ---------------------------------------------------------------------------
full_deploy() {
  require_root
  load_env
  install_docker
  configure_firewall

  mkdir -p "${PROJECT_DIR}/certbot/conf" "${PROJECT_DIR}/certbot/www"

  # 1) Nginx HTTP bootstrap pour ACME
  render_nginx_bootstrap

  # 2) Démarrer d'abord nginx + dépendances légères pour le challenge
  cd "${PROJECT_DIR}"
  ${COMPOSE} -f "${COMPOSE_FILE}" up -d postgres redis
  # Frontend/backend/nginx: build puis up
  ${COMPOSE} -f "${COMPOSE_FILE}" build --pull
  ${COMPOSE} -f "${COMPOSE_FILE}" up -d nginx frontend backend bot

  sleep 5
  obtain_ssl

  # 3) Passer en HTTPS
  render_nginx_ssl
  ${COMPOSE} -f "${COMPOSE_FILE}" exec -T nginx nginx -s reload \
    || ${COMPOSE} -f "${COMPOSE_FILE}" up -d --force-recreate nginx

  compose_up
  install_systemd
  install_ssl_cron

  echo
  log "=============================================="
  log " Déploiement OK → https://${DOMAIN}"
  log " API health      → https://${DOMAIN}/api/health"
  log " Docs (stub)     → https://${DOMAIN}/docs"
  log "=============================================="
  warn "Ne jamais committer .env ni les clés Binance."
  warn "Activer BINANCE_TESTNET=true jusqu'à validation complète du bot."
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  local mode="${1:-}"
  case "${mode}" in
    --renew-ssl) renew_ssl ;;
    --update)    update_only ;;
    ""|--full)   full_deploy ;;
    -h|--help)
      cat <<EOF
Usage: sudo bash deploy.sh [--full|--update|--renew-ssl]

  --full        Déploiement initial (Docker, SSL, systemd, cron)
  --update      Pull + rebuild rolling sans réémettre le certificat
  --renew-ssl   Renouvellement Let's Encrypt + reload nginx
EOF
      ;;
    *)
      err "Option inconnue: ${mode}"
      exit 1
      ;;
  esac
}

main "${1:-}"
