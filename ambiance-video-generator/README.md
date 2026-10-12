# Ambiance Video Generator

Application **ultra-simple** : image + clé Agnes → vidéo 10&nbsp;s → boucle **3&nbsp;h** → téléchargement.

## Utilisation

1. Ouvrez `index.html` via un serveur local HTTP (recommandé) :
   ```bash
   python3 -m http.server 8765
   # → http://127.0.0.1:8765/
   ```
   Ou déployez le fichier sur GitHub Pages / Netlify.
2. Uploadez une image
3. (Optionnel) Uploadez une musique
4. Collez votre clé Agnes (`platform.agnes-ai.com`)
5. Cliquez **Générer vidéo 3h**

## Technique

- API Agnes : `apihub.agnes-ai.com` (`agnes-video-v2.0`, 241 frames @ 24 fps)
- FFmpeg.wasm chargé depuis **unpkg.com** (`toBlobURL` pour éviter CORS Worker)
- Assemblage 3h en **`-c:v copy`** (évite les plantages mémoire du ré-encodage 3h)

## Fichiers

- `index.html` — application complète (un seul fichier)
