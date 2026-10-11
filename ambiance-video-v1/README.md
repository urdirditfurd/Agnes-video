# Ambiance Video Studio v1

Application web autonome pour générer des vidéos d'ambiance Lofi/Cozy de 3 heures, avec musique libre de droits et métadonnées YouTube optimisées pour la monétisation.

## Démarrage rapide

1. Ouvrez `index.html` dans un navigateur moderne (Chrome / Edge / Firefox).
2. (Optionnel) Ajoutez une clé API Agnes pour la génération vidéo courte.
3. Choisissez une mascotte/thème, générez le prompt, uploadez une musique, puis lancez la génération et l'assemblage 3H.

## Fonctionnalités

- Thèmes prêts à l'emploi : Capybara Zen, Robot Jardinier, Chat Boulanger, Prompt libre
- Génération d'image (Pollinations) + fallback Ken Burns (zoom + calques atmosphère)
- Boucle audio avec détection BPM et crossfade intelligent
- Préparation commande FFmpeg pour assemblage 3 heures (`-stream_loop -1 -t 10800`)
- Générateur SEO YouTube (titres, description, chapitres, case contenu IA)

## Architecture

Fichier unique HTML/CSS/JS (IndexedDB, état global, UI responsive) — même philosophie que Kids Story Studio, refactorisé pour le cas d'usage ambiance/lofi.

## Commande FFmpeg (assemblage 3H)

```bash
ffmpeg -stream_loop -1 -i video_loop.mp4 -stream_loop -1 -i audio_track.mp3 \
  -c:v copy -c:a aac -b:a 192k -t 10800 -shortest output_3h.mp4
```

Avec crossfade intelligent, le client prépare un `filter_complex` `afade` pour le backend (`SERVER_URL` + `/api/assemble`, mode `ambiance_loop_3h`).
