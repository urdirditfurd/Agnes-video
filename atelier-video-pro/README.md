# Atelier Vidéo Pro

Transformez un **script en texte** en **vidéo narrative longue** (jusqu’à 20 min), automatiquement.

Intègre et étend [Atelier Vidéo](../Agnes.html) (Agnes AI) avec découpage de script, images IA, file d’attente et assemblage.

## Installation

1. Clonez le dépôt, puis allez **dans le dossier du projet** (pas `C:\Windows\system32`).
2. Ouvrez `atelier-video-pro/index.html` dans Chrome / Edge, **ou** servez en HTTP local.

### Windows PowerShell (recommandé)

```powershell
# Adaptez le chemin vers votre clone
cd $HOME\Documents\Agnes-video\atelier-video-pro

# Tests sans clé API
node .\tests\story-parser.test.js

# Lancer le serveur (PowerShell 5 n'accepte pas && — une commande à la fois)
npx --yes serve -p 4173
```

Puis ouvrez `http://localhost:4173`.  
Collez votre clé Agnes **uniquement dans l’écran 1 de l’app** (jamais dans le code ni dans un chat).

### macOS / Linux / Git Bash

```bash
cd atelier-video-pro
node tests/story-parser.test.js
npx --yes serve -p 4173
```

## Clés API

| API | Usage | Obligatoire ? | Où l’obtenir |
|---|---|---|---|
| **Agnes AI** | Génération vidéo (clips 5s/10s) | Oui pour les vidéos | [platform.agnes-ai.com](https://platform.agnes-ai.com) |
| **Gemini 2.0 Flash** | Images + analyse (optionnel) | Non | [Google AI Studio](https://aistudio.google.com/apikey) |
| **Pollinations** | Fallback image gratuit | Non (sans clé) | — |
| **Stable Horde** | 2ᵉ fallback image | Non | [stablehorde.net](https://stablehorde.net) |

Les clés sont stockées en `localStorage` (`agnes_api_key`, `gemini_api_key`) — jamais en dur dans le code.

Configurez-les dans l’écran 1 (panneau « Configuration API ») ou au premier lancement.

## Utilisation

1. **Écran 1** — Collez un script (ou chargez la démo), choisissez durée / style / voix.
2. **Écran 2** — Vérifiez les scènes, éditez les prompts, réordonnez.
3. **Écran 3** — Suivez la progression (images → vidéos Agnes → assemblage).
4. **Écran 4** — Lisez et téléchargez le MP4 ; regénérez une scène si besoin.

### Exemple démo

**« Le voyage d'une goutte d'eau »** est pré-rempli. Durée cible **1 min** → ~6 clips de 10 s.

## Reprise sur erreur

Chaque scène a un statut : `pending` | `generating` | `image_done` | `video_generating` | `video_polling` | `video_done` | `failed`.

- À chaque clip terminé → checkpoint dans `localStorage` (`avp_story_plan`, `avp_generation_progress`).
- Images → cache **IndexedDB** (`avp_image_cache`).
- Relancez → bouton **Reprendre la génération** (écran 2) : les scènes déjà faites sont sautées / reprises depuis le cache.

## Architecture

| Fichier | Rôle |
|---|---|
| `config.js` | Endpoints, modèles, parallélisme, APIs swappables |
| `story-parser.js` | Découpage script → scènes / chapitres |
| `character-bible.js` | Descriptions verrouillées + seed fixe |
| `image-generator.js` | Gemini → Pollinations → Stable Horde |
| `video-orchestrator.js` | Queue Agnes, rate-limit ~62 s, retry |
| `assembler.js` | FFmpeg.wasm concat + audio optionnel |
| `tts.js` | Voix off (Web Speech) |
| `state-store.js` | Persistance / reprise |
| `app.js` | UI 4 écrans |

Chaque provider est swappable via `config.js` → `MODELS.imageProviders` et `ENDPOINTS`.

## Paramètres avancés (`config.js`)

- `VIDEO.maxParallel` / `createIntervalMs` — cadence Agnes (rate-limit)
- `IMAGE.maxParallel` — images simultanées
- `STORY.clipDurations` — mapping durée cible → nombre de clips (durée / 10 s)
- `ASSEMBLY.transitionDurationSec` — fondus (prévu pour filtres FFmpeg avancés)

## Mode classique

L’app originale **images → clips Agnes** reste disponible : [`../Agnes.html`](../Agnes.html).

## Tests sans API

```bash
node tests/story-parser.test.js
```

Valide le découpage du script démo (durée 1 min → 6 scènes, personnages, bible).

## Dépannage

| Problème | Solution |
|---|---|
| Clé API manquante | Écran 1 → Configuration API |
| Gemini échoue | Pollinations prend le relais automatiquement |
| FFmpeg.wasm ne charge pas | Servez en HTTP (pas `file://`) ; CDN unpkg |
| Rate limit Agnes | L’orchestrateur espace les créations (~62 s) |
| Vidéo finale noire / absente | Vérifiez les `videoUrl` ; CORS sur les clips distants |
| Reprise | Écran 2 → « Reprendre la génération » |

## Alternatives 2026 (si une API disparaît)

| Besoin | Alternative gratuite |
|---|---|
| Image | Pollinations Flux, Stable Horde, Hugging Face Inference |
| Texte / parse | DeepSeek, Gemini Flash, heuristiques locales (déjà intégrées) |
| TTS export fichier | [Edge-TTS](https://github.com/rany2/edge-tts) (Python), Gemini TTS |
| Montage | FFmpeg Node côté serveur si wasm bloqué |

## Licence / coût

Conçu pour **coût zéro** côté images (Pollinations) ; Agnes AI selon votre quota plateforme.
