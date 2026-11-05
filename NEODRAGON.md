# Neodragon — vidéo IA gratuite sur Snapdragon X Elite

Décision technique pour **Atelier Vidéo Pro** : utiliser **Neodragon** (Qualcomm AI Research, ICLR 2026) comme moteur text-to-video local, gratuit et privé.

## Pourquoi Neodragon

| Critère | Neodragon |
|---|---|
| Matériel cible | Snapdragon X Elite (Hexagon NPU) — aussi Snapdragon 8 Elite |
| Coût | Gratuit (on-device, sans API cloud) |
| Qualité | VBench **81.61** (mode hybrid) |
| Sortie | 49 frames ≈ 2 s @ 24 fps, jusqu’à **640×1024** (avec QuickSRNet) |
| Latence NPU | ~**6,7 s** end-to-end (~7 FPS) |
| Mémoire | ~**3,5 Go** RAM pic |
| Paramètres | **4,945 B** (pipeline complète) |

C’est aujourd’hui le meilleur choix open pour générer de la vidéo IA **gratuitement** sur un PC Copilot+ / Snapdragon X Elite, sans dépendre d’Agnes ni d’un GPU NVIDIA.

## Liens d’utilisation (officiels)

| Ressource | Lien |
|---|---|
| **Guide d’inférence (à utiliser)** | https://github.com/Qualcomm-AI-research/neodragon |
| **Poids du modèle (Hugging Face)** | https://huggingface.co/Qualcomm-AI-Research/Neodragon |
| **Page projet + démos** | https://qualcomm-ai-research.github.io/neodragon/ |
| **Article (arXiv)** | https://arxiv.org/abs/2511.06055 |
| **ICLR 2026 OpenReview** | https://openreview.net/forum?id=XBzIhhwv8d |

## Installation rapide (déjà faite dans cet environnement)

Dans ce workspace, le code et les poids (~17 Go) sont déjà présents sous :

```text
/workspace/neodragon/                  ← code d’inférence Qualcomm
/workspace/neodragon/models/Neodragon/ ← poids Hugging Face
```

Sur ta machine Snapdragon X Elite, relance :

```bash
bash setup-neodragon.sh
```

## Lancer une génération

```bash
cd neodragon

# Environnement (recommandé : Docker)
DOCKER_BUILDKIT=1 BUILDKIT_PROGRESS=plain docker build -f docker/Dockerfile --pull --tag neodragon:latest .
docker run -ti --rm -v "$PWD/models:/workspace/models" -v "$PWD/outputs:/workspace/outputs" neodragon:latest

# Ou venv local
python -m venv .env && source .env/bin/activate
pip install --no-cache-dir -r docker/requirements.txt
pip install --no-cache-dir --no-dependencies .

# Inférence hybrid (défaut, meilleure qualité / vitesse)
torchrun scripts/inference_neodragon.py \
  --prompts_file prompts/showcase_prompts.txt \
  --output_video_folder ./outputs \
  --local_cache_folder ./models
```

Options utiles :

- `--mode hybrid` — SSD-1B (1re image) + DiT distillé (défaut)
- `--mode monolithic` — tout via le DiT (sans step-distillation)
- `--height 320 --width 512 --num_frames 49 --fps 24`
- `--disable_safety_checker` — uniquement pour evals type VBench (responsabilité utilisateur)

## Intégration Atelier Vidéo Pro

Aujourd’hui l’atelier navigateur s’appuie sur Agnes (cloud). Neodragon est le **backend local gratuit** recommandé pour les machines Snapdragon X Elite :

1. Générer les clips courts (2 s) via `inference_neodragon.py`
2. Les assembler dans l’atelier (`assembler.js` / FFmpeg.wasm) avec TTS et transitions
3. Garder Agnes uniquement en fallback cloud si besoin

Licence : **BSD-3-Clause-Clear** + [Qualcomm Responsible AI License](https://www.qualcomm.com/site/responsible-ai-license).
