# Ambiance Video Generator

Image + clé **Agnes IA** → clip 10&nbsp;s (caméra fixe) → boucle **3&nbsp;h** locale (FFmpeg.wasm) → MP4.

## Utilisation

1. Ouvre `index.html` (GitHub Pages, double-clic, ou `./demarrer.sh`)
2. Uploade une image
3. (Optionnel) Uploade une musique
4. Colle ta clé Agnes (`sk-…`)
5. Clique **Générer la vidéo d'ambiance (3h)**

Aucun VPS. Aucune API Luma / Runway / Pika / Pollinations.

## Technique

- Agnes : `POST https://apihub.agnes-ai.com/v1/videos` (`agnes-video-v2.0`, 240 frames @ 24 fps)
- Polling : `GET https://apihub.agnes-ai.com/agnesapi?video_id=…&model_name=agnes-video-v2.0`
- Prompt forcé : `NO camera movement, NO zoom, NO pan`
- FFmpeg.wasm via **unpkg.com** (`toBlobURL`)
- Boucle 3h en **`-c:v copy`** (évite OOM navigateur du ré-encodage 10800&nbsp;s)

## Fichiers

- `index.html` — application complète
- `demarrer.bat` / `demarrer.sh` — serveur local optionnel
