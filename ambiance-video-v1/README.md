# Ambiance Video Studio v1.7

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
5. **Hard-reload** (Ctrl+Shift+R) — console : `v1.7`
6. Choisissez **Qualité** (Basse / Moyenne / Haute)
7. Image + musique → **Créer la boucle locale** → **Assembler**

Si `Array buffer allocation failed` : passez en **qualité Basse** ou testez en **1 min**.

Si `ERR_CONNECTION_REFUSED` : relancez `demarrer.bat` et rechargez.

## Démarrage (Mac / Linux)

```bash
cd ambiance-video-v1
chmod +x demarrer.sh
./demarrer.sh
```

## Flux

1. Upload image + musique  
2. Préchargement FFmpeg.wasm (~32 Mo) en cache IndexedDB  
3. Boucle courte locale (cadre fixe + particules)  
4. Compression boucle 10 s au bitrate du preset (évite OOM 3H)  
5. Assemblage longue durée en `-c:v copy` + audio AAC (progression + ETA + Arrêter)  

## Qualité (taille 3H estimée)

| Preset  | Vidéo   | Audio | ~Taille 3H |
|---------|---------|-------|------------|
| Basse   | 700 kb/s | 96k  | 350–400 Mo |
| Moyenne | 1100 kb/s | 128k | 500–600 Mo |
| Haute   | 1800 kb/s | 160k | 850–950 Mo |
