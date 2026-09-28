# Trading Dashboard — Bot BTC/USDT (RSI + Bollinger)

Dashboard web pour piloter un bot Binance **24/7** sur VPS OVH via Docker.

> **Statut :** étapes **1 (arborescence)** et **2 (Docker / Nginx / deploy)** livrées.  
> Backend métier, DB et UI : **en attente de votre validation**.

## Stack

| Couche | Techno |
|--------|--------|
| API + Bot | Python 3.12, FastAPI, worker séparé (`APP_ROLE=bot`) |
| Frontend | Next.js 15 (stub), Tailwind + Shadcn à l'étape 5 |
| Data | PostgreSQL 16, Redis 7 |
| Edge | Nginx + Certbot (Let's Encrypt) |
| Host | Docker Compose + systemd sur Ubuntu OVH |

## Démarrage rapide (VPS)

```bash
# 1. Sur le VPS (après clone du repo)
cd trading-dashboard
cp .env.example .env
bash scripts/generate-secrets.sh   # coller FERNET_KEY + SECRET_KEY dans .env
nano .env                          # DOMAIN, CERTBOT_EMAIL, mots de passe DB

# 2. DNS : enregistrement A du DOMAIN → IP du VPS
# 3. Déploiement
sudo bash deploy.sh
```

Mises à jour :

```bash
sudo bash deploy.sh --update
sudo bash deploy.sh --renew-ssl
```

## Documentation

- Architecture & arborescence : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Variables : [`.env.example`](.env.example)

## Sécurité

- Aucune clé API en dur dans le code.
- Binance keys : saisie via dashboard + chiffrement Fernet (étape 4).
- Garder `BINANCE_TESTNET=true` jusqu'à validation complète.
