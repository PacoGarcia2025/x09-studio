#!/usr/bin/env bash
# Instala o env Python/CUDA do TRELLIS no host GPU (Linux). Isolado do Next.js.
# Não altera o Core do Studio. Requer NVIDIA ≥16GB, CUDA Toolkit, conda.
set -euo pipefail

ROOT="${STUDIO_TRELLIS_ROOT:-}"
if [[ -z "$ROOT" ]]; then
  ROOT="$(cd "$(dirname "$0")" && pwd)/vendor/TRELLIS"
fi

mkdir -p "$(dirname "$ROOT")"
if [[ ! -d "$ROOT/.git" ]]; then
  git clone --recurse-submodules https://github.com/microsoft/TRELLIS.git "$ROOT"
fi

cd "$ROOT"
# Flags oficiais do Microsoft TRELLIS. Ajuste CUDA no PATH antes, se necessário.
# shellcheck disable=SC1091
. ./setup.sh --new-env --basic --xformers --flash-attn --diffoctreerast --spconv --mipgaussian --kaolin --nvdiffrast

echo
echo "Env conda 'trellis' criado. No .env do Studio:"
echo "  STUDIO_TRELLIS_PYTHON=$(command -v python || true)   # use o python do conda trellis"
echo "  STUDIO_TRELLIS_ROOT=$ROOT"
echo "  STUDIO_ASSET_GPU_AVAILABLE=true"
echo "  STUDIO_AI_ENGINE_GENERATION_ENABLED=true"
echo "  HUGGINGFACE_TOKEN=...   # ou HUGGINGFACE_API_KEY / HF_TOKEN"
echo
echo "Probe: \"\$STUDIO_TRELLIS_PYTHON\" $(cd "$(dirname "$0")" && pwd)/run.py --probe"
