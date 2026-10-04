# Known Issues — Trading Dashboard

## Déploiement

| Issue | Mitigation |
|-------|------------|
| Let's Encrypt refuse une IP nue | Utiliser `bash deploy.sh --no-ssl` ou un vrai domaine DNS A |
| Secrets collés dans un chat | Régénérer via `bash scripts/setup-env.sh --no-ssl` |
| `Healthcheck unhealthy` sans restart | Conteneur `autoheal` recrée les services labelisés |
| CORS bloqué en HTTP/IP | `CORS_ORIGINS=*` (défini par setup-env --no-ssl) |

## VPS OVH observé

| Signal | Risque | Action recommandée (hors app) |
|--------|--------|--------------------------------|
| ~1200 processus zombies | Charge / fuites d’autres services | `ps aux \| awk '$8~/Z/' \| wc -l` puis investiguer parents |
| Disque ~68% | Builds Docker peuvent échouer | `docker system prune -af` (attention images unused) |
| « System restart required » | Kernel pending | Planifier un reboot hors trading live |

## Trading

| Issue | Note |
|-------|------|
| Paper trade sans clés API | Bot simule localement si credentials absents |
| Testnet Binance | `BINANCE_TESTNET=true` par défaut — ne pas désactiver trop tôt |
| Rotation `FERNET_KEY` | Invalide les clés API chiffrées → re-saisie dashboard |

## Non-objectifs (volontaires)

- Pas de Celery (worker dédié `APP_ROLE=bot` + Redis pub/sub suffit)
- Pas de multi-utilisateur (auth admin unique JWT)
- Mode HTTP sans TLS = **test / LAN de confiance** uniquement
