from __future__ import annotations

import argparse
import json
import mimetypes
import os
import shutil
import sys
import tempfile
import time
from pathlib import Path
from urllib.parse import quote

import requests

SUPABASE_URL = os.getenv("CLIFF_SUPABASE_URL", "https://ntmunryoutmjqdxgmzpw.supabase.co").rstrip("/")
SUPABASE_KEY = os.getenv("CLIFF_SUPABASE_KEY", "sb_publishable_6CJ2zR2iEKoVR3Lsd_eECA_iIl7vd6P")
BUCKET = "ai-video-assets"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

RESOLUTIONS = {
    "9:16": "704x1280",
    "16:9": "1280x704",
    "1:1": "960x960",
    "3:4": "832x1104",
    "4:3": "1104x832",
}


def rpc(name: str, payload: dict):
    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/{name}",
        headers=HEADERS,
        json=payload,
        timeout=60,
    )
    response.raise_for_status()
    if not response.text:
        return None
    return response.json()


def update(job_id: str, *, status=None, progress=None, message=None, output_url=None, error=None):
    try:
        rpc(
            "worker_update_ai_video_job",
            {
                "p_job_id": job_id,
                "p_status": status,
                "p_progress": progress,
                "p_message": message,
                "p_output_url": output_url,
                "p_error": error,
            },
        )
    except Exception as exc:
        print(f"[queue] status update failed: {exc}", flush=True)


def download(url: str, destination: Path):
    with requests.get(url, stream=True, timeout=180) as response:
        response.raise_for_status()
        with destination.open("wb") as handle:
            shutil.copyfileobj(response.raw, handle)


def upload_result(job_id: str, path: Path) -> str:
    object_path = f"results/{job_id}/{path.name}"
    mime = mimetypes.guess_type(path.name)[0] or "video/mp4"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": mime,
        "x-upsert": "true",
    }
    with path.open("rb") as handle:
        response = requests.post(
            f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{quote(object_path, safe='/')}",
            headers=headers,
            data=handle,
            timeout=600,
        )
    response.raise_for_status()
    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{quote(object_path, safe='/')}"


def build_settings(session, job: dict, local_inputs: list[str]):
    settings_data = job.get("settings") or {}
    ratio = str(settings_data.get("ratio") or "9:16")
    duration = int(settings_data.get("duration") or 8)

    model_type = "ltx2_25_22B_distilled" if len(local_inputs) == 1 else "ltx2_25_22B_msr"
    settings = session.get_default_settings(model_type) or {}
    settings["model_type"] = model_type
    settings["prompt"] = str(job.get("prompt") or "").strip()
    settings["resolution"] = RESOLUTIONS.get(ratio, "704x1280")
    settings["video_length"] = f"{max(4, min(duration, 30))}s"

    if local_inputs:
        settings["image_start"] = local_inputs[0]
    if len(local_inputs) > 1:
        settings["image_refs"] = local_inputs[1:5]

    return settings


def run_job(session, job: dict):
    job_id = str(job["id"])
    temp_dir = Path(tempfile.mkdtemp(prefix=f"cliff-ai-{job_id[:8]}-"))
    last_progress = {"value": -1, "time": 0.0}

    try:
        update(job_id, status="processing", progress=18, message="Downloading your reference image…")
        input_urls = list(job.get("inputs") or [])
        local_inputs = []

        for index, url in enumerate(input_urls):
            suffix = Path(str(url).split("?")[0]).suffix or ".jpg"
            target = temp_dir / f"input-{index + 1}{suffix}"
            download(str(url), target)
            local_inputs.append(str(target))

        settings = build_settings(session, job, local_inputs)
        update(job_id, progress=24, message="Loading the local AI video model…")

        class Callbacks:
            def on_status(self, status):
                text = str(status or "").strip()
                if text:
                    update(job_id, status="processing", message=text)

            def on_progress(self, progress):
                value = int(getattr(progress, "progress", 0) or 0)
                mapped = max(25, min(92, 25 + int(value * 0.67)))
                now = time.time()
                if mapped >= last_progress["value"] + 4 or now - last_progress["time"] > 4:
                    last_progress["value"] = mapped
                    last_progress["time"] = now
                    update(
                        job_id,
                        status="processing",
                        progress=mapped,
                        message=str(getattr(progress, "status", "") or "Generating cinematic motion…"),
                    )

        task = session.submit_task(settings, callbacks=Callbacks())
        result = task.result()

        if not result.success or not result.generated_files:
            errors = [str(error) for error in (result.errors or [])]
            raise RuntimeError(errors[0] if errors else "WanGP did not return a video.")

        output = Path(result.generated_files[0])
        if not output.is_absolute():
            output = Path.cwd() / output
        if not output.exists():
            raise RuntimeError(f"Generated file was not found: {output}")

        update(job_id, progress=95, message="Uploading finished video…")
        url = upload_result(job_id, output)
        update(
            job_id,
            status="completed",
            progress=100,
            message="Video ready.",
            output_url=url,
            error=None,
        )
        print(f"[done] {job_id} -> {url}", flush=True)

    except Exception as exc:
        print(f"[failed] {job_id}: {exc}", flush=True)
        update(
            job_id,
            status="failed",
            progress=100,
            message="Generation failed.",
            error=str(exc)[:1500],
        )
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def main():
    parser = argparse.ArgumentParser(description="Cliff AI Video WanGP queue worker")
    parser.add_argument("--root", default=".", help="WanGP installation directory")
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--poll", type=float, default=3.0)
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if not (root / "wgp.py").exists():
        raise SystemExit(f"WanGP was not found at {root}")

    os.chdir(root)
    sys.path.insert(0, str(root))

    from shared.api import init

    print("Cliff AI Video worker starting…", flush=True)
    print(f"WanGP: {root}", flush=True)
    session = init(root=root, console_output=True)

    while True:
        try:
            claimed = rpc("worker_claim_ai_video_job", {})
            job = claimed[0] if isinstance(claimed, list) and claimed else None
            if job:
                print(f"[job] {job['id']}", flush=True)
                run_job(session, job)
            elif args.once:
                return
            else:
                time.sleep(max(1.0, args.poll))
        except KeyboardInterrupt:
            print("Worker stopped.", flush=True)
            return
        except Exception as exc:
            print(f"[queue] {exc}", flush=True)
            if args.once:
                raise
            time.sleep(5)


if __name__ == "__main__":
    main()
