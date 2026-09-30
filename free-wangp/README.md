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
