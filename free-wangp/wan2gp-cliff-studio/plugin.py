import gradio as gr

from shared.gradio.progress import WangpProgress
from shared.utils.plugins import WAN2GPPlugin

PLUGIN_ID = "CliffFreeStudio"

TOOL_MODELS = {
    "Text → Video": "ltx2_25_22B_distilled",
    "Image → Video / Start + End": "minimax_h3_fl2va_pruned",
    "Reference → Video": "minimax_h3_ref2va_pruned",
    "Multi-Subject Reference": "ltx2_25_22B_msr",
    "Motion Transfer / Control": "minimax_h3_control_pruned",
    "Video Edit / Character / Object / Wardrobe / Location Swap": "ltx2_22B_distilled_1_1_edit_anything",
}

RATIOS = {
    "16:9": "1280x704",
    "9:16": "704x1280",
    "1:1": "960x960",
    "3:4": "832x1104",
    "4:3": "1104x832",
}


def build_cinematic_prompt(base, genre, era, camera, lens, move, lighting, tempo, ratio, audio):
    base = str(base or "").strip()
    sound = (
        "Synchronized natural ambience, realistic foley, and cinematic sound design matched precisely to the visible action."
        if audio
        else "No generated soundtrack; prioritize clean visual continuity."
    )
    return "\n".join(
        [
            base,
            f"Genre: {genre}. Era: {era}.",
            f"Camera: {camera}, {lens}, {move}. Editing tempo: {tempo}.",
            (
                f"Lighting: {lighting}. Preserve physically believable motion, stable anatomy, coherent hands and faces, "
                "natural skin texture, consistent identity, accurate reflections, and realistic depth of field."
            ),
            (
                f"Composition: {ratio}, cinematic blocking, clear subject separation, controlled highlights, "
                "no random objects, no warped text, no duplicate subjects, no sudden camera jumps."
            ),
            sound,
        ]
    )


class CliffFreeStudioPlugin(WAN2GPPlugin):
    def __init__(self):
        super().__init__()
        self.name = "Cliff Free Cinematic Studio"
        self.version = "1.0.0"
        self.description = "Free local cinematic prompt-to-video and Higgsfield-style workflow launcher for WanGP."

    def setup_ui(self):
        self.request_component("state")
        self.request_component("main_tabs")
        self.request_component("model_choice_target")
        self.request_global("switch_to_model")
        self.add_tab(
            tab_id=PLUGIN_ID,
            label="Cliff Studio",
            component_constructor=self.create_config_ui,
            position=1,
        )

    def create_config_ui(self, api_session):
        active_job = {"job": None}

        def compile_prompt(base, genre, era, camera, lens, move, lighting, tempo, ratio, audio):
            return build_cinematic_prompt(base, genre, era, camera, lens, move, lighting, tempo, ratio, audio)

        def generate_video(base, genre, era, camera, lens, move, lighting, tempo, ratio, duration, audio, progress=WangpProgress()):
            prompt = build_cinematic_prompt(base, genre, era, camera, lens, move, lighting, tempo, ratio, audio)

            settings = api_session.get_default_settings("ltx2_25_22B_distilled")
            settings["model_type"] = "ltx2_25_22B_distilled"
            settings["prompt"] = prompt
            settings["resolution"] = RATIOS.get(str(ratio), "704x1280")
            settings["video_length"] = f"{int(duration)}s"

            class Callbacks:
                ratio_value = 0.0

                def on_status(self, status):
                    status = str(status or "").strip()
                    if status:
                        progress(self.ratio_value, desc=status)

                def on_progress(self, update):
                    self.ratio_value = max(0.0, min(1.0, float(getattr(update, "progress", 0)) / 100.0))
                    progress(self.ratio_value, desc=str(getattr(update, "status", "") or "Generating locally..."))

            job = api_session.submit_task(settings, callbacks=Callbacks())
            active_job["job"] = job
            try:
                result = job.result()
            finally:
                if active_job.get("job") is job:
                    active_job["job"] = None

            if result.success and result.generated_files:
                return result.generated_files[0], prompt, "Completed locally with no API credits."
            if result.cancelled:
                return gr.update(), prompt, "Generation cancelled."
            errors = list(result.errors or [])
            raise gr.Error(str(errors[0] if errors else "WanGP finished without returning a video."))

        def cancel_generation():
            job = active_job.get("job")
            if job is not None and not job.done:
                job.cancel()
                return "Cancellation requested."
            return "No active generation."

        with gr.Column() as root:
            gr.Markdown(
                """
# Cliff Free Cinematic Studio
**Local generation — no Higgsfield API key and no per-video credit meter.**

Use the cinematic prompt builder for direct LTX-2.5 generation, or launch one of the native WanGP workflows below for start/end frames, references, edits, motion transfer, swaps, masks, and multi-subject work.
"""
            )

            with gr.Row():
                with gr.Column(scale=3):
                    base_prompt = gr.Textbox(
                        label="Prompt",
                        lines=7,
                        value="A premium cinematic nightlife scene with realistic people, natural skin texture, confident movement, rich practical lighting, and polished commercial camera work.",
                    )
                with gr.Column(scale=2):
                    genre = gr.Dropdown(["General","Action","Epic","Drama","Comedy","Horror","Noir","Music Video","Nightlife"], value="Nightlife", label="Genre")
                    era = gr.Dropdown(["2020s","2010s","2000s","1990s","1980s","1970s","1960s"], value="2020s", label="Era")
                    ratio = gr.Dropdown(list(RATIOS.keys()), value="9:16", label="Aspect Ratio")
                    duration = gr.Dropdown([4,5,6,8,10,15,20,30], value=5, label="Duration (seconds)")

            with gr.Row():
                camera = gr.Dropdown(["Cinema Camera","35mm Film","8mm Film","DV Camcorder","Handheld Documentary","Robot Arm","Drone / Helicopter"], value="Cinema Camera", label="Camera")
                lens = gr.Dropdown(["24mm Wide","35mm","50mm Natural","85mm Portrait","100mm Macro","Anamorphic"], value="50mm Natural", label="Lens")
                move = gr.Dropdown(["Static","Slow Push-In","Slow Pull-Out","Pan Left","Pan Right","Orbit","Tracking Shot","Crane Up","Crane Down","Dolly Zoom","POV"], value="Slow Push-In", label="Camera Move")

            with gr.Row():
                lighting = gr.Dropdown(["Natural","Soft Beauty","Neon Night","High Contrast","Golden Hour","Moonlight","Club Lighting","Practical Lights","Silhouette"], value="Club Lighting", label="Lighting")
                tempo = gr.Dropdown(["Slow","Measured","Medium","Fast","Chaotic"], value="Measured", label="Tempo")
                audio = gr.Checkbox(value=True, label="Include cinematic audio instructions")

            compile_btn = gr.Button("Compile Cinematic Prompt")
            compiled = gr.Textbox(label="Compiled Prompt", lines=10)

            with gr.Row():
                generate_btn = gr.Button("Generate Free Local Video", variant="primary")
                cancel_btn = gr.Button("Cancel")
            output = gr.Video(label="Generated Video")
            status = gr.Textbox(label="Status", value="Ready.", interactive=False)
            progress_component = WangpProgress.component()

            inputs = [base_prompt, genre, era, camera, lens, move, lighting, tempo, ratio, audio]
            compile_btn.click(fn=compile_prompt, inputs=inputs, outputs=[compiled])
            WangpProgress.bind(
                generate_btn.click,
                generate_video,
                inputs=[base_prompt, genre, era, camera, lens, move, lighting, tempo, ratio, duration, audio],
                outputs=[output, compiled, status],
                component=progress_component,
            )
            cancel_btn.click(fn=cancel_generation, outputs=[status], queue=False)

            gr.Markdown("## Higgsfield-style local workflow launcher")
            gr.Markdown("These buttons open the native WanGP Media Generator with the best matching local model family.")

            buttons = []
            for label, model in TOOL_MODELS.items():
                btn = gr.Button(label)
                btn.click(
                    fn=lambda m=model: self.switch_to_model(m, True),
                    outputs=[self.model_choice_target, self.main_tabs],
                    show_progress="hidden",
                )
                buttons.append(btn)

            gr.Markdown(
                """
**Workflow map**
- **Text → Video / Extend:** LTX-2.5 Distilled
- **Image → Video / Start + End:** MiniMax H3 FL2VA Pruned
- **Reference → Video:** MiniMax H3 Ref2VA Pruned
- **Multi-subject references:** LTX-2.5 MSR
- **Motion transfer / pose / depth / edge / inpaint:** MiniMax H3 ControlNet-Union Pruned
- **Video edit / character swap / product swap / wardrobe swap / location swap:** LTX-2.3 EditAnything
"""
            )

        return root
