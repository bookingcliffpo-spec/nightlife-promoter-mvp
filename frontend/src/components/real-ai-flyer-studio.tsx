"use client";

import { ChangeEvent, useRef, useState } from "react";

type JobStatus = "idle" | "uploading" | "queued" | "processing" | "completed" | "failed" | "cancelled";

const SPACE_ID = "Lightricks/ltx-video-distilled";
const SPACE_ORIGIN = "https://lightricks-ltx-video-distilled.hf.space";
const GRADIO_CDN = "https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js";

const DEFAULT_PROMPT = `Use the uploaded flyer as the exact first frame/reference. Create a cinematic luxury nightlife promo video for Instagram Reels, 9:16 vertical, 8 seconds, with smooth controlled motion.

Keep the man's exact face, facial structure, skin tone, hairline, eyes, nose, lips, beard, clothing, jewelry, hands, pose, and recognizable identity unchanged. Do not redesign or beautify him. Keep every flyer word spelled exactly as shown and preserve the original typography, hierarchy, logos, date, venue information, and layout.

Animate the scene with a slow cinematic camera push-in. Add subtle depth, atmospheric lighting, natural environmental motion, and realistic object-specific movement. Keep important text readable and keep the final frame clean and stable.

STRICTLY AVOID: face morphing, body changes, lip movement, talking, blinking distortion, extra fingers, extra limbs, warped hands, duplicate people, changing jewelry, changing clothing, changing text, misspelled words, moving text out of position, disappearing logos, excessive camera shake, fast zooms, cartoon animation, HDR, AI sharpening, fake plastic skin, sparks, dust particles, graffiti, grunge, lens flares, or covering important text.`;

const NEGATIVE_PROMPT =
  "worst quality, low quality, inconsistent motion, blurry, jittery, distorted, warped face, face morphing, extra fingers, extra limbs, duplicate person, misspelled text, moving text, disappearing logo, plastic skin, HDR, AI sharpening, lens flare, sparks, dust, graffiti, grunge";

const DIMENSIONS: Record<string,{height:number;width:number}> = {
  "9:16": { height: 896, width: 512 },
  "16:9": { height: 512, width: 896 },
  "1:1": { height: 704, width: 704 },
  "3:4": { height: 768, width: 576 },
  "4:3": { height: 576, width: 768 },
};

function normalizeSpaceUrl(value: string) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return SPACE_ORIGIN + value;
  return value;
}

function extractVideoUrl(data: any): string {
  const first = Array.isArray(data) ? data[0] : data;
  if (!first) return "";
  if (typeof first === "string") return normalizeSpaceUrl(first);
  const video = first.video ?? first;
  const url = video?.url ?? video?.path ?? first?.url ?? first?.path ?? "";
  return normalizeSpaceUrl(String(url || ""));
}

async function dynamicGradio() {
  const importer = new Function("u", "return import(u)") as (url: string) => Promise<any>;
  return importer(GRADIO_CDN);
}

async function browserFriendlyImage(file: File): Promise<File | Blob> {
  const type = (file.type || "").toLowerCase();
  if (["image/jpeg","image/png","image/webp"].includes(type)) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("This image format could not be opened. Try JPG, PNG, or WebP."));
      el.src = objectUrl;
    });
    const maxSide = 1800;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare the image.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not convert the image.")), "image/jpeg", 0.95)
    );
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function RealAiFlyerStudio() {
  const inputRef = useRef<HTMLInputElement>(null);
  const submissionRef = useRef<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [aspect, setAspect] = useState("9:16");
  const [duration, setDuration] = useState(8);
  const [status, setStatus] = useState<JobStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Online ZeroGPU ready.");
  const [outputUrl, setOutputUrl] = useState("");

  const busy = ["uploading","queued","processing"].includes(status);

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0];
    if (!next) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setOutputUrl("");
    setStatus("idle");
    setProgress(0);
    setMessage("Flyer loaded. Type your prompt and generate.");
    event.target.value = "";
  };

  const reset = () => {
    try { submissionRef.current?.cancel?.(); } catch {}
    submissionRef.current = null;
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    setPrompt(DEFAULT_PROMPT);
    setAspect("9:16");
    setDuration(8);
    setStatus("idle");
    setProgress(0);
    setMessage("Online ZeroGPU ready.");
    setOutputUrl("");
  };

  const cancel = () => {
    try { submissionRef.current?.cancel?.(); } catch {}
    submissionRef.current = null;
    setStatus("cancelled");
    setProgress(0);
    setMessage("Generation cancelled.");
  };

  const generate = async () => {
    if (!file) {
      setMessage("Upload a flyer first.");
      return;
    }
    if (!prompt.trim()) {
      setMessage("Type the motion prompt you want.");
      return;
    }

    setOutputUrl("");
    setStatus("uploading");
    setProgress(3);
    setMessage("Connecting to the free online GPU…");

    try {
      const { Client, handle_file } = await dynamicGradio();
      const prepared = await browserFriendlyImage(file);

      setStatus("queued");
      setProgress(8);
      setMessage("Sending your flyer to the ZeroGPU queue…");

      const client = await Client.connect(SPACE_ID, {
        events: ["status", "data"],
      });

      const dims = DIMENSIONS[aspect] || DIMENSIONS["9:16"];
      const submission = client.submit("/image_to_video", {
        prompt: prompt.trim(),
        negative_prompt: NEGATIVE_PROMPT,
        input_image_filepath: handle_file(prepared),
        input_video_filepath: null,
        height_ui: dims.height,
        width_ui: dims.width,
        mode: "image-to-video",
        duration_ui: Math.min(8.5, Number(duration)),
        ui_frames_to_use: 9,
        seed_ui: 42,
        randomize_seed: true,
        ui_guidance_scale: 1,
        improve_texture_flag: true,
      });

      submissionRef.current = submission;
      let foundVideo = "";

      for await (const msg of submission) {
        if (msg.type === "status") {
          const stage = String(msg.stage || "");
          if (stage === "pending") {
            setStatus("queued");
            setProgress(12);
            const position = typeof msg.position === "number" ? ` Queue position: ${msg.position + 1}.` : "";
            const eta = typeof msg.eta === "number" && Number.isFinite(msg.eta) ? ` ETA about ${Math.max(1, Math.round(msg.eta))}s.` : "";
            setMessage("Waiting for free ZeroGPU capacity…" + position + eta);
          } else if (stage === "generating") {
            setStatus("processing");
            const values = Array.isArray(msg.progress_data) ? msg.progress_data : [];
            const p = values.length ? Number(values[values.length - 1]?.progress) : NaN;
            const next = Number.isFinite(p) ? 20 + Math.round(Math.max(0, Math.min(1, p)) * 70) : 45;
            setProgress(Math.max(20, Math.min(92, next)));
            const desc = values.length ? String(values[values.length - 1]?.desc || "") : "";
            setMessage(desc || "Generating your cinematic AI video…");
          } else if (stage === "complete") {
            setProgress(96);
            setMessage("Finalizing your video…");
          } else if (stage === "error") {
            throw new Error(String(msg.message || "The online GPU generation failed."));
          }
        }

        if (msg.type === "data") {
          const url = extractVideoUrl(msg.data);
          if (url) foundVideo = url;
        }
      }

      submissionRef.current = null;
      if (!foundVideo) {
        throw new Error("The online model finished without returning a video.");
      }

      setOutputUrl(foundVideo);
      setStatus("completed");
      setProgress(100);
      setMessage("Your AI video is ready.");
    } catch (error) {
      submissionRef.current = null;
      setStatus("failed");
      setProgress(0);
      const raw = error instanceof Error ? error.message : String(error);
      const quota = /quota|gpu.*limit|exceeded|rate.?limit/i.test(raw);
      setMessage(quota
        ? "The free ZeroGPU quota is temporarily exhausted. Try again after the free quota resets."
        : raw || "Could not generate the video.");
    }
  };

  return (
    <main className="real-ai-page">
      <header className="real-ai-topbar">
        <div>
          <b>CLIFF AI VIDEO</b>
          <span>FLYER → CINEMATIC VIDEO</span>
        </div>
        <div className="engine-pill online">
          <i />
          ONLINE ZERO GPU
        </div>
      </header>

      <section className="real-ai-shell">
        <div className="real-ai-heading">
          <p>FREE ONLINE AI • NO LOCAL SERVER</p>
          <h1>Upload. Prompt. Generate.</h1>
          <span>
            Upload your flyer from your phone or computer, describe the motion you want,
            and generate the video online.
          </span>
        </div>

        <section className="real-ai-grid">
          <div className="real-ai-card creator-card">
            <div className="creator-section">
              <div className="creator-label">
                <div><strong>1</strong><b>UPLOAD FLYER</b></div>
                <span>{file ? "READY" : "1 IMAGE"}</span>
              </div>

              {!preview ? (
                <button className="reference-drop" onClick={() => inputRef.current?.click()}>
                  <span className="upload-icon">+</span>
                  <b>ADD FLYER / FIRST FRAME</b>
                  <small>PHONE OR COMPUTER • JPG • PNG • WEBP • HEIC</small>
                </button>
              ) : (
                <div className="single-reference">
                  <img src={preview} alt="Uploaded flyer" />
                  <div>
                    <b>FIRST FRAME</b>
                    <span>{file?.name}</span>
                    <button onClick={() => inputRef.current?.click()}>REPLACE</button>
                  </div>
                </div>
              )}

              <input
                ref={inputRef}
                className="hidden-file-input"
                type="file"
                accept="image/*"
                onChange={onFile}
              />
            </div>

            <div className="creator-section">
              <div className="creator-label">
                <div><strong>2</strong><b>VIDEO PROMPT</b></div>
                <span>{prompt.length.toLocaleString()} CHARACTERS</span>
              </div>
              <textarea
                className="real-ai-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Describe exactly what should move, glow, pulse, crawl, float, shimmer, or stay locked."
              />
              <div className="prompt-help">
                Your prompt is sent directly to an online LTX image-to-video ZeroGPU model.
              </div>
            </div>

            <div className="creator-section compact-section">
              <div className="creator-label">
                <div><strong>3</strong><b>OUTPUT</b></div>
              </div>
              <div className="output-controls">
                <label>
                  <span>FORMAT</span>
                  <select value={aspect} onChange={(event) => setAspect(event.target.value)}>
                    <option value="9:16">9:16 REELS</option>
                    <option value="16:9">16:9 WIDE</option>
                    <option value="1:1">1:1 SQUARE</option>
                    <option value="3:4">3:4 PORTRAIT</option>
                    <option value="4:3">4:3</option>
                  </select>
                </label>
                <label>
                  <span>LENGTH</span>
                  <select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
                    {[4,5,6,8].map((seconds) => (
                      <option key={seconds} value={seconds}>{seconds} SEC</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="generate-zone">
              <button
                className="real-generate-button"
                disabled={busy || !file || !prompt.trim()}
                onClick={() => void generate()}
              >
                {busy ? "GENERATING…" : "GENERATE AI VIDEO"}
              </button>
              {busy && (
                <button className="cancel-generation" onClick={cancel}>
                  CANCEL
                </button>
              )}
              <p>Hosted online. No 127.0.0.1. No local computer worker required.</p>
            </div>

            {(message || status !== "idle") && (
              <div className={"generation-status " + status}>
                <div className="status-row">
                  <b>{status === "completed" ? "VIDEO READY" : status === "failed" ? "GENERATION ERROR" : status === "queued" ? "ZERO GPU QUEUE" : status === "processing" ? "AI GENERATING" : "STATUS"}</b>
                  <span>{progress}%</span>
                </div>
                <div className="status-track">
                  <div style={{ width: progress + "%" }} />
                </div>
                <p>{message}</p>
              </div>
            )}
          </div>

          <aside className="real-ai-card output-card">
            <div className="output-title">
              <div>
                <p>RESULT</p>
                <h2>{outputUrl ? "Your video is ready." : "Your video will appear here."}</h2>
              </div>
              {outputUrl && <span>AI VIDEO</span>}
            </div>

            <div className="result-stage">
              {outputUrl ? (
                <video key={outputUrl} src={outputUrl} controls playsInline autoPlay loop />
              ) : preview ? (
                <div className="waiting-preview">
                  <img src={preview} alt="First frame preview" />
                  <div className="waiting-overlay">
                    <span>{busy ? progress + "%" : "READY"}</span>
                  </div>
                </div>
              ) : (
                <div className="empty-result">
                  <div>▶</div>
                  <b>UPLOAD YOUR FLYER</b>
                  <span>Then type the motion you want.</span>
                </div>
              )}
            </div>

            {outputUrl ? (
              <div className="result-actions">
                <a href={outputUrl} target="_blank" rel="noreferrer">OPEN VIDEO</a>
                <a href={outputUrl} download>DOWNLOAD</a>
              </div>
            ) : (
              <div className="result-rules">
                <div><b>FIRST FRAME</b><span>Your uploaded flyer starts the generation.</span></div>
                <div><b>PROMPT DRIVEN</b><span>Describe camera, object, light and atmosphere motion.</span></div>
                <div><b>ONLINE GPU</b><span>Hugging Face ZeroGPU handles the AI render.</span></div>
              </div>
            )}
          </aside>
        </section>

        <footer className="real-ai-footer">
          <span>ONLINE ENGINE: LTX VIDEO • HUGGING FACE ZERO GPU</span>
          <button onClick={reset}>RESET STUDIO</button>
        </footer>
      </section>
    </main>
  );
}
