# Cliff AI Video Worker

This folder is the free compute backend for the public Cliff AI Video website.

The website itself is simple: upload images, type a prompt, press Generate. The heavy AI inference is performed by this computer using the included WanGP submodule and LTX-2.5.

## Windows

1. Install WanGP once with `free-wangp\install-and-run-windows.bat`.
2. Double-click `free-worker\START_FREE_AI_ENGINE.bat`.
3. On the very first run, enter the one-time setup code supplied to the site owner.
4. Leave the engine window open.

After pairing, the token is saved privately at `%USERPROFILE%\.cliff_ai_video_worker.json`. The setup code is not needed again.

## Normal use

Once the worker is running, anyone using the public site can:

- upload a flyer as the first frame
- add up to seven reference images
- type a cinematic motion prompt
- choose aspect ratio and duration
- press Generate

Jobs are transferred through private Supabase Storage buckets. The worker downloads the references, runs WanGP LTX-2.5 locally, uploads the finished MP4, and the site displays it automatically.

## Privacy

Input/output buckets are private. Browser jobs use random capability tokens. The worker credential is stored locally and is not committed to GitHub.

## Cost model

There is no Higgsfield API or per-generation API credit charge. The computer running WanGP supplies the GPU, storage, electricity, and model-download bandwidth.
