#!/usr/bin/env bash
# =============================================================================
# takeover-ports.sh — libère les ports 80/443 (ex: ancienne app Prospection)
# puis prépare le déploiement du Trading Dashboard.
#
# Usage (en root sur le VPS) :
#   cd ~/Agnes-video/trading-dashboard
#   bash scripts/takeover-ports.sh
#   bash scripts/setup-env.sh --no-ssl
#   bash deploy.sh --no-ssl
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
log()  { echo -e "${GREEN}[takeover]${NC} $*"; }
warn() { echo -e "${YELLOW}[takeover]${NC} $*"; }
err()  { echo -e "${RED}[takeover]${NC} $*" >&2; }

if [[ "${EUID}" -ne 0 ]]; then
  err "Exécuter en root"
  exit 1
fi

log "Processus / containers sur les ports 80 et 443 :"
echo "----- ss -----"
ss -tlnp | grep -E ':80 |:443 ' || warn "Aucun listener détecté via ss"
echo "----- docker ps (publish 80/443) -----"
docker ps --format 'table {{.ID}}\t{{.Names}}\t{{.Ports}}\t{{.Status}}' 2>/dev/null | head -50 || true

# 1) Nginx système (hors Docker) — souvent reverse-proxy de l'ancienne app
if systemctl is-active --quiet nginx 2>/dev/null; then
  warn "Nginx système actif → stop + disable (libère 80/443)"
  systemctl stop nginx || true
  systemctl disable nginx || true
fi

# 2) Apache éventuel
if systemctl is-active --quiet apache2 2>/dev/null; then
  warn "Apache2 actif → stop + disable"
  systemctl stop apache2 || true
  systemctl disable apache2 || true
fi

# 3) Containers Docker qui publient 80 ou 443
mapfile -t CONFLICTS < <(
  docker ps --format '{{.ID}} {{.Names}} {{.Ports}}' 2>/dev/null \
    | grep -E '0\.0\.0\.0:80->|:::80->|0\.0\.0\.0:443->|:::443->' \
    | awk '{print $1}' || true
)

if [[ "${#CONFLICTS[@]}" -gt 0 ]]; then
  warn "Arrêt des containers qui exposent 80/443 :"
  for id in "${CONFLICTS[@]}"; do
    name="$(docker inspect -f '{{.Name}}' "$id" 2>/dev/null | sed 's#^/##')"
    # Ne pas stopper notre futur stack trading si déjà partiellement up
    if [[ "${name}" == trading* || "${name}" == *trading-dashboard* ]]; then
      log "Conserve ${name} (stack trading)"
      continue
    fi
    log "docker stop ${name:-$id}"
    docker stop "$id" || true
  done
else
  log "Aucun container Docker en conflit 80/443"
fi

# 4) Compose projects connus (prospection / anciens stacks)
for dir in \
  /root/prospection \
  /root/Prospection \
  /var/www/prospection \
  /opt/prospection \
  /root/*/prospection \
  /root/*prospection*
do
  if [[ -d "$dir" && -f "$dir/docker-compose.yml" ]]; then
    warn "docker compose down dans $dir"
    (cd "$dir" && docker compose down || docker-compose down || true)
  fi
done

# Cherche des services systemd liés à prospection
for unit in prospection.service prospection-dashboard.service agent-prospection.service; do
  if systemctl list-unit-files 2>/dev/null | grep -q "^${unit}"; then
    warn "Disable systemd ${unit}"
    systemctl stop "${unit}" || true
    systemctl disable "${unit}" || true
  fi
done

sleep 1
echo
log "État après libération :"
ss -tlnp | grep -E ':80 |:443 ' || log "Ports 80/443 libres ✓"

echo
log "Étapes suivantes :"
echo "  cd ~/Agnes-video/trading-dashboard"
echo "  git pull --ff-only"
echo "  bash scripts/setup-env.sh --no-ssl"
echo "  bash deploy.sh --no-ssl"
echo "  # Ouvrir http://$(curl -4 -fsS ifconfig.me 2>/dev/null || echo 51.254.135.158)"
