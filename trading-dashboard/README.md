# Trading Dashboard — Bot BTC/USDT (RSI + Bollinger)

Dashboard web pour piloter un bot Binance **24/7** sur VPS OVH via Docker.

## Statut

- Étapes 1–2 : infrastructure Docker / Nginx / deploy
- **HA** : `restart: unless-stopped` + healthchecks uniformes (`python healthcheck.py` API/bot)
- Étapes 3–5 : schéma DB, backend FastAPI + worker, frontend SignalDesk

## Stack

| Couche | Techno |
|--------|--------|
| API + Bot | Python 3.12, FastAPI, worker séparé (`APP_ROLE=bot`) |
| Frontend | Next.js 15, Tailwind, lightweight-charts |
| Data | PostgreSQL 16, Redis 7 |
| Edge | Nginx + Certbot (Let's Encrypt) |
| Host | Docker Compose + systemd sur Ubuntu OVH |

## Démarrage rapide (VPS)

```bash
cd trading-dashboard
cp .env.example .env
bash scripts/generate-secrets.sh   # coller FERNET_KEY + SECRET_KEY dans .env
nano .env                          # DOMAIN, CERTBOT_EMAIL, ADMIN_PASSWORD, DB

# DNS A du DOMAIN → IP VPS, puis :
sudo bash deploy.sh
```

## Sécurité

- Aucune clé API en dur ; saisie dashboard → Fernet → PostgreSQL
- `BINANCE_TESTNET=true` jusqu'à validation
- Auth JWT via `ADMIN_PASSWORD`

## Docs

Voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
