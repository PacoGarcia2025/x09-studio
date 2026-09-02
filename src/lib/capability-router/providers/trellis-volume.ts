/**
 * Contrato do sidecar GPU no volume RunPod.
 * O pod é descartável; só /workspace sobrevive. A imagem Docker tem de
 * ficar pinada — o venv usa --system-site-packages (PyTorch da imagem).
 */
export const TRELLIS_VOLUME = {
  image: "runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04",
  python: "/workspace/trellis-env/bin/python",
  root: "/workspace/TRELLIS",
  hfHome: "/workspace/hf-cache",
  readyFile: "/workspace/.x09-trellis-ready",
  workspace: "/workspace",
} as const;
