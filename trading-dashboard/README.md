# Trading Dashboard — Bot BTC/USDT (RSI + Bollinger)

Application complète pour piloter un bot Binance **24/7** sur VPS OVH (Docker).

## Fonctionnalités

| Zone | Contenu |
|------|---------|
| Dashboard | Statut bot, PnL j/s/total, position, chandelier TradingView |
| Contrôle | Start / Pause / Stop / Close market + paramètres à chaud |
| Historique | Trades, winrate, profit factor, logs WebSocket |
| Sécurité | Clés Binance chiffrées Fernet en PostgreSQL |

## Stack

FastAPI + worker bot · Next.js / Tailwind / UI Shadcn-style · PostgreSQL · Redis · Nginx · Certbot

## Déploiement OVH

```bash
cd trading-dashboard
cp .env.example .env
bash scripts/generate-secrets.sh   # coller dans .env
nano .env                          # DOMAIN, CERTBOT_EMAIL, ADMIN_PASSWORD, DB

# DNS A du DOMAIN → IP VPS
sudo bash deploy.sh
```

Mises à jour : `sudo bash deploy.sh --update`

## Local (dev)

```bash
make secrets          # générer clés
make up               # docker compose up --build
make test-backend     # pytest indicateurs + healthcheck
make build            # build frontend
```

## Stratégie par défaut

- Symbole `BTC/USDT` · timeframe `15m`
- Entrée : RSI(14) < 30 **et** close ≤ bande de Bollinger inférieure
- Taille `200$` · SL `2%` · TP `5%`
- Surchargeable depuis le dashboard (table `settings`)

## Sécurité

- Pas de secrets en dur (tout via `.env`)
- `BINANCE_TESTNET=true` jusqu’à validation
- Auth JWT (`ADMIN_PASSWORD`)
- Healthchecks + `restart: unless-stopped` sur tous les services

Docs : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
