# Cliff Free AI Studio — powered by WanGP

This repository includes the official **WanGP / Wan2GP** project by DeepBeepMeep as a Git submodule at `/WanGP`.

The goal is simple: run real generative video, image, audio, and TTS models on your own computer instead of paying per-generation API credits.

## What "free" means

There is no Higgsfield API key, no per-video credit balance, and no subscription required for local generation. You provide the computer/GPU, storage, electricity, and bandwidth needed to download model weights.

WanGP itself remains governed by **WanGP Community License 2.0**, plus the separate licenses of third-party models and components. This project does not claim ownership of, sponsorship by, or affiliation with WanGP.

## Clone everything

```bash
git clone --recurse-submodules https://github.com/bookingcliffpo-spec/nightlife-promoter-mvp.git
cd nightlife-promoter-mvp
```

If the repository was cloned without submodules:

```bash
git submodule update --init --recursive
```

## Windows

1. Double-click `free-wangp\install-and-run-windows.bat`.
2. Choose **Automatic Install** in WanGP's official installer when prompted.
3. The full WanGP web UI opens at `http://127.0.0.1:7860`.

## Linux

```bash
chmod +x free-wangp/install-and-run-linux.sh
./free-wangp/install-and-run-linux.sh
```

The script delegates installation and execution to WanGP's own official scripts.

## Local network / phone

The launchers enable `--listen --server-port 7860 --no-auth`, so devices on the same network can open:

```
http://YOUR-PC-IP:7860
```

Do not expose an unauthenticated local instance directly to the public internet unless you understand the risk.

## Optional public share URL

WanGP supports a temporary Gradio/Hugging Face share URL. The included public-share launchers use:

```
--share --no-auth --lock-config
```

Anyone with that temporary link can submit work to **your** GPU. Keep this off unless you intentionally want to share it.

## Included WanGP capabilities

The upstream project currently includes video, image, audio/TTS, galleries, queues, LoRAs, finetunes, prompt enhancement, workspaces, Deepy, Motion Designer, mask/editing tools, preprocessing, postprocessing, upscaling, plugins, API/headless modes, and more.

The exact feature set follows the pinned WanGP submodule commit. Update it with:

```bash
git submodule update --remote WanGP
```

Review upstream release notes and license changes before committing a new submodule revision.


## Cliff Free Cinematic Studio plugin

The launchers automatically copy and enable `free-wangp/wan2gp-cliff-studio` inside WanGP.

After WanGP starts, open the **Cliff Studio** tab. It includes:

- cinematic prompt-to-video generation through local LTX-2.5 Distilled
- genre, era, camera, lens, camera-move, lighting, tempo, aspect-ratio, duration, and sound controls
- compiled cinematic prompts
- direct local generation with progress and cancellation
- workflow launch buttons for:
  - Text to Video
  - Image to Video / Start + End
  - Reference to Video
  - Multi-Subject Reference
  - Motion Transfer / Control
  - Video Edit
  - Character Swap
  - Object / Product Swap
  - Wardrobe Swap
  - Location Swap
  - Regional Edit / Inpaint
  - Style Transfer
  - Video Extend

The workflow buttons open the corresponding native WanGP model family so the generation itself remains handled by WanGP rather than a paid cloud API.

### Model mapping

| Creative workflow | Local WanGP model |
| --- | --- |
| Cinematic text-to-video / extend | `ltx2_25_22B_distilled` |
| Image-to-video / first-last frame | `minimax_h3_fl2va_pruned` |
| Multimodal references | `minimax_h3_ref2va_pruned` |
| Multi-subject reference | `ltx2_25_22B_msr` |
| Motion / pose / depth / edge / masked control | `minimax_h3_control_pruned` |
| Reference video edit / character-object-wardrobe-location swaps | `ltx2_22B_distilled_1_1_edit_anything` |

The public website also includes a cinematic prompt builder and can export a WanGP settings JSON file for the selected workflow.
