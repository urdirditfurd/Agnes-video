# 🎬 Atelier Vidéo Pro

Transformez un **script en texte** en **vidéo longue** (jusqu'à 20 min), automatiquement.

## 🚀 Installation

1. Créez un dossier `atelier-video-pro/`
2. Copiez-y tous les fichiers ci-dessus
3. Ouvrez `index.html` dans un navigateur moderne (Chrome/Edge/Firefox)

## 🔑 Clés API

| API | Usage | Où l'obtenir |
|---|---|---|
| **Agnes AI** | Génération vidéo | https://platform.agnes-ai.com |
| **Gemini 2.0 Flash** | Génération image (optionnel, fallback Pollinations) | https://aistudio.google.com/apikey |

## 🧭 Utilisation

1. **Écran 1** — Collez votre script, choisissez durée, style, voix.
2. **Écran 2** — Vérifiez les scènes détectées.
3. **Écran 3** — Suivez la progression.
4. **Écran 4** — Regardez et téléchargez votre vidéo.

## 🔄 Reprise sur erreur

Chaque scène a un statut (`pending | generating | done | failed`).
L'état est conservé dans `IndexedDB` et `localStorage`.

## 🧩 Architecture modulaire

- `story-parser.js` — Découpage du script
- `character-bible.js` — Cohérence visuelle
- `image-generator.js` — Images multi-API
- `video-orchestrator.js` — Vidéos Agnes
- `assembler.js` — Montage FFmpeg.wasm
- `tts.js` — Voix off
- `app.js` — UI et orchestration

## 🐛 Dépannage

| Problème | Solution |
|---|---|
| « Clé API manquante » | Relancez et saisissez la clé |
| Gemini échoue | Pollinations prend le relais |
| FFmpeg.wasm ne charge pas | Vérifiez votre connexion |
| Rate limit Agnes | L'orchestrateur espace automatiquement |
