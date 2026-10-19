# Trading Dashboard — Bot BTC/USDT (RSI + Bollinger)

Dashboard + bot Binance 24/7 sur VPS OVH (Docker).

## Déploiement immédiat (VPS, SANS domaine)

Sur le VPS après SSH :

```bash
cd ~/Agnes-video
git fetch origin
git checkout cursor/trading-dashboard-infra-129e
git pull --ff-only

cd trading-dashboard
bash scripts/setup-env.sh --no-ssl
# → affiche ADMIN_PASSWORD (à noter)

bash deploy.sh --no-ssl
```

Ouvrir : `http://51.254.135.158` (ou l’IP affichée)  
Login : `ADMIN_PASSWORD` généré par `setup-env.sh`

## Déploiement HTTPS (avec domaine)

```bash
bash scripts/setup-env.sh --ssl
nano .env   # DOMAIN=trading.example.com + CERTBOT_EMAIL
# DNS A → IP VPS, puis :
bash deploy.sh --full
```

## Stack

| Couche | Techno |
|--------|--------|
| API + Bot | FastAPI + worker (`APP_ROLE=bot`) |
| Frontend | Next.js + Tailwind + UI Shadcn-style |
| Data | PostgreSQL 16 + Redis 7 |
| Edge | Nginx (+ Certbot si SSL) |
| HA | `restart: unless-stopped` + healthchecks + **autoheal** |

## Stratégie

BTC/USDT 15m · RSI(14)<30 + close ≤ BB lower · 200$ · SL 2% · TP 5%

## Commandes utiles

```bash
docker compose ps
docker compose logs -f bot backend
bash deploy.sh --update
make test-backend
```

Docs : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · Issues connues : [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md)
