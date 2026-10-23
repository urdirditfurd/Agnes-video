#!/usr/bin/env bash
# Installe Neodragon (code + poids) pour génération vidéo IA locale.
# Cible : Snapdragon X Elite / machines avec Python 3.10+ et ~20 Go libres.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${ROOT}/neodragon"
MODEL_DIR="${DEST}/models/Neodragon"
HF_REPO="Qualcomm-AI-Research/Neodragon"
GIT_REPO="https://github.com/Qualcomm-AI-research/neodragon.git"

echo "==> Neodragon — setup Atelier Vidéo Pro"
echo "    Code : ${GIT_REPO}"
echo "    Poids : https://huggingface.co/${HF_REPO}"

if [[ ! -d "${DEST}/.git" && ! -f "${DEST}/pyproject.toml" ]]; then
  echo "==> Clone du code d'inférence…"
  git clone --depth 1 "${GIT_REPO}" "${DEST}"
else
  echo "==> Code déjà présent dans ${DEST}"
fi

mkdir -p "${DEST}/models"

if [[ -f "${MODEL_DIR}/diffusion_transformer_320p/diffusion_pytorch_model.safetensors" ]]; then
  echo "==> Poids déjà téléchargés ($(du -sh "${MODEL_DIR}" | cut -f1))"
else
  echo "==> Téléchargement des poids Hugging Face (~17 Go)…"
  python3 - <<PY
from huggingface_hub import snapshot_download
snapshot_download(
    repo_id="${HF_REPO}",
    local_dir="${MODEL_DIR}",
    max_workers=8,
)
print("OK:", "${MODEL_DIR}")
PY
fi

echo
echo "Terminé."
echo "Lien d'utilisation : https://github.com/Qualcomm-AI-research/neodragon"
echo "Page projet        : https://qualcomm-ai-research.github.io/neodragon/"
echo "Voir aussi         : ${ROOT}/NEODRAGON.md"
echo
echo "Exemple :"
echo "  cd neodragon && torchrun scripts/inference_neodragon.py \\"
echo "    --prompts_file prompts/showcase_prompts.txt \\"
echo "    --output_video_folder ./outputs \\"
echo "    --local_cache_folder ./models"
