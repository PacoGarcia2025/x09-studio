#!/bin/bash
# Instala o sidecar GPU no network volume (/workspace).
# O pod é descartável. Não pip-install no Python da imagem — só no venv do disco.
# Imagem pinada: runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04
set -euxo pipefail

export DEBIAN_FRONTEND=noninteractive
export CUDA_HOME=/usr/local/cuda
export PATH="/usr/local/cuda/bin:$PATH"
export TORCH_CUDA_ARCH_LIST="8.9"
export MAX_JOBS=4
export NVCC_THREADS=2
export PIP_DISABLE_PIP_VERSION_CHECK=1

ROOT=/workspace/TRELLIS
VENV=/workspace/trellis-env
HF=/workspace/hf-cache
READY=/workspace/.x09-trellis-ready
IMAGE_PIN="runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04"

mkdir -p "$HF" /tmp/extensions
export HF_HOME="$HF"
export HUGGINGFACE_HUB_CACHE="$HF"
export TRANSFORMERS_CACHE="$HF"

echo "===== PRECHECK (torch da imagem) ====="
python - <<'PY'
import torch
print("torch", torch.__version__, "cuda", torch.version.cuda, "avail", torch.cuda.is_available())
assert torch.cuda.is_available(), "CUDA not available"
assert torch.__version__.startswith("2.4"), torch.__version__
print("gpu", torch.cuda.get_device_name(0))
PY

if [ ! -x "$VENV/bin/python" ]; then
  python -m venv --system-site-packages "$VENV"
fi
# shellcheck disable=SC1091
. "$VENV/bin/activate"
export PATH="$VENV/bin:$PATH"

echo "===== APT ====="
apt-get update
apt-get install -y --no-install-recommends git git-lfs build-essential cmake ninja-build pkg-config libgl1 libglib2.0-0
git lfs install --skip-repo || true

echo "===== CLONE ====="
if [ -d "$ROOT/trellis" ]; then
  echo "source already on volume"
  cd "$ROOT"
else
  export GIT_TERMINAL_PROMPT=0
  git config --global --add url."https://github.com/".insteadOf "git@github.com:"
  git config --global --add url."https://github.com/".insteadOf "ssh://git@github.com/"
  if [ ! -d "$ROOT/.git" ]; then
    rm -rf "$ROOT"
    git clone --depth 1 https://github.com/microsoft/TRELLIS.git "$ROOT"
  fi
  cd "$ROOT"
  git submodule update --init --recursive --depth 1 || git submodule update --init --recursive || true
fi

python -m pip install -U pip setuptools wheel packaging ninja huggingface_hub

echo "===== BASIC ====="
python -m pip install pillow imageio imageio-ffmpeg tqdm easydict opencv-python-headless scipy rembg onnxruntime trimesh open3d xatlas pyvista pymeshfix igraph 'transformers>=4.46.3,<4.50'
if [ -d /workspace/src-deps/utils3d ]; then
  python -m pip install /workspace/src-deps/utils3d
else
  python -m pip install "git+https://github.com/EasternJournalist/utils3d.git@9a4eb15e4021b67b12c460c7057d642626897ec8"
fi

echo "===== XFORMERS ====="
python -m pip install --no-deps xformers==0.0.27.post2 || python -m pip install xformers==0.0.27.post2 --index-url https://download.pytorch.org/whl/cu124 --no-deps

echo "===== FLASH-ATTN ====="
python -m pip install flash-attn==2.6.3 --no-build-isolation || python -m pip install flash-attn --no-build-isolation

echo "===== SPCONV / KAOLIN ====="
python -m pip install spconv-cu120
python -m pip install kaolin -f https://nvidia-kaolin.s3.us-east-2.amazonaws.com/torch-2.4.0_cu121.html || python -m pip install kaolin==0.17.0

echo "===== NVDIFFRAST ====="
if [ -d /workspace/src-deps/nvdiffrast ]; then
  python -m pip install --no-build-isolation /workspace/src-deps/nvdiffrast
else
  git clone https://github.com/NVlabs/nvdiffrast.git /tmp/extensions/nvdiffrast
  python -m pip install --no-build-isolation /tmp/extensions/nvdiffrast
fi

echo "===== DIFFOCTREERAST ====="
if [ -d /workspace/src-deps/diffoctreerast ]; then
  python -m pip install --no-build-isolation /workspace/src-deps/diffoctreerast
else
  git clone --recurse-submodules https://github.com/JeffreyXiang/diffoctreerast.git /tmp/extensions/diffoctreerast
  python -m pip install --no-build-isolation /tmp/extensions/diffoctreerast
fi

echo "===== MIPGAUSSIAN ====="
if [ -d /workspace/src-deps/mip-splatting ]; then
  python -m pip install --no-build-isolation /workspace/src-deps/mip-splatting/submodules/diff-gaussian-rasterization/
else
  git clone https://github.com/autonomousvision/mip-splatting.git /tmp/extensions/mip-splatting
  python -m pip install --no-build-isolation /tmp/extensions/mip-splatting/submodules/diff-gaussian-rasterization/
fi

echo "===== VERIFY ====="
python - <<'PY'
import torch
print("final torch", torch.__version__, "cuda", torch.version.cuda, "avail", torch.cuda.is_available())
assert torch.__version__.startswith("2.4"), torch.__version__
assert torch.cuda.is_available()
mods = ["xformers", "flash_attn", "spconv", "kaolin", "nvdiffrast"]
failed = []
for m in mods:
    try:
        __import__(m)
        print("OK", m)
    except Exception as e:
        print("FAIL", m, type(e).__name__, e)
        failed.append(m)
if failed:
    raise SystemExit("deps missing: " + ",".join(failed))
PY

echo "===== WEIGHTS ====="
python - <<'PY'
import os
from huggingface_hub import snapshot_download
model = os.environ.get("STUDIO_TRELLIS_MODEL", "microsoft/TRELLIS-image-large")
token = (
    os.environ.get("HF_TOKEN")
    or os.environ.get("HUGGINGFACE_HUB_TOKEN")
    or os.environ.get("HUGGINGFACE_API_KEY")
    or None
)
print("downloading", model)
snapshot_download(repo_id=model, token=token)
print("weights ok")
PY

python - <<PY
import json, time, torch
payload = {
  "image": "$IMAGE_PIN",
  "venv": "$VENV",
  "root": "$ROOT",
  "hfHome": "$HF",
  "torch": torch.__version__,
  "cuda": torch.version.cuda,
  "installedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
}
open("$READY", "w", encoding="utf-8").write(json.dumps(payload, indent=2))
print("ready", payload)
PY

echo "===== INSTALL DONE ====="
