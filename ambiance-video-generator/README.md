# Ambiance Video Generator (Luma AI)

Image → **Luma Dream Machine** (5&nbsp;s, caméra fixe) → boucle **3&nbsp;h** (FFmpeg.wasm) → téléchargement MP4.

## Utilisation (HTML seul)

1. Ouvre la page GitHub Pages du dépôt **ou** télécharge uniquement `index.html` et ouvre-le.
2. Uploade une image (+ musique optionnelle).
3. La clé Luma est pré-remplie (modifiable).
4. Clique **Générer vidéo 3h**.

Aucun `demarrer.bat` / proxy local n’est requis : l’API Luma Agents autorise le CORS navigateur.

## Technique

- API : `https://agents.lumalabs.ai/v1/generations` (modèle `ray-3.2`)
- Image : data URI + `media_type` (fallback upload `tmpfiles.org` → URL publique)
- Prompt forcé : `NO CAMERA MOVEMENT` / `NO ZOOM` / `NO PAN`
- FFmpeg.wasm via **unpkg.com** + boucle 3h en `-c:v copy`

## Crédits Luma

Si tu vois « crédits insuffisants » (HTTP 402), recharge sur [platform.lumalabs.ai](https://platform.lumalabs.ai/).

## Sécurité

La clé API est dans le HTML (prototype). Quiconque ouvre la page peut la lire — préfère un dépôt privé et/ou une clé rotative.
