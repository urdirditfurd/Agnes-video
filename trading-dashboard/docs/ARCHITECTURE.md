# Architecture — Trading Dashboard BTC/USDT (RSI + Bollinger)

## Objectif

Piloter, surveiller et automatiser un bot Binance BTC/USDT 24/7 via un dashboard
web, déployé sur VPS OVH avec Docker, Nginx et SSL Let's Encrypt.

**Étape courante : 1 (arborescence) + 2 (Docker / deploy).**  
Backend métier, schéma DB et frontend UI : en attente de validation.

---

## Arborescence complète

```text
trading-dashboard/
├── .env.example                 # Secrets / config (template)
├── .gitignore
├── README.md
├── docker-compose.yml           # Orchestration complète
├── deploy.sh                    # Bootstrap OVH + SSL + systemd
│
├── nginx/
│   ├── nginx.conf               # Master (upstreams, gzip, rate-limit)
│   ├── conf.d/
│   │   ├── bootstrap.conf.template   # HTTP ACME (pré-SSL)
│   │   └── trading.conf.template     # HTTPS + /api + /ws + frontend
│   └── ssl/                     # (réservé, gitignored)
│
├── certbot/
│   ├── conf/                    # /etc/letsencrypt (volume)
│   └── www/                     # webroot ACME
│
├── scripts/
│   ├── trading-dashboard.service    # systemd restart-on-boot
│   └── generate-secrets.sh          # FERNET_KEY + SECRET_KEY
│
├── docs/
│   └── ARCHITECTURE.md          # Ce fichier
│
├── backend/                     # FastAPI + moteur bot (même image)
│   ├── Dockerfile
│   ├── docker-entrypoint.sh     # APP_ROLE=api|bot|migrate
│   ├── requirements.txt
│   ├── alembic/                 # Migrations (étape 3)
│   │   └── versions/
│   └── app/
│       ├── main.py              # Stub API /health
│       ├── api/                 # Routes REST (étape 4)
│       ├── bot/
│       │   └── worker.py        # Stub worker + healthfile
│       ├── core/                # Config, security, Fernet (étape 4)
│       ├── models/              # SQLAlchemy (étape 3)
│       ├── services/            # Trading, exchange, PnL (étape 4)
│       └── websockets/          # Broadcast Redis → WS (étape 4)
│
├── frontend/                    # Next.js dashboard (étape 5)
│   ├── Dockerfile               # Multi-stage standalone
│   ├── package.json
│   ├── next.config.js           # output: "standalone"
│   ├── tsconfig.json
│   ├── public/
│   └── src/
│       ├── app/                 # App Router (pages)
│       ├── components/
│       │   ├── ui/              # Shadcn (étape 5)
│       │   ├── dashboard/
│       │   ├── charts/          # lightweight-charts
│       │   └── logs/
│       ├── hooks/
│       └── lib/
│
└── data/                        # Volumes locaux optionnels (gitignore)
```

---

## Diagramme des services

```text
Internet
   │
   ▼
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Nginx     │────▶│  Frontend    │     │   Certbot    │
│  :80/:443   │     │  Next.js     │     │  renew SSL   │
│  TLS + WS   │────▶│  :3000       │     └──────────────┘
└─────────────┘     └──────────────┘
   │ /api /ws
   ▼
┌─────────────┐     pub/sub      ┌──────────────┐
│  Backend    │◀────────────────▶│    Redis     │
│  FastAPI    │                  │  état + WS   │
│  :8000      │                  └──────────────┘
└──────┬──────┘
       │ SQL
       ▼
┌─────────────┐     lit Settings ┌──────────────┐
│ PostgreSQL  │◀─────────────────│  Bot Worker  │
│ trades/logs │   même image     │  APP_ROLE=bot│
│ settings/   │   que backend    │  ccxt loop   │
│ api_keys*   │                  └──────────────┘
└─────────────┘
 * api_keys chiffrées Fernet (étape 3-4)
```

---

## Principes de conception

| Sujet | Choix |
|--------|--------|
| Isolation API / Bot | Même image Docker, `APP_ROLE` différent → le bot ne bloque jamais uvicorn |
| Config à chaud | Table `settings` (+ cache Redis) lue en boucle par le worker |
| Temps réel | Redis pub/sub → Backend WS `/ws/` → Frontend |
| Secrets Binance | Jamais en clair en DB ; `cryptography.fernet` + `FERNET_KEY` env |
| SSL | Let's Encrypt via webroot ; cron + container certbot |
| Résilience | `restart: unless-stopped` sur **tous** les services + systemd |
| Healthchecks 24/7 | timings communs `30s / 10s / 3 / 40s` ; `python healthcheck.py` pour API + bot |
| Zero-downtime soft | `docker compose up -d` + healthchecks ; rebuild puis recreate ordonné |

### Healthchecks

| Service | Commande |
|---------|----------|
| `backend` / `bot` | `python healthcheck.py` (HTTP `/api/health` ou heartbeat fichier) |
| `frontend` | `wget` page locale (image Node) |
| `nginx` | `nginx -t` |
| `postgres` | `pg_isready` |
| `redis` | `redis-cli ping` |
| `certbot` | process loop vivant |

---

## Flux de déploiement OVH

1. DNS `A` du domaine → IP VPS (`51.254.135.158` dans votre cas).
2. `cp .env.example .env` + secrets (`scripts/generate-secrets.sh`).
3. `sudo bash deploy.sh` :
   - installe Docker si besoin
   - bootstrap Nginx HTTP (ACME)
   - obtient le certificat
   - bascule HTTPS
   - build/up de tous les services
   - installe systemd + cron SSL
4. Mises à jour suivantes : `sudo bash deploy.sh --update`

> **Note SSL :** Let's Encrypt ne délivre pas de certificat sur une IP nue.  
> Un domaine (ou sous-domaine) est obligatoire.

---

## Sécurité (checklist)

- [ ] `.env` hors git, permissions `600`
- [ ] `BINANCE_TESTNET=true` jusqu'à validation
- [ ] Pas de clés API dans les variables Compose en clair une fois le dashboard prêt
- [ ] Firewall : 22 (SSH clé), 80, 443 uniquement
- [ ] Désactiver login root password SSH (clés uniquement) — hors scope de ce repo
- [ ] Rotation `FERNET_KEY` = re-saisie des clés Binance

---

## Prochaines étapes

Déploiement VPS :
1. DNS `A` → IP OVH
2. `.env` renseigné (`scripts/generate-secrets.sh`)
3. `sudo bash deploy.sh`
4. Login dashboard avec `ADMIN_PASSWORD`
5. Saisir clés Binance (testnet) puis Start
