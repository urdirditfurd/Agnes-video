# Ambiance Video Studio v1.6

## ⚠️ Ne téléchargez PAS seulement `index.html`

Si vous ouvrez `index (9).html` depuis **Téléchargements** (`file://`), vous obtiendrez :
- `ERR_FILE_NOT_FOUND` sur `ffmpeg.js` / `util.js`
- `FFmpeg.wasm non chargé`
- Agnes 503 en boucle
- **Aucune vidéo générée**

## Contenu obligatoire du pack

```
ambiance-video-v1/
├── index.html
├── demarrer.bat      ← Windows
├── demarrer.sh       ← Mac / Linux
├── serve.py          ← serveur multithread (obligatoire)
├── README.md
└── lib/ffmpeg/       ← OBLIGATOIRE (~31 Mo)
    ├── ffmpeg.js
    ├── util.js
    ├── 814.ffmpeg.js
    ├── ffmpeg-core.js
    └── ffmpeg-core.wasm
```

## Démarrage correct (Windows)

1. Copiez le dossier **complet** `ambiance-video-v1` (pas un HTML seul)
2. Double-cliquez **`demarrer.bat`**
3. **Laissez la fenêtre noire ouverte** pendant tout l’usage
4. Le navigateur s’ouvre sur **http://127.0.0.1:8765/**
5. **Hard-reload** (Ctrl+Shift+R) — console : `v1.6` + `FFmpeg blobs prêts`
6. Image + musique → **Créer la boucle locale** → **Assembler 3H**

Si vous voyez `ERR_CONNECTION_REFUSED` sur `ffmpeg-core.js` : le serveur a été fermé. Relancez `demarrer.bat` et rechargez.

## Démarrage (Mac / Linux)

```bash
cd ambiance-video-v1
chmod +x demarrer.sh
./demarrer.sh
```

## Flux

1. Upload image + musique  
2. Préchargement FFmpeg.wasm (~32 Mo) en cache IndexedDB  
3. Boucle courte locale (cadre fixe + particules ; Agnes désactivé par défaut)  
4. Conversion WebM → MP4 forcée à **30 fps** (`-frames:v` exact)  
5. Assemblage 3H avec FFmpeg.wasm + audio mixé dans le navigateur  
