# Ambiance Video Generator

Application **ultra-simple** : image + clé Kling AI → clip 5–10&nbsp;s (caméra fixe) → boucle **3&nbsp;h** → téléchargement MP4.

## Utilisation

1. Ouvrez `index.html` via un serveur local HTTP :
   ```bash
   python3 -m http.server 8765
   # → http://127.0.0.1:8765/
   ```
   Ou : `./demarrer.sh`
2. Uploadez une image
3. (Optionnel) Uploadez une musique
4. Vérifiez / collez votre clé Kling (pré-remplie si configurée)
5. Cliquez **Générer vidéo 3h**

## Technique

- API Kling : `POST/GET https://api.klingai.com/v1/videos/image2video` (`kling-v2-6`, mode `std`)
- Prompt forcé caméra fixe : `STATIC CAMERA` / `NO ZOOM` / `NO PAN` + `negative_prompt`
- FFmpeg.wasm depuis **unpkg.com** (`toBlobURL` pour éviter CORS Worker)
- Assemblage 3h en **`-c:v copy`** (évite OOM libx264 sur 10800&nbsp;s dans le navigateur)

## Solde Kling

Si l’API renvoie `Account balance not enough`, rechargez des crédits sur la console développeur Kling.

## Fichiers

- `index.html` — application complète (un seul fichier)
- `demarrer.sh` — serveur local rapide

## Sécurité

La clé API dans le HTML côté client est **visible** par quiconque ouvre la page. Ne publiez pas ce dépôt en public avec une clé réelle ; préférez coller la clé dans l’UI et la stocker en `localStorage`.
