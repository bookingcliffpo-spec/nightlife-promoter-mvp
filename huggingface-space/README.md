---
title: Cliff AI Video Online
emoji: 🎬
colorFrom: black
colorTo: red
sdk: gradio
sdk_version: 5.49.1
app_file: app.py
pinned: false
license: other
suggested_hardware: zerogpu
---

# Cliff AI Video Online

Hosted image-to-video backend for the Cliff AI Video website.

## Engine

- Model: Lightricks/LTX-Video-0.9.5
- Mode: image-to-video
- Compute: Hugging Face ZeroGPU
- Input: flyer / first-frame image + prompt
- Output: MP4

The app exposes a Gradio API endpoint named `/generate`.

## Notes

This is intended as the online alternative to the local WanGP worker. ZeroGPU is quota-limited by Hugging Face.
