"""
Sidecar TRELLIS — processo Python/CUDA isolado do Next.js.

  python run.py --input IMG --output OUT.glb
  python run.py --probe

Stdout: uma linha JSON (resultado + métricas).
Stderr: logs com timestamp.
"""

from __future__ import annotations

import argparse
import gc
import json
import os
import sys
import time
import traceback
from typing import Any, Optional

EXIT_DEPS = 10
EXIT_CUDA = 11
EXIT_WEIGHTS = 12
EXIT_INFER = 13
EXIT_ARGS = 14
EXIT_OOM = 15


def emit(payload: dict) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def fail(code: int, message: str, extra: Optional[dict] = None) -> None:
    payload: dict[str, Any] = {"ok": False, "code": code, "message": message}
    if extra:
        payload.update(extra)
    emit(payload)
    raise SystemExit(code)


def log(message: str) -> None:
    ts = time.strftime("%H:%M:%S")
    sys.stderr.write(f"[trellis {ts}] {message}\n")
    sys.stderr.flush()


def resolve_token() -> Optional[str]:
    for key in (
        "HF_TOKEN",
        "HUGGINGFACE_TOKEN",
        "HUGGINGFACE_API_KEY",
        "HUGGINGFACE_HUB_TOKEN",
        "HUGGING_FACE_HUB_TOKEN",
    ):
        value = os.environ.get(key, "").strip()
        if value:
            return value
    return None


def apply_trellis_root() -> None:
    root = os.environ.get("STUDIO_TRELLIS_ROOT", "").strip()
    if not root:
        return
    if root not in sys.path:
        sys.path.insert(0, root)
    os.chdir(root)


def vram_snapshot() -> dict[str, Any]:
    try:
        import torch
    except ImportError:
        return {}
    if not torch.cuda.is_available():
        return {}
    torch.cuda.synchronize()
    props = torch.cuda.get_device_properties(0)
    return {
        "cudaName": torch.cuda.get_device_name(0),
        "vramTotalMb": int(props.total_memory // (1024 * 1024)),
        "vramAllocMb": int(torch.cuda.memory_allocated() // (1024 * 1024)),
        "vramReservedMb": int(torch.cuda.memory_reserved() // (1024 * 1024)),
        "vramPeakMb": int(torch.cuda.max_memory_allocated() // (1024 * 1024)),
        "cudaVersion": getattr(torch.version, "cuda", None),
    }


def release_cuda() -> None:
    try:
        import torch

        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.synchronize()
    except Exception:
        pass


def is_oom(err: BaseException) -> bool:
    text = str(err).lower()
    return any(
        token in text
        for token in ("out of memory", "cuda oom", "cudnn_status_alloc_failed", "not enough memory")
    )


def is_glb(path: str) -> bool:
    try:
        with open(path, "rb") as handle:
            return handle.read(4) == b"glTF"
    except OSError:
        return False


def check_cuda() -> str:
    try:
        import torch
    except ImportError:
        fail(EXIT_DEPS, "PyTorch não importável neste Python. Instale o env TRELLIS (setup.sh).")

    if not torch.cuda.is_available():
        fail(
            EXIT_CUDA,
            "CUDA indisponível neste Python. TRELLIS exige NVIDIA GPU ≥16GB (Linux).",
        )
    torch.cuda.reset_peak_memory_stats()
    name = torch.cuda.get_device_name(0)
    mem = torch.cuda.get_device_properties(0).total_memory // (1024 * 1024)
    if mem < 15000:
        log(f"aviso: GPU com {mem} MiB; TRELLIS recomenda ≥16GB")
    return f"{name} ({mem} MiB)"


def check_trellis_import() -> None:
    try:
        from trellis.pipelines import TrellisImageTo3DPipeline  # noqa: F401
        from trellis.utils import postprocessing_utils  # noqa: F401
    except ImportError as err:
        fail(
            EXIT_DEPS,
            "Pacote trellis não importável. Defina STUDIO_TRELLIS_ROOT e rode "
            f"services/trellis-worker/setup.sh. Detalhe: {err}",
        )


def download_weights(model: str, token: Optional[str]) -> None:
    try:
        from huggingface_hub import snapshot_download
    except ImportError:
        log("huggingface_hub ausente — from_pretrained tentará o download.")
        return

    last_err: Optional[BaseException] = None
    for attempt in range(1, 3):
        try:
            log(f"pesos {model} (tentativa {attempt}/2, Hub gratuito, sem inferência paga)")
            snapshot_download(repo_id=model, token=token)
            return
        except Exception as err:
            last_err = err
            log(f"falha nos pesos: {err}")
            if attempt == 1:
                time.sleep(3)
    fail(EXIT_WEIGHTS, f"Falha ao obter pesos no Hugging Face Hub: {last_err}")


def mesh_stats(mesh: Any) -> dict[str, Any]:
    stats: dict[str, Any] = {}
    vertices = getattr(mesh, "vertices", None)
    faces = getattr(mesh, "faces", None)
    if vertices is None:
        vertices = getattr(mesh, "verts", None)
    try:
        stats["vertexCount"] = int(len(vertices))
    except Exception:
        pass
    try:
        stats["faceCount"] = int(len(faces))
    except Exception:
        pass
    return stats


def probe() -> None:
    apply_trellis_root()
    gpu = check_cuda()
    check_trellis_import()
    try:
        import torch

        torch_version = getattr(torch, "__version__", None)
    except Exception:
        torch_version = None
    emit(
        {
            "ok": True,
            "probe": True,
            "cuda": gpu,
            "torch": torch_version,
            "huggingfaceToken": bool(resolve_token()),
            "model": os.environ.get("STUDIO_TRELLIS_MODEL", "microsoft/TRELLIS-image-large"),
            "metrics": vram_snapshot(),
        }
    )


def infer(input_path: str, output_path: str) -> None:
    if not os.path.isfile(input_path):
        fail(EXIT_ARGS, f"Imagem de entrada ausente: {input_path}")

    t0 = time.monotonic()
    phases: dict[str, int] = {}

    def mark(name: str) -> None:
        phases[name] = int((time.monotonic() - t0) * 1000)
        log(f"{name} +{phases[name]}ms")

    apply_trellis_root()
    os.environ.setdefault("SPCONV_ALGO", "native")
    check_cuda()
    check_trellis_import()
    mark("cuda")

    token = resolve_token()
    if token:
        os.environ.setdefault("HF_TOKEN", token)
        os.environ.setdefault("HUGGINGFACE_HUB_TOKEN", token)

    model = os.environ.get("STUDIO_TRELLIS_MODEL", "microsoft/TRELLIS-image-large").strip()
    local_dir = os.environ.get("STUDIO_TRELLIS_WEIGHTS", "").strip()
    source = local_dir or model

    if not local_dir:
        download_weights(model, token)
    mark("weights")

    try:
        from PIL import Image
        from trellis.pipelines import TrellisImageTo3DPipeline
        from trellis.utils import postprocessing_utils
    except ImportError as err:
        fail(EXIT_DEPS, f"Import TRELLIS falhou: {err}")

    pipeline = None
    try:
        log(f"carregando modelo {source}")
        pipeline = TrellisImageTo3DPipeline.from_pretrained(source)
        pipeline.cuda()
        mark("load")

        image = Image.open(input_path).convert("RGBA")
        width, height = image.size
        if min(width, height) < 32:
            fail(EXIT_ARGS, f"Imagem muito pequena para TRELLIS ({width}x{height}, mín. 32px).")
        log(f"imagem {width}x{height}")

        outputs = pipeline.run(
            image,
            seed=int(os.environ.get("STUDIO_TRELLIS_SEED", "1")),
            sparse_structure_sampler_params={
                "steps": int(os.environ.get("STUDIO_TRELLIS_SS_STEPS", "25")),
                "cfg_strength": float(os.environ.get("STUDIO_TRELLIS_SS_CFG", "7.5")),
            },
            slat_sampler_params={
                "steps": int(os.environ.get("STUDIO_TRELLIS_SLAT_STEPS", "25")),
                "cfg_strength": float(os.environ.get("STUDIO_TRELLIS_SLAT_CFG", "3.0")),
            },
        )
        mark("run")

        glb = postprocessing_utils.to_glb(
            outputs["gaussian"][0],
            outputs["mesh"][0],
            simplify=float(os.environ.get("STUDIO_TRELLIS_SIMPLIFY", "0.90")),
            texture_size=int(os.environ.get("STUDIO_TRELLIS_TEXTURE", "2048")),
        )
        os.makedirs(os.path.dirname(os.path.abspath(output_path)) or ".", exist_ok=True)
        glb.export(output_path)
        mark("export")
    except SystemExit:
        raise
    except Exception as err:
        log(traceback.format_exc())
        extra = {"metrics": {**vram_snapshot(), "phasesMs": phases, "elapsedMs": int((time.monotonic() - t0) * 1000)}}
        if is_oom(err):
            fail(
                EXIT_OOM,
                "VRAM insuficiente (CUDA OOM). TRELLIS precisa de GPU ≥16GB.",
                extra,
            )
        fail(EXIT_INFER, f"Inferência TRELLIS falhou: {err}", extra)
    finally:
        release_cuda()

    if not is_glb(output_path):
        fail(EXIT_INFER, "TRELLIS terminou sem um GLB válido (magic glTF).")

    elapsed_ms = int((time.monotonic() - t0) * 1000)
    metrics = {
        **vram_snapshot(),
        "elapsedMs": elapsed_ms,
        "phasesMs": phases,
        "glbBytes": os.path.getsize(output_path),
        "imageWidth": width,
        "imageHeight": height,
        **mesh_stats(outputs["mesh"][0]),
    }
    log(
        f"ok elapsed={elapsed_ms}ms vramPeak={metrics.get('vramPeakMb')}MB "
        f"glb={metrics['glbBytes']}B verts={metrics.get('vertexCount')}"
    )
    emit({"ok": True, "output": output_path, "bytes": metrics["glbBytes"], "metrics": metrics})


def main() -> None:
    parser = argparse.ArgumentParser(description="X09 TRELLIS sidecar")
    parser.add_argument("--probe", action="store_true")
    parser.add_argument("--input")
    parser.add_argument("--output")
    args = parser.parse_args()

    if args.probe:
        probe()
        return
    if not args.input or not args.output:
        fail(EXIT_ARGS, "Use --probe ou --input e --output.")
    infer(args.input, args.output)


if __name__ == "__main__":
    main()
