from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
import time
from pathlib import Path
from typing import Any

import requests
from supabase import create_client

SUPABASE_URL = "https://ntmunryoutmjqdxgmzpw.supabase.co"
SUPABASE_PUBLISHABLE_KEY = "sb_publishable_6CJ2zR2iEKoVR3Lsd_eECA_iIl7vd6P"
API_URL = SUPABASE_URL + "/functions/v1/flyer-video-api"
OUTPUT_BUCKET = "flyer-video-outputs"

REPO_ROOT = Path(__file__).resolve().parents[1]
WANGP_ROOT = REPO_ROOT / "WanGP"
CONFIG_PATH = Path.home() / ".cliff_ai_video_worker.json"

RESOLUTIONS = {
    "9:16": "704x1280",
    "16:9": "1280x704",
    "1:1": "1024x1024",
    "3:4": "768x1024",
    "4:3": "1024x768",
}

FLYER_LOCK = """
Treat the first uploaded image as the exact first frame and primary visual reference.
Preserve every visible person's recognizable identity, face, facial structure, skin tone,
hairline, eyes, nose, lips, facial hair, clothing, jewelry, hands, pose, and natural skin texture.
Preserve all existing flyer typography, wording, spelling, logos, dates, venue information,
hierarchy, relative placement, and layout as faithfully as possible. Do not redesign the flyer.
Do not add duplicate people, extra limbs, extra fingers, warped hands, invented logos, random text,
face morphing, talking, lip movement, plastic skin, HDR, AI sharpening, lens flares, sparks,
dust, graffiti, or grunge unless the user explicitly asks for it.
Use controlled cinematic motion and keep important text readable throughout.
""".strip()


def api(action: str, **payload: Any) -> dict[str, Any]:
    response = requests.post(
        API_URL,
        json={"action": action, **payload},
        timeout=60,
    )
    try:
        data = response.json()
    except Exception:
        data = {"error": response.text}
    if not response.ok:
        raise RuntimeError(data.get("error") or f"API error {response.status_code}")
    return data


def load_config() -> dict[str, Any]:
    if CONFIG_PATH.exists():
        try:
            return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def save_config(data: dict[str, Any]) -> None:
    CONFIG_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")


def register_worker(setup_code: str) -> str:
    data = api(
        "worker_register",
        setup_code=setup_code,
        name=os.environ.get("COMPUTERNAME") or os.environ.get("HOSTNAME") or "Cliff Free AI Engine",
    )
    token = str(data["worker_token"])
    config = load_config()
    config["worker_token"] = token
    config["worker_id"] = data.get("worker_id")
    save_config(config)
    return token


def download_file(url: str, destination: Path) -> None:
    with requests.get(url, stream=True, timeout=180) as response:
        response.raise_for_status()
        with destination.open("wb") as handle:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    handle.write(chunk)


def ensure_wangp() -> None:
    if not WANGP_ROOT.exists() or not (WANGP_ROOT / "shared" / "api.py").exists():
        raise RuntimeError(
            f"WanGP was not found at {WANGP_ROOT}. "
            "Clone the repository with submodules and install WanGP first."
        )


class ProgressBridge:
    def __init__(self, worker_token: str, job_id: str):
        self.worker_token = worker_token
        self.job_id = job_id
        self.last_sent = 10
        self.last_time = 0.0

    def _send(self, progress: int) -> None:
        progress = max(10, min(95, int(progress)))
        now = time.time()
        if progress < self.last_sent + 3 and now - self.last_time < 8:
            return
        self.last_sent = progress
        self.last_time = now
        try:
            api(
                "worker_progress",
                worker_token=self.worker_token,
                job_id=self.job_id,
                progress=progress,
            )
        except Exception:
            pass

    def on_status(self, status: str) -> None:
        self._send(max(self.last_sent, 12))

    def on_progress(self, update: Any) -> None:
        raw = float(getattr(update, "progress", 0) or 0)
        self._send(15 + int(max(0.0, min(100.0, raw)) * 0.78))

    def on_info(self, info: str) -> None:
        pass

    def on_output(self, output: Any) -> None:
        self._send(94)

    def on_error(self, error: Any) -> None:
        pass


def build_session():
    ensure_wangp()
    if str(WANGP_ROOT) not in sys.path:
        sys.path.insert(0, str(WANGP_ROOT))
    from shared.api import init
    return init(root=WANGP_ROOT, console_output=True, console_isatty=True)


def generate_one(session: Any, worker_token: str, job: dict[str, Any]) -> None:
    job_id = str(job["id"])
    print(f"\n[Cliff AI] Starting job {job_id}")
    api("worker_progress", worker_token=worker_token, job_id=job_id, progress=8)

    with tempfile.TemporaryDirectory(prefix="cliff_ai_") as temp:
        tempdir = Path(temp)
        local_inputs: list[Path] = []

        for index, url in enumerate(job.get("input_urls") or []):
            suffix = ".png" if ".png" in url.lower() else ".jpg"
            destination = tempdir / f"reference_{index + 1}{suffix}"
            print(f"[Cliff AI] Downloading reference {index + 1}…")
            download_file(str(url), destination)
            local_inputs.append(destination)

        if not local_inputs:
            raise RuntimeError("No input image was supplied.")

        model_type = "ltx2_25_22B_distilled"
        settings = session.get_default_settings(model_type)
        settings["model_type"] = model_type
        settings["prompt"] = FLYER_LOCK + "\n\nUSER MOTION PROMPT:\n" + str(job.get("prompt") or "")
        settings["resolution"] = RESOLUTIONS.get(str(job.get("aspect_ratio") or "9:16"), "704x1280")
        settings["video_length"] = f"{int(job.get('duration_seconds') or 8)}s"
        settings["image_start"] = str(local_inputs[0])

        if len(local_inputs) > 1:
            settings["image_refs"] = [str(path) for path in local_inputs[1:]]

        callbacks = ProgressBridge(worker_token, job_id)
        generation = session.submit_task(settings, callbacks=callbacks)
        result = generation.result()

        if getattr(result, "cancelled", False):
            raise RuntimeError("Generation was cancelled.")
        if not getattr(result, "success", False):
            errors = getattr(result, "errors", None) or []
            if errors:
                raise RuntimeError(str(errors[0]))
            raise RuntimeError("WanGP did not complete the generation.")

        generated = list(getattr(result, "generated_files", None) or [])
        if not generated:
            raise RuntimeError("WanGP returned no generated video file.")

        source = Path(str(generated[0])).expanduser()
        if not source.is_absolute():
            source = (WANGP_ROOT / source).resolve()
        if not source.exists():
            raise RuntimeError(f"Generated file was not found: {source}")

        print(f"[Cliff AI] Uploading result {source.name}…")
        storage = create_client(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
        with source.open("rb") as handle:
            storage.storage.from_(OUTPUT_BUCKET).upload_to_signed_url(
                path=str(job["output_path"]),
                token=str(job["output_upload_token"]),
                file=handle,
                file_options={"content-type": "video/mp4"},
            )

        api(
            "worker_complete",
            worker_token=worker_token,
            job_id=job_id,
            output_path=str(job["output_path"]),
        )
        print(f"[Cliff AI] Job {job_id} complete.")


def run(worker_token: str) -> None:
    print("[Cliff AI] Loading WanGP local AI engine…")
    session = build_session()
    print("[Cliff AI] Engine ready. Leave this window open.")
    print("[Cliff AI] The public website can now generate real AI videos using this computer.\n")

    while True:
        try:
            response = api("worker_claim", worker_token=worker_token)
            job = response.get("job")
            if not job:
                time.sleep(4)
                continue
            try:
                generate_one(session, worker_token, job)
            except KeyboardInterrupt:
                raise
            except Exception as error:
                print(f"[Cliff AI] Generation failed: {error}")
                try:
                    api(
                        "worker_fail",
                        worker_token=worker_token,
                        job_id=str(job.get("id") or ""),
                        error=str(error),
                    )
                except Exception:
                    pass
        except KeyboardInterrupt:
            print("\n[Cliff AI] Worker stopped.")
            return
        except Exception as error:
            print(f"[Cliff AI] Connection error: {error}")
            time.sleep(8)


def main() -> None:
    parser = argparse.ArgumentParser(description="Cliff AI Video free local WanGP worker")
    parser.add_argument("--setup-code", default="", help="One-time worker setup code")
    parser.add_argument("--reset", action="store_true", help="Forget the saved worker token")
    args = parser.parse_args()

    if args.reset and CONFIG_PATH.exists():
        CONFIG_PATH.unlink()

    config = load_config()
    token = str(config.get("worker_token") or "")

    if not token:
        setup_code = args.setup_code.strip() or input("Enter the one-time Cliff AI engine setup code: ").strip()
        if not setup_code:
            raise SystemExit("A setup code is required.")
        print("[Cliff AI] Pairing this computer with the website…")
        token = register_worker(setup_code)
        print("[Cliff AI] Pairing complete.")

    run(token)


if __name__ == "__main__":
    main()
