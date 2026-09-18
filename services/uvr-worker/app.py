import os
import tempfile
import zipfile
from pathlib import Path

from audio_separator.separator import Separator
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

app = FastAPI(title="ArtistYar UVR Worker", version="1.0.0")
MODEL_DIR = Path(os.getenv("MODEL_DIR", "/models"))
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "250"))
MODEL_DIR.mkdir(parents=True, exist_ok=True)

PRESETS = {
    "vocal_balanced": {"ensemble_preset": "vocal_balanced"},
    "vocal_clean": {"ensemble_preset": "vocal_clean"},
    "instrumental_clean": {"ensemble_preset": "instrumental_clean"},
    "instrumental_full": {"ensemble_preset": "instrumental_full"},
    "karaoke": {"ensemble_preset": "karaoke"},
    "htdemucs_ft": {"model_filename": "htdemucs_ft.yaml"},
}

@app.get("/health")
def health():
    return {"ok": True, "service": "artistyar-uvr-worker"}

def build_separator(preset: str, output_dir: str) -> Separator:
    config = PRESETS[preset]
    common = {"output_dir": output_dir, "model_file_dir": str(MODEL_DIR), "output_format": "WAV", "output_bitrate": "320k"}
    if "ensemble_preset" in config:
        return Separator(ensemble_preset=config["ensemble_preset"], **common)
    return Separator(model_filename=config["model_filename"], **common)

@app.post("/separate")
async def separate(file: UploadFile = File(...), preset: str = Form("vocal_balanced")):
    if preset not in PRESETS:
        raise HTTPException(status_code=400, detail="Unsupported separation preset.")
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".wav", ".mp3", ".flac", ".m4a", ".aac", ".ogg", ".opus"}:
        raise HTTPException(status_code=400, detail="Unsupported audio format.")

    job_dir = Path(tempfile.mkdtemp(prefix="artistyar-uvr-"))
    try:
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
        separator = build_separator(preset, str(output_dir))
        separator.load_model()
        output_files = separator.separate(str(source))
        generated = [Path(path) for path in output_files if Path(path).exists()] or list(output_dir.glob("*"))
        if not generated:
            raise HTTPException(status_code=500, detail="The separator produced no output stems.")

        zip_path = job_dir / "artistyar-stems.zip"
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for stem in generated:
                archive.write(stem, stem.name)
        return FileResponse(zip_path, media_type="application/zip", filename="artistyar-stems.zip")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="UVR inference failed: " + str(exc)) from exc
