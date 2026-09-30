"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

type RatioKey = "original" | "9:16" | "16:9" | "1:1" | "3:4" | "4:3";
type MotionKey = "push" | "pull" | "pan-left" | "pan-right" | "rise" | "float" | "pulse";

const RATIOS: { key: RatioKey; label: string; w: number; h: number }[] = [
  { key: "9:16", label: "9:16 Reel", w: 720, h: 1280 },
  { key: "16:9", label: "16:9 Wide", w: 1280, h: 720 },
  { key: "1:1", label: "1:1 Square", w: 720, h: 720 },
  { key: "3:4", label: "3:4 Flyer", w: 720, h: 960 },
  { key: "4:3", label: "4:3", w: 960, h: 720 },
  { key: "original", label: "Original", w: 0, h: 0 }
];

const MOTIONS: { key: MotionKey; label: string; note: string }[] = [
  { key: "push", label: "Cinematic Push-In", note: "Slow premium zoom toward the flyer." },
  { key: "pull", label: "Slow Pull-Out", note: "Starts close and gently reveals the full image." },
  { key: "pan-left", label: "Pan Left", note: "Smooth lateral camera drift." },
  { key: "pan-right", label: "Pan Right", note: "Smooth lateral camera drift." },
  { key: "rise", label: "Rise Up", note: "Slow upward camera movement." },
  { key: "float", label: "Luxury Float", note: "Subtle zoom and floating movement." },
  { key: "pulse", label: "Poster Pulse", note: "Soft rhythmic push without distorting text." }
];

function supportedMime() {
  if (typeof MediaRecorder === "undefined") return "";
  const choices = [
    "video/mp4;codecs=h264",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm"
  ];
  return choices.find((x) => MediaRecorder.isTypeSupported(x)) ?? "";
}

function ease(t: number) {
  return t * t * (3 - 2 * t);
}

export function FreeMotionStudio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [fileName, setFileName] = useState("");
  const [imageReady, setImageReady] = useState(false);
  const [ratio, setRatio] = useState<RatioKey>("9:16");
  const [motion, setMotion] = useState<MotionKey>("push");
  const [duration, setDuration] = useState(5);
  const [strength, setStrength] = useState(55);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoType, setVideoType] = useState("");
  const [error, setError] = useState("");

  const motionInfo = useMemo(() => MOTIONS.find((m) => m.key === motion)!, [motion]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  function canvasSize(img: HTMLImageElement) {
    const chosen = RATIOS.find((r) => r.key === ratio)!;
    if (ratio !== "original") return { w: chosen.w, h: chosen.h };
    const max = 1280;
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    return {
      w: Math.max(2, Math.round(img.naturalWidth * scale / 2) * 2),
      h: Math.max(2, Math.round(img.naturalHeight * scale / 2) * 2)
    };
  }

  function drawFrame(ctx: CanvasRenderingContext2D, img: HTMLImageElement, t: number) {
    const canvas = ctx.canvas;
    const e = ease(Math.min(1, Math.max(0, t)));
    const s = strength / 100;

    let scaleMotion = 1;
    let tx = 0;
    let ty = 0;

    if (motion === "push") scaleMotion = 1 + e * (0.09 + 0.12 * s);
    if (motion === "pull") scaleMotion = 1.18 + 0.08 * s - e * (0.12 + 0.08 * s);
    if (motion === "pan-left") {
      scaleMotion = 1.12 + 0.06 * s;
      tx = (0.045 + 0.055 * s) * canvas.width * (0.5 - e);
    }
    if (motion === "pan-right") {
      scaleMotion = 1.12 + 0.06 * s;
      tx = (0.045 + 0.055 * s) * canvas.width * (e - 0.5);
    }
    if (motion === "rise") {
      scaleMotion = 1.11 + 0.06 * s;
      ty = (0.045 + 0.055 * s) * canvas.height * (0.5 - e);
    }
    if (motion === "float") {
      scaleMotion = 1.05 + e * (0.04 + 0.05 * s);
      tx = Math.sin(e * Math.PI * 2) * canvas.width * 0.008 * s;
      ty = Math.sin(e * Math.PI) * -canvas.height * 0.012 * s;
    }
    if (motion === "pulse") {
      scaleMotion = 1.035 + Math.sin(e * Math.PI * 2.5) * (0.018 + 0.025 * s) + e * 0.02;
    }

    ctx.fillStyle = "#050607";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const baseScale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
    const drawScale = baseScale * scaleMotion;
    const dw = img.naturalWidth * drawScale;
    const dh = img.naturalHeight * drawScale;

    ctx.save();
    ctx.translate(canvas.width / 2 + tx, canvas.height / 2 + ty);
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }

  function previewFrame() {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    const { w, h } = canvasSize(img);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    drawFrame(ctx, img, 0.35);
  }

  useEffect(() => {
    if (imageReady) previewFrame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratio, motion, strength, imageReady]);

  function onImage(e: ChangeEvent<HTMLInputElement>) {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a JPEG, PNG, WebP, or other browser-supported image.");
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setError("Keep the image under 30 MB for reliable phone rendering.");
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (imageRef.current?.src.startsWith("blob:")) URL.revokeObjectURL(imageRef.current.src);
      imageRef.current = img;
      setFileName(file.name);
      setImageReady(true);
      setVideoUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return "";
      });
      requestAnimationFrame(previewFrame);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError("That image could not be opened.");
    };
    img.src = url;
  }

  async function generate() {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) {
      setError("Upload a flyer or photo first.");
      return;
    }
    if (!("captureStream" in canvas) || typeof MediaRecorder === "undefined") {
      setError("This browser cannot record a canvas video. Try current Safari, Chrome, or Edge.");
      return;
    }

    const mime = supportedMime();
    if (!mime) {
      setError("This browser does not expose a supported video recorder format.");
      return;
    }

    setError("");
    setGenerating(true);
    setProgress(0);

    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl("");
    }

    const { w, h } = canvasSize(img);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      setGenerating(false);
      setError("Canvas rendering is unavailable.");
      return;
    }

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: w * h >= 900000 ? 8_000_000 : 5_000_000
    });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data.size) chunks.push(ev.data);
    };

    const done = new Promise<Blob>((resolve, reject) => {
      recorder.onerror = () => reject(new Error("Recorder failed."));
      recorder.onstop = () => resolve(new Blob(chunks, { type: mime.split(";")[0] }));
    });

    recorder.start(250);
    const start = performance.now();
    const total = duration * 1000;

    await new Promise<void>((resolve) => {
      const frame = (now: number) => {
        const elapsed = now - start;
        const t = Math.min(1, elapsed / total);
        drawFrame(ctx, img, t);
        setProgress(Math.round(t * 100));
        if (t < 1) {
          rafRef.current = requestAnimationFrame(frame);
        } else {
          drawFrame(ctx, img, 1);
          resolve();
        }
      };
      rafRef.current = requestAnimationFrame(frame);
    });

    await new Promise((r) => setTimeout(r, 120));
    recorder.stop();

    try {
      const blob = await done;
      const out = URL.createObjectURL(blob);
      setVideoType(blob.type);
      setVideoUrl(out);
      setProgress(100);
    } catch {
      setError("The browser could not finish the video file.");
    } finally {
      stream.getTracks().forEach((track) => track.stop());
      setGenerating(false);
    }
  }

  const extension = videoType.includes("mp4") ? "mp4" : "webm";
  const cleanName = (fileName.replace(/\.[^.]+$/, "") || "motion-video").replace(/[^a-z0-9-_]+/gi, "-");

  return (
    <main className="free-studio">
      <header className="free-topbar">
        <div>
          <b>CLIFF FREE MOTION STUDIO</b>
          <small>NO LOGIN • NO API KEY • NO CREDITS</small>
        </div>
        <span className="free-badge">100% BROWSER RENDERED</span>
      </header>

      <section className="free-shell">
        <div className="free-hero">
          <div>
            <p className="eyebrow">FREE FLYER + PHOTO ANIMATOR</p>
            <h1>Turn one image into a motion video.</h1>
            <p className="hero-copy">
              Upload your flyer or photo, choose a cinematic move, and export the video directly on your device.
              Your image never needs an AI credit and never has to leave your browser.
            </p>
          </div>
          <div className="privacy-card">
            <strong>$0 GENERATION</strong>
            <span>No Higgsfield, no subscription, no account.</span>
          </div>
        </div>

        <div className="free-grid">
          <section className="preview-panel">
            <div className="panel-head">
              <div>
                <b>PREVIEW</b>
                <span>{imageReady ? fileName : "Upload an image to begin"}</span>
              </div>
              {generating && <span className="rendering">RENDERING {progress}%</span>}
            </div>

            <div className={"canvas-stage " + (imageReady ? "has-image" : "")}>
              <canvas ref={canvasRef} />
              {!imageReady && (
                <label className="drop-zone">
                  <input type="file" accept="image/*" onChange={onImage} />
                  <span className="upload-plus">+</span>
                  <strong>UPLOAD FLYER OR PHOTO</strong>
                  <small>JPEG • PNG • WEBP • up to 30 MB</small>
                </label>
              )}
            </div>

            {imageReady && (
              <label className="replace-image">
                <input type="file" accept="image/*" onChange={onImage} />
                REPLACE IMAGE
              </label>
            )}

            {generating && (
              <div className="progress-track">
                <div style={{ width: progress + "%" }} />
              </div>
            )}
          </section>

          <aside className="control-panel">
            <div className="control-block">
              <label>FORMAT</label>
              <div className="chip-grid">
                {RATIOS.map((r) => (
                  <button key={r.key} className={ratio === r.key ? "active" : ""} onClick={() => setRatio(r.key)}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-block">
              <label>MOTION</label>
              <select value={motion} onChange={(e) => setMotion(e.target.value as MotionKey)}>
                {MOTIONS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
              <p>{motionInfo.note}</p>
            </div>

            <div className="control-block two-col">
              <div>
                <label>DURATION</label>
                <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                  {[5, 8, 10, 15].map((d) => <option value={d} key={d}>{d} seconds</option>)}
                </select>
              </div>
              <div>
                <label>STRENGTH</label>
                <select value={strength} onChange={(e) => setStrength(Number(e.target.value))}>
                  <option value={30}>Subtle</option>
                  <option value={55}>Medium</option>
                  <option value={80}>Strong</option>
                </select>
              </div>
            </div>

            <button className="free-generate" disabled={!imageReady || generating} onClick={() => void generate()}>
              {generating ? "RENDERING VIDEO…" : "GENERATE FREE VIDEO"}
            </button>

            <p className="credit-note">
              Rendering uses your phone or computer only. There are no generation credits to run out of.
            </p>

            {error && <div className="free-error">{error}</div>}
          </aside>
        </div>

        {videoUrl && (
          <section className="result-panel">
            <div>
              <p className="eyebrow">FINISHED</p>
              <h2>Your video is ready.</h2>
              <p>Preview it below, then save it directly to your device.</p>
            </div>
            <video src={videoUrl} controls playsInline />
            <a className="download-video" href={videoUrl} download={cleanName + "." + extension}>
              DOWNLOAD {extension.toUpperCase()}
            </a>
          </section>
        )}

        <section className="free-info">
          <div><b>PRESERVES YOUR FLYER</b><span>The whole uploaded image is animated, so your existing text stays intact.</span></div>
          <div><b>PRIVATE</b><span>The image is processed locally in your browser for this free renderer.</span></div>
          <div><b>NO CREDIT WALL</b><span>Generate again as many times as your device can handle.</span></div>
        </section>
      </section>
    </main>
  );
}
