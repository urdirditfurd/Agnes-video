# Ambiance Video Studio v1

Application web pour créer une boucle Lofi/Cozy de 3 heures — **sans Pollinations** et **sans serveur VPS**.

## Flux

1. Téléversez votre **image** (mascotte / décor)  
2. Téléversez votre **musique** libre de droits (MP3 / WAV)  
3. Ajoutez une **clé Agnes** → animation en courte vidéo bouclable (10–15 s)  
4. **Assembler 3H** via **FFmpeg.wasm** dans le navigateur

## Fichiers

```
ambiance-video-v1/
├── index.html          # Application autonome
├── README.md
└── lib/ffmpeg/         # FFmpeg.wasm (même origine — requis)
    ├── ffmpeg.js
    ├── 814.ffmpeg.js   # Worker
    ├── util.js
    ├── ffmpeg-core.js
    └── ffmpeg-core.wasm
```

Servez le dossier via un serveur HTTP local (les Workers ne fonctionnent pas en `file://`) :

```bash
cd ambiance-video-v1 && python3 -m http.server 8765
# → http://127.0.0.1:8765/
```

## Commande FFmpeg exécutée localement

```text
ffmpeg -stream_loop -1 -i input.mp4 -stream_loop -1 -i input.mp3 \
  -c:v copy -c:a aac -b:a 192k -t 10800 -shortest output_3h.mp4
```

Conseil : testez d'abord la durée « 1 min » avant une vraie 3 heures (RAM).
