# Ambiance Video Generator

Image + clé Kling AI → clip 5–10&nbsp;s (caméra fixe) → boucle **3&nbsp;h** → téléchargement MP4.

## Important (CORS)

Kling **refuse** les appels depuis le navigateur (`file://` ou page HTML seule).  
Il faut lancer le **serveur proxy local** inclus :

### Windows
1. Télécharge le dossier complet (`index.html` + `serve.py` + `demarrer.bat`)
2. Double-clique **`demarrer.bat`**
3. Ouvre **http://127.0.0.1:8765/** (pas le fichier dans Téléchargements)

### macOS / Linux
```bash
./demarrer.sh
# → http://127.0.0.1:8765/
```

Python 3 est requis (`python` / `py` / `python3`).

## Utilisation

1. Uploade une image
2. (Optionnel) Uploade une musique
3. Colle ta clé Kling
4. Clique **Générer vidéo 3h**

## Technique

- UI → `GET/POST /api/kling/...` → proxy Python → `https://api.klingai.com/v1/...`
- Téléchargement vidéo via `/api/fetch?url=...` (évite CORS CDN)
- Modèle : `kling-v2-6`, prompt `STATIC CAMERA` / `NO ZOOM` / `NO PAN`
- FFmpeg.wasm depuis **unpkg.com** (`toBlobURL`)
- Boucle 3h en **`-c:v copy`** (anti-OOM navigateur)

## Fichiers

- `index.html` — interface
- `serve.py` — serveur + proxy Kling
- `demarrer.bat` / `demarrer.sh` — démarrage

## Solde Kling

Si l’API renvoie `Account balance not enough`, recharge des crédits sur la console Kling.
