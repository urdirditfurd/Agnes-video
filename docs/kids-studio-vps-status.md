# Kids Studio VPS — statut missions

## Mission 1 — Accès HTTP/HTTPS (VALIDÉ)

| Test | Résultat |
|------|----------|
| `http://51.254.135.158/api/health` | OK (JSON) |
| `https://51-254-135-158.sslip.io/api/health` | OK — **URL navigateur recommandée** |
| Favicon IP | 204 (plus le favicon ebx) |

### Conflit Nginx corrigé (02 Oct)
- Cause navigateur : Chrome force souvent HTTPS sur l’IP → certificat Let’s Encrypt uniquement pour `51-254-135-158.sslip.io` → erreur cert.
- Site nginx `ebx` (doublon) **désactivé** (symlink only ; app PM2 `/var/www/ebx` intacte).
- `kids-studio` = `default_server` port 80.
- Routes `/api/` + `/outputs/` ajoutées sur le vhost HTTPS sslip.io.
- **Prospection NON supprimée** (utile pour le certificat HTTPS).

## Mission 2 — npm deps (VALIDÉ)

Sur le VPS (`/opt/kids-studio`) :
- `uuid` → **9.0.1** (`require('uuid').v4` OK)
- `express-rate-limit` → **8.7.0**
- `pm2 restart kids-studio` → online, health OK

UFW actif : 22/80/443/8080 autorisés ; 3001 non exposé (correct, accès via Nginx `/api/`).

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
