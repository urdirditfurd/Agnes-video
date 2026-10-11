# Ambiance Animation Studio

Transformez **n’importe quelle image** en boucle d’ambiance apaisante de 10 secondes  
(cadre 100 % statique — seuls les effets d’arrière-plan bougent).

## ⚠️ Pourquoi `http://127.0.0.1:8765/` ne répond pas ?

Cette adresse ne marche **que sur VOTRE ordinateur**, et **seulement** si le serveur est lancé :

1. Téléchargez le dossier **complet** `ambiance-animation-studio` (avec `lib/ffmpeg/`)
2. Windows : double-cliquez **`demarrer.bat`** (laissez la fenêtre noire ouverte)
3. Mac / Linux : `./demarrer.sh`
4. Le navigateur s’ouvre sur `http://127.0.0.1:8765/`  
   (si 8765 est pris → le script affiche un autre port, ex. `8766`)

Si vous voyez `ERR_CONNECTION_REFUSED` : le serveur n’est pas démarré, ou la fenêtre a été fermée.

**Ne double-cliquez pas** `index.html` (mode `file://` → FFmpeg cassé).

## Contenu du pack

```
ambiance-animation-studio/
├── index.html
├── demarrer.bat / demarrer.sh / serve.py
├── README.md
└── lib/ffmpeg/          ← obligatoire (~31 Mo)
```

## Prérequis

- **Python 3** installé ([python.org](https://www.python.org/downloads/) — cochez *Add to PATH* sous Windows)
- Chrome ou Edge

## Flux

1. Uploadez une image (JPEG / PNG / WebP)  
2. Choisissez une ambiance  
3. Réglez vitesse / densité / ondulation  
4. **Prévisualiser**  
5. **Exporter vidéo 10s (MP4)**  
