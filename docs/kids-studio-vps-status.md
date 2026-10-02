# Kids Studio VPS — statut missions

## Mission 1 — Accès HTTP (VALIDÉ depuis Internet)

Depuis cet environnement cloud (Internet) :

| Test | Résultat |
|------|----------|
| `http://51.254.135.158/api/health` | `{"status":"ok",...}` HTTP 200 |
| Port 80 | Ouvert |
| Port 22 | Ouvert |
| Port 443 | Ouvert |
| Port 3001 (direct) | Fermé (attendu — Nginx proxy uniquement) |

Si Windows refuse encore la connexion alors que l’IP publique répond ici :
1. Vérifier antivirus / pare-feu Windows local
2. Tester dans un navigateur privé : `http://51.254.135.158/api/health`
3. Tester via un autre réseau (4G téléphone)
4. Panel OVH → Network → Firewall : autoriser TCP 80/443 (et garder 22)

## Mission 2 — npm deps (EN ATTENTE SSH)

Sans mot de passe SSH root, impossible d’exécuter sur le VPS.
Script prêt : `scripts/vps-fix-deps.sh`

```bash
ssh root@51.254.135.158 'bash -s' < scripts/vps-fix-deps.sh
```

Note : `/api/assemble` fonctionne déjà → `uuid` / rate-limit ne bloquent pas le chemin critique actuel.

## Mission 3 — Pipeline assemble (VALIDÉ)

```bash
curl -s -X POST http://51.254.135.158/api/assemble \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: kids-studio-secret-change-me' \
  -d '{"videos":[
    "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
    "https://samplelib.com/lib/preview/mp4/sample-10s.mp4",
    "https://www.w3schools.com/html/mov_bbb.mp4"
  ],"musicDataUrl":null,"musicVolume":0.2}'
```

Résultat obtenu :
- `success: true`, `jobId: c00dbc75`, `scenes: 3`, `size: 8912672`
- `GET /outputs/c00dbc75.mp4` → HTTP 200, `Content-Type: video/mp4`, durée ~151s

## Mission 4 — HTML patché

Fichiers livrables :
- `studio-comptinesV10.html` (version la plus récente, patchée)
- `kids-story-studio-server.html` (copie livrable = V10)
- `studio-comptinesV9.html` (aussi patché)

`assembleFinalFilm()` appelle désormais `http://51.254.135.158/api/assemble`.
Ouvrir le HTML en `file://` ou via HTTP (pas HTTPS mixte) pour éviter le blocage Mixed Content.
