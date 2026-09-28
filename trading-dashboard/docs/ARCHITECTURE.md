# Architecture — Trading Dashboard BTC/USDT (RSI + Bollinger)

## Objectif

Piloter, surveiller et automatiser un bot Binance BTC/USDT 24/7 via un dashboard
web, déployé sur VPS OVH avec Docker, Nginx et SSL Let's Encrypt.

**Statut : projet terminé** (infra + HA + DB + API/bot + frontend).

---

## Arborescence

```text
trading-dashboard/
├── .env.example / .gitignore / README.md / Makefile
├── docker-compose.yml / deploy.sh
├── nginx/          # reverse proxy TLS + WebSockets
├── certbot/        # Let's Encrypt volumes
├── scripts/        # systemd + generate-secrets.sh
├── docs/
├── backend/
│   ├── Dockerfile / docker-entrypoint.sh / healthcheck.py
│   ├── alembic/ + versions/0001_initial.py
│   ├── tests/      # indicateurs + healthcheck
│   └── app/
│       ├── api/routes.py
│       ├── bot/{engine,worker}.py
│       ├── core/{config,auth,database,security,redis_client}.py
│       ├── models / schemas / services / websockets
└── frontend/
    ├──Dockerfile / components.json
    └── src/
        ├── app/{page,login,control,history,security}
        ├── components/{ui,dashboard,charts,logs}
        ├── hooks/useBotStream.ts
        └── lib/{api,utils}.ts
```

---

## Services

```text
Internet → Nginx (:80/:443)
              ├─ /           → frontend:3000
              ├─ /api/       → backend:8000
              └─ /ws/        → backend WS (Redis pub/sub)
backend ←→ postgres + redis ←→ bot worker (APP_ROLE=bot)
```

## HA 24/7

| Mécanisme | Détail |
|-----------|--------|
| Restart | `restart: unless-stopped` sur tous les services |
| Healthchecks | `30s / 10s / 3 retries / start_period 40s` |
| API + Bot | `python healthcheck.py` |
| Autoheal | `willfarrell/autoheal` recrée les containers `autoheal=true` si unhealthy |
| Systemd | `trading-dashboard.service` au boot |
| SSL | optionnel (`deploy.sh --full`) ; démarrage IP via `--no-ssl` |
| Limites RAM | `mem_limit` par service pour éviter OOM host |

## Config à chaud

Table `settings` (singleton id=1) lue à chaque cycle bot (~15s).  
Modifiable via `PUT /api/settings` depuis le dashboard.

## Sécurité

- Secrets uniquement via `.env`
- Clés Binance : Fernet → `api_credentials`
- JWT admin
- Testnet par défaut
