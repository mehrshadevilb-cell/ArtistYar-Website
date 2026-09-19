import os
import shutil
import tempfile
import zipfile
import wave
import hmac
from pathlib import Path

from audio_separator.separator import Separator
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

app = FastAPI(title="ArtistYar UVR Worker", version="1.1.0")
MODEL_DIR = Path(os.getenv("MODEL_DIR", "/models"))
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "250"))
WORKER_SECRET = os.getenv("UVR_WORKER_SECRET", "")
MAX_CONCURRENT_JOBS = max(1, int(os.getenv("MAX_CONCURRENT_JOBS", "1")))
MODEL_DIR.mkdir(parents=True, exist_ok=True)

PRESETS = {
    "vocal_balanced": {"ensemble_preset": "vocal_balanced"},
    "vocal_clean": {"ensemble_preset": "vocal_clean"},
    "instrumental_clean": {"ensemble_preset": "instrumental_clean"},
    "instrumental_full": {"ensemble_preset": "instrumental_full"},
    "karaoke": {"ensemble_preset": "karaoke"},
    "htdemucs_ft": {"model_filename": "htdemucs_ft.yaml"},
    "demucs_mdx_hq5": {"hybrid": True},
}

from asyncio import Semaphore
job_slots = Semaphore(MAX_CONCURRENT_JOBS)

@app.get("/health")
def health():
    return {"ok": True, "service": "artistyar-uvr-worker", "models_dir": str(MODEL_DIR)}

def build_separator(preset: str, output_dir: str) -> Separator:
    config = PRESETS[preset]
    common = {"output_dir": output_dir, "model_file_dir": str(MODEL_DIR), "output_format": "WAV", "output_bitrate": "320k"}
    if "ensemble_preset" in config:
        return Separator(ensemble_preset=config["ensemble_preset"], **common)
    return Separator(model_filename=config["model_filename"], **common)

def _find_stem(paths, needle: str):
    needle = needle.lower()
    for path in paths:
        if needle in path.stem.lower():
            return path
    return None


def _hybrid_demucs_mdx(source: Path, output_dir: Path):
    demucs_dir = output_dir / "demucs"
    mdx_dir = output_dir / "mdx_hq5"
    demucs_dir.mkdir()
    mdx_dir.mkdir()

    demucs = Separator(
        model_filename="htdemucs_ft.yaml",
        output_dir=str(demucs_dir),
        model_file_dir=str(MODEL_DIR),
        output_format="WAV",
        output_bitrate="320k",
        demucs_params={"shifts": 2, "overlap": 0.25, "segments_enabled": True},
    )
    demucs.load_model()
    demucs_files = [Path(p) for p in demucs.separate(str(source)) if Path(p).exists()]

    mdx = Separator(
        model_filename="UVR-MDX-NET-Inst_HQ_5.onnx",
        output_dir=str(mdx_dir),
        model_file_dir=str(MODEL_DIR),
        output_format="WAV",
        output_bitrate="320k",
        mdx_params={"hop_length": 1024, "segment_size": 256, "overlap": 0.25, "batch_size": 1, "enable_denoise": False},
    )
    mdx.load_model()
    mdx_files = [Path(p) for p in mdx.separate(str(source)) if Path(p).exists()]

    vocals = _find_stem(demucs_files, "vocals")
    instrumental = _find_stem(mdx_files, "instrumental")
    if not vocals:
        raise RuntimeError("Demucs did not produce a vocals stem.")
    if not instrumental:
        raise RuntimeError("MDX Inst HQ 5 did not produce an instrumental stem.")

    final_vocals = output_dir / "vocals_demucs_ft.wav"
    final_instrumental = output_dir / "instrumental_mdx_inst_hq5.wav"
    shutil.copy2(vocals, final_vocals)
    shutil.copy2(instrumental, final_instrumental)
    return [final_vocals, final_instrumental] + [p for p in demucs_files if p != vocals]

def cleanup(path: Path):
    shutil.rmtree(path, ignore_errors=True)

@app.post("/separate")
async def separate(
    file: UploadFile = File(...),
    preset: str = Form("vocal_balanced"),
    x_artistyar_worker_key: str | None = Header(default=None),
):
    provided_key = (x_artistyar_worker_key or "").encode()
    expected_key = WORKER_SECRET.encode()
    if not WORKER_SECRET or not hmac.compare_digest(provided_key, expected_key):
        raise HTTPException(status_code=401, detail="Unauthorized worker request.")
    if preset not in PRESETS:
        raise HTTPException(status_code=400, detail="Unsupported separation preset.")

    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".wav", ".mp3", ".flac", ".m4a", ".aac", ".ogg", ".opus"}:
        raise HTTPException(status_code=400, detail="Unsupported audio format.")

    job_dir = Path(tempfile.mkdtemp(prefix="artistyar-uvr-"))
    acquired = False
    try:
        await job_slots.acquire()
        acquired = True

        source = job_dir / ("input" + suffix)
        total = 0
        with source.open("wb") as target:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_UPLOAD_MB * 1024 * 1024:
                    raise HTTPException(status_code=413, detail="Audio file is too large.")
                target.write(chunk)

        output_dir = job_dir / "output"
        output_dir.mkdir()
        if PRESETS[preset].get("hybrid"):
            generated = _hybrid_demucs_mdx(source, output_dir)
        else:
            separator = build_separator(preset, str(output_dir))
            separator.load_model()
            output_files = separator.separate(str(source))
            generated = [Path(path) for path in output_files if Path(path).exists()] or list(output_dir.glob("*"))
        if not generated:
            raise HTTPException(status_code=500, detail="The separator produced no output stems.")

        zip_path = job_dir / "artistyar-stems.zip"
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for stem in generated:
                if stem.is_file():
                    archive.write(stem, stem.name)

        return FileResponse(
            zip_path,
            media_type="application/zip",
            filename="artistyar-stems.zip",
            background=BackgroundTask(cleanup, job_dir),
        )
    except HTTPException:
        cleanup(job_dir)
        raise
    except Exception as exc:
        print("UVR inference failed", repr(exc), flush=True)
        cleanup(job_dir)
        raise HTTPException(status_code=500, detail="UVR inference failed.") from exc
    finally:
        if acquired:
            job_slots.release()
