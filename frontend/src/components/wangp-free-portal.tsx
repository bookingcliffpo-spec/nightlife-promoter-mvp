"use client";

import { useState } from "react";

const features = [
  ["VIDEO", "Wan 2.1/2.2, MiniMax H3, LTX-2/2.3/2.5, Hunyuan Video, LongCat and more."],
  ["IMAGE", "Qwen Image, Flux 1/2, Krea 2, Z-Image, HiDream, Ming Image and more."],
  ["AUDIO + TTS", "Qwen3 TTS, IndexTTS, Ace Step, OmniVoice, Chatterbox, music and voice tools."],
  ["GALLERIES", "Video, image and audio galleries with reusable settings and workspaces."],
  ["QUEUE", "Queue multiple generations and leave them running locally."],
  ["PROMPT ENHANCER", "Model-aware prompt enhancement with image-aware context."],
  ["LORAS + FINETUNES", "Load LoRAs, checkpoints and finetunes stored locally."],
  ["MOTION DESIGNER", "Built-in motion design and reference workflows."],
  ["EDITING TOOLS", "Masks, background removal, pose/depth/flow, inpainting and outpainting."],
  ["UPSCALE", "RIFE, FlashVSR, Lanczos and optional DLSS workflows."],
  ["DEEPY", "Low-VRAM offline assistant and mobile-friendly web app."],
  ["PLUGINS", "WanGP plugin manager, models manager, media flow and more."]
];

export function WanGPFreePortal() {
  const [copied, setCopied] = useState("");
  const clone = "git clone --recurse-submodules https://github.com/bookingcliffpo-spec/nightlife-promoter-mvp.git";
  const local = "python wgp.py --listen --server-port 7860 --no-auth --open-browser";
  const publicShare = "python wgp.py --share --no-auth";

  async function copy(label:string, value:string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(""), 1600);
    } catch {
      setCopied("");
    }
  }

  return (
    <main className="wangp-page">
      <header className="wangp-topbar">
        <div>
          <b>CLIFF FREE AI STUDIO</b>
          <small>POWERED BY WANGP BY DEEPBEEPMEEP</small>
        </div>
        <span className="wangp-badge">NO API CREDITS</span>
      </header>

      <section className="wangp-shell">
        <section className="wangp-hero">
          <p className="eyebrow">LOCAL OPEN GENERATION</p>
          <h1>Use your own GPU instead of buying generation credits.</h1>
          <p className="wangp-lead">
            This build follows the official WanGP project and includes it as the exact upstream source tree.
            The full WanGP interface and model stack run on your computer, so there is no Higgsfield balance,
            API key, or per-video charge.
          </p>
          <div className="wangp-actions">
            <a className="primary-action" href="http://127.0.0.1:7860" target="_blank" rel="noreferrer">OPEN LOCAL STUDIO</a>
            <a className="secondary-action" href="/motion">FREE BROWSER MOTION TOOL</a>
          </div>
          <div className="wangp-facts">
            <div><strong>$0</strong><span>API credits</span></div>
            <div><strong>LOCAL</strong><span>generation</span></div>
            <div><strong>6GB+</strong><span>select low-VRAM models</span></div>
            <div><strong>FULL</strong><span>WanGP UI</span></div>
          </div>
        </section>

        <section className="wangp-install">
          <div className="section-title">
            <p className="eyebrow">ONE-TIME SETUP</p>
            <h2>Install WanGP locally.</h2>
            <p>The upstream repository is included as a Git submodule so its components, license, updates and attribution stay intact.</p>
          </div>

          <div className="setup-grid">
            <article>
              <span>01</span>
              <h3>Clone this project</h3>
              <code>{clone}</code>
              <button onClick={() => void copy("clone", clone)}>{copied==="clone"?"COPIED":"COPY COMMAND"}</button>
            </article>
            <article>
              <span>02</span>
              <h3>Run the official installer</h3>
              <p><b>Windows:</b> open <code>WanGP\scripts\install.bat</code> and choose Automatic Install.</p>
              <p><b>Linux:</b> run <code>bash WanGP/scripts/install.sh</code>.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Launch the studio</h3>
              <code>{local}</code>
              <button onClick={() => void copy("local", local)}>{copied==="local"?"COPIED":"COPY COMMAND"}</button>
              <small>Run this inside the WanGP folder after its environment is active.</small>
            </article>
          </div>
        </section>

        <section className="wangp-features">
          <div className="section-title">
            <p className="eyebrow">COMPONENTS INCLUDED</p>
            <h2>The real WanGP stack, not a fake mockup.</h2>
          </div>
          <div className="feature-grid">
            {features.map(([name,desc]) => <article key={name}><b>{name}</b><p>{desc}</p></article>)}
          </div>
        </section>

        <section className="wangp-share">
          <div>
            <p className="eyebrow">OPTIONAL REMOTE ACCESS</p>
            <h2>Use your PC as the generator.</h2>
            <p>
              WanGP can expose a temporary share URL while all AI inference stays on the host computer.
              That avoids paid inference APIs, but people using the link will consume your GPU time and electricity.
            </p>
          </div>
          <div className="share-command">
            <code>{publicShare}</code>
            <button onClick={() => void copy("share", publicShare)}>{copied==="share"?"COPIED":"COPY SHARE COMMAND"}</button>
          </div>
        </section>

        <section className="license-panel">
          <b>LICENSE + ATTRIBUTION</b>
          <p>
            WanGP is by DeepBeepMeep and remains governed by the WanGP Community License 2.0 and the separate
            licenses of bundled third-party models/components. This project does not claim affiliation with or
            ownership of WanGP. It keeps the official project as an upstream submodule and is intended for free use.
          </p>
          <p>
            “Free” here means no API credit or subscription is required for local generation. You still provide the
            computer/GPU, storage, electricity and internet needed to download model weights.
          </p>
        </section>
      </section>
    </main>
  );
}
