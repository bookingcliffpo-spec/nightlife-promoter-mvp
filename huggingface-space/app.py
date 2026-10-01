import os
import tempfile
from pathlib import Path

import gradio as gr
import spaces
import torch
from diffusers import LTXImageToVideoPipeline
from diffusers.utils import export_to_video, load_image

MODEL_ID = "Lightricks/LTX-Video-0.9.5"

RATIOS = {
    "9:16": (448, 768),
    "16:9": (768, 448),
    "1:1": (576, 576),
    "3:4": (576, 768),
    "4:3": (768, 576),
}

NEGATIVE = (
    "worst quality, low quality, inconsistent motion, blurry, jittery, distorted, "
    "warped face, face morphing, extra fingers, extra limbs, duplicate person, "
    "misspelled text, moving text, disappearing logo, plastic skin, HDR, lens flare, sparks, dust"
)

_pipe = None

def get_pipe():
    global _pipe
    if _pipe is None:
        _pipe = LTXImageToVideoPipeline.from_pretrained(
            MODEL_ID,
            torch_dtype=torch.bfloat16,
        )
        _pipe.enable_model_cpu_offload()
    return _pipe

def frames_for(seconds: int, fps: int = 16) -> int:
    raw = max(4, int(seconds)) * fps
    return ((raw - 1) // 8) * 8 + 1

@spaces.GPU(duration=300)
def generate(image, prompt, aspect_ratio, duration_seconds, seed):
    if image is None:
        raise gr.Error("Upload a flyer or reference image first.")
    prompt = (prompt or "").strip()
    if not prompt:
        raise gr.Error("Type the motion prompt you want.")

    width, height = RATIOS.get(aspect_ratio, RATIOS["9:16"])
    pipe = get_pipe()
    generator = torch.Generator(device="cpu").manual_seed(int(seed))

    locked_prompt = (
        "Use the uploaded image as the exact first frame/reference. "
        "Preserve recognizable identity, face, clothing, jewelry, pose, skin tone, "
        "all visible flyer text, logos, spelling, typography, hierarchy, and layout as faithfully as possible. "
        "Keep important text readable. Do not redesign the flyer. "
        "Do not morph the face or body, add duplicate people, extra limbs, extra fingers, invented words, or missing logos. "
        "Apply only the cinematic motion described by the user.\n\n"
        + prompt
    )

    pil = load_image(image)
    result = pipe(
        image=pil,
        prompt=locked_prompt,
        negative_prompt=NEGATIVE,
        width=width,
        height=height,
        num_frames=frames_for(int(duration_seconds)),
        num_inference_steps=30,
        generator=generator,
    ).frames[0]

    fd, output_path = tempfile.mkstemp(suffix=".mp4")
    os.close(fd)
    export_to_video(result, output_path, fps=16)
    return output_path

with gr.Blocks(title="Cliff AI Video Online") as demo:
    gr.Markdown(
        """
# Cliff AI Video Online
Upload a flyer, type your cinematic motion prompt, and generate a real AI video on Hugging Face ZeroGPU.
"""
    )
    with gr.Row():
        image = gr.Image(type="filepath", label="Flyer / First Frame")
        output = gr.Video(label="Generated Video")
    prompt = gr.Textbox(
        label="Video Prompt",
        lines=14,
        placeholder="Describe exactly what should move, glow, pulse, crawl, float, shimmer, or remain locked.",
    )
    with gr.Row():
        aspect = gr.Dropdown(list(RATIOS.keys()), value="9:16", label="Aspect Ratio")
        duration = gr.Dropdown([4, 5, 6, 8, 10], value=5, label="Seconds")
        seed = gr.Number(value=42, precision=0, label="Seed")
    button = gr.Button("GENERATE AI VIDEO", variant="primary")
    button.click(generate, [image, prompt, aspect, duration, seed], output, api_name="generate")

if __name__ == "__main__":
    demo.queue(max_size=20).launch()
