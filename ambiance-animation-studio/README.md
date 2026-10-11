# Ambiance Animation Studio

Transformez **n’importe quelle image** en boucle d’ambiance apaisante de 10 secondes  
(cadre 100 % statique — seuls les effets d’arrière-plan bougent).

## Contenu du pack

```
ambiance-animation-studio/
├── index.html
├── demarrer.bat / demarrer.sh / serve.py
├── README.md
└── lib/ffmpeg/          ← obligatoire (~31 Mo)
```

## Démarrage

```bash
cd ambiance-animation-studio
./demarrer.sh          # ou demarrer.bat sous Windows
# → http://127.0.0.1:8765/
```

**Ne fermez pas** la fenêtre du serveur. Ne double-cliquez pas le HTML (`file://`).

## Flux

1. Uploadez une image (JPEG / PNG / WebP)  
2. Choisissez une ambiance (Onsen, Pluie, Feu, Océan, Forêt, Café, Perso)  
3. Réglez vitesse / densité / ondulation  
4. **Prévisualiser** (canvas en boucle)  
5. **Exporter vidéo 10s (MP4)** via FFmpeg.wasm  

## Ambiances

| Ambiance | Effets |
|----------|--------|
| Onsen Japonais | vapeur, neige, ondulation, bulles |
| Pluie Douce | pluie, brume, éclairs subtils |
| Feu de Cheminée | flammes, braises, fumée |
| Océan Calme | vagues, écume, reflets |
| Forêt Enchantée | lucioles, feuilles, brume |
| Café Cocooning | vapeur, pluie fenêtre, lueur |
| Personnalisé | cochez les calques voulus |
