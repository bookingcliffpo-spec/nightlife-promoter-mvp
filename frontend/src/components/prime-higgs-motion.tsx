"use client";

import {
  Activity,
  ChevronDown,
  Download,
  Film,
  Image as ImageIcon,
  Layers3,
  Loader2,
  Paperclip,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { ChangeEvent, useMemo, useRef, useState } from "react";

type Ratio = "16:9" | "9:16" | "1:1" | "4:3" | "3:2" | "21:9";
type Resolution = "480p" | "720p";
type StudioTab = "settings" | "media" | "upload";
type JobStatus = "queued" | "generating" | "done" | "error" | "cancelled";

type StudioJob = {
  id: string;
  prompt: string;
  status: JobStatus;
  progress: number;
  createdAt: number;
  outputUrl?: string;
  error?: string;
};

const LTX_SPACE_ID = "Lightricks/ltx-video-distilled";
const LTX_SPACE_ORIGIN = "https://lightricks-ltx-video-distilled.hf.space";
const WAN22_SPACE_ID = "zerogpu-aoti/wan2-2-fp8da-aoti-faster";
const WAN22_SPACE_ORIGIN = "https://zerogpu-aoti-wan2-2-fp8da-aoti-faster.hf.space";
const WAN21_SPACE_ID = "Wan-AI/Wan2.1";
const GRADIO_CDN = "https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js";
const NEGATIVE_PROMPT =
  "worst quality, low quality, inconsistent motion, blurry, jittery, distorted, warped face, face morphing, extra fingers, extra limbs, duplicate person, misspelled text, moving text, disappearing logo, plastic skin, HDR, AI sharpening, lens flare, sparks, dust, graffiti, grunge";

const ratios: Ratio[] = ["16:9", "9:16", "1:1", "4:3", "3:2", "21:9"];

const dimensions: Record<Resolution, Record<Ratio, { width: number; height: number }>> = {
  "480p": {
    "16:9": { width: 832, height: 480 },
    "9:16": { width: 480, height: 832 },
    "1:1": { width: 512, height: 512 },
    "4:3": { width: 640, height: 480 },
    "3:2": { width: 736, height: 480 },
    "21:9": { width: 1056, height: 448 },
  },
  "720p": {
    "16:9": { width: 1280, height: 704 },
    "9:16": { width: 704, height: 1280 },
    "1:1": { width: 768, height: 768 },
    "4:3": { width: 960, height: 704 },
    "3:2": { width: 1056, height: 704 },
    "21:9": { width: 1536, height: 672 },
  },
};

function normalizeSpaceUrl(value: string, origin = "") {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/") && origin) return origin + value;
  return value;
}

function extractVideoUrl(data: unknown, origin = ""): string {
  const seen = new Set<unknown>();

  const walk = (node: unknown): string => {
    if (!node || seen.has(node)) return "";
    if (typeof node === "string") {
      if (/^https?:\/\//i.test(node)) return node;
      if (/\.(mp4|webm|mov)(\?|$)/i.test(node)) return normalizeSpaceUrl(node, origin);
      return "";
    }
    if (typeof node !== "object") return "";
    seen.add(node);

    if (Array.isArray(node)) {
      for (const item of node) {
        const found = walk(item);
        if (found) return found;
      }
      return "";
    }

    const record = node as Record<string, unknown>;
    if (typeof record.url === "string") return normalizeSpaceUrl(record.url, origin);
    if (typeof record.path === "string" && /\.(mp4|webm|mov)(\?|$)/i.test(record.path)) {
      return normalizeSpaceUrl(record.path, origin);
    }

    for (const key of ["video", "value", "data", "output"]) {
      if (record[key]) {
        const found = walk(record[key]);
        if (found) return found;
      }
    }

    for (const value of Object.values(record)) {
      const found = walk(value);
      if (found) return found;
    }
    return "";
  };

  return walk(data);
}

async function dynamicGradio() {
  const importer = new Function("url", "return import(url)") as (url: string) => Promise<any>;
  return importer(GRADIO_CDN);
}

async function browserFriendlyImage(file: File): Promise<File | Blob> {
  const type = (file.type || "").toLowerCase();
  if (["image/jpeg", "image/png", "image/webp"].includes(type)) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("This image format could not be opened. Try JPG, PNG, or WebP."));
      el.src = objectUrl;
    });

    const maxSide = 1800;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare the uploaded image.");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Could not convert the uploaded image."))),
        "image/jpeg",
        0.95
      );
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function PrimeHiggsMotion() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submissionRef = useRef<any>(null);
  const cancelledRef = useRef(false);

  const [studioTab, setStudioTab] = useState<StudioTab>("settings");
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState<Ratio>("16:9");
  const [resolution, setResolution] = useState<Resolution>("480p");
  const [duration, setDuration] = useState(4);
  const [audio, setAudio] = useState(true);
  const [outputFormat, setOutputFormat] = useState<"MP4" | "MOV">("MP4");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [jobs, setJobs] = useState<StudioJob[]>([]);
  const [error, setError] = useState("");

  const activeJob = jobs.find((job) => job.status === "queued" || job.status === "generating");
  const busy = Boolean(activeJob);
  const subtitle = file ? "Image → Video" : "Text → Video";

  const currentMediaLabel = useMemo(() => file?.name || "No media attached", [file]);

  const updateJob = (id: string, patch: Partial<StudioJob>) => {
    setJobs((current) => current.map((job) => (job.id === id ? { ...job, ...patch } : job)));
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0];
    if (!next) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
    setError("");
    event.target.value = "";
  };

  const removeMedia = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl("");
  };

  const cancelActiveJob = () => {
    cancelledRef.current = true;
    try {
      submissionRef.current?.cancel?.();
    } catch {}
    submissionRef.current = null;
    if (activeJob) updateJob(activeJob.id, { status: "cancelled", progress: 0, error: "Cancelled" });
  };

  const generate = async () => {
    if (!prompt.trim()) {
      setError("Describe your shot first.");
      return;
    }

    const jobId = crypto.randomUUID();
    const job: StudioJob = {
      id: jobId,
      prompt: prompt.trim(),
      status: "queued",
      progress: 2,
      createdAt: Date.now(),
    };

    setJobs((current) => [job, ...current].slice(0, 8));
    setError("");
    cancelledRef.current = false;

    try {
      const { Client, handle_file } = await dynamicGradio();
      const prepared = file ? await browserFriendlyImage(file) : null;
      const dims = dimensions[resolution][ratio];

      const runLtx = async () => {
        updateJob(jobId, { status: "queued", progress: 7 });
        const client = await Client.connect(LTX_SPACE_ID, { events: ["status", "data"] });
        const submission = client.submit("/image_to_video", {
          prompt: prompt.trim(),
          negative_prompt: NEGATIVE_PROMPT,
          input_image_filepath: prepared ? handle_file(prepared) : null,
          input_video_filepath: null,
          height_ui: dims.height,
          width_ui: dims.width,
          mode: prepared ? "image-to-video" : "text-to-video",
          duration_ui: Math.min(8.5, Number(duration)),
          ui_frames_to_use: 9,
          seed_ui: 42,
          randomize_seed: true,
          ui_guidance_scale: 1,
          improve_texture_flag: true,
        });

        submissionRef.current = submission;
        let found = "";

        for await (const msg of submission) {
          if (cancelledRef.current) throw new Error("Generation cancelled.");

          if (msg.type === "status") {
            const stage = String(msg.stage || "");
            if (stage === "pending") {
              updateJob(jobId, { status: "queued", progress: 12 });
            } else if (stage === "generating") {
              const entries = Array.isArray(msg.progress_data) ? msg.progress_data : [];
              const raw = entries.length ? Number(entries[entries.length - 1]?.progress) : NaN;
              const next = Number.isFinite(raw)
                ? 20 + Math.round(Math.max(0, Math.min(1, raw)) * 65)
                : 45;
              updateJob(jobId, { status: "generating", progress: Math.min(90, next) });
            } else if (stage === "error") {
              throw new Error(String(msg.message || "LTX generation failed."));
            }
          }

          if (msg.type === "data") {
            const url = extractVideoUrl(msg.data, LTX_SPACE_ORIGIN);
            if (url) found = url;
          }
        }

        if (!found) throw new Error("LTX finished without returning a video.");
        return found;
      };

      const runWan22 = async () => {
        if (!prepared) throw new Error("Wan 2.2 fallback needs an uploaded image.");

        updateJob(jobId, { status: "queued", progress: 10 });
        const client = await Client.connect(WAN22_SPACE_ID, { events: ["status", "data"] });
        const submission = client.submit("/generate_video", {
          input_image: handle_file(prepared),
          prompt: prompt.trim(),
          steps: 4,
          negative_prompt: NEGATIVE_PROMPT,
          duration_seconds: Math.min(5, Number(duration)),
          guidance_scale: 1,
          guidance_scale_2: 1,
          seed: 42,
          randomize_seed: true,
        });

        submissionRef.current = submission;
        let found = "";

        for await (const msg of submission) {
          if (cancelledRef.current) throw new Error("Generation cancelled.");

          if (msg.type === "status") {
            const stage = String(msg.stage || "");
            if (stage === "pending") {
              updateJob(jobId, { status: "queued", progress: 15 });
            } else if (stage === "generating") {
              const entries = Array.isArray(msg.progress_data) ? msg.progress_data : [];
              const raw = entries.length ? Number(entries[entries.length - 1]?.progress) : NaN;
              const next = Number.isFinite(raw)
                ? 25 + Math.round(Math.max(0, Math.min(1, raw)) * 65)
                : 52;
              updateJob(jobId, { status: "generating", progress: Math.min(92, next) });
            } else if (stage === "error") {
              throw new Error(String(msg.message || "Wan 2.2 generation failed."));
            }
          }

          if (msg.type === "data") {
            const url = extractVideoUrl(msg.data, WAN22_SPACE_ORIGIN);
            if (url) found = url;
          }
        }

        if (!found) throw new Error("Wan 2.2 finished without returning a video.");
        return found;
      };

      const runWan21 = async () => {
        if (!prepared) throw new Error("Wan public fallback needs an uploaded image.");

        updateJob(jobId, { status: "queued", progress: 12 });
        const client = await Client.connect(WAN21_SPACE_ID);
        await client.predict("/i2v_generation_async", {
          prompt: prompt.trim(),
          image: handle_file(prepared),
          watermark_wan: false,
          seed: -1,
        });

        for (let attempt = 0; attempt < 60; attempt++) {
          if (cancelledRef.current) throw new Error("Generation cancelled.");
          await new Promise((resolve) => setTimeout(resolve, 4000));

          const poll = await client.predict("/status_refresh_1", {});
          const url = extractVideoUrl(poll.data);
          if (url) return url;

          updateJob(jobId, { status: "generating", progress: Math.min(95, 24 + attempt) });
        }

        throw new Error("The public Wan service is still busy.");
      };

      let output = "";
      const failures: string[] = [];

      try {
        output = await runLtx();
      } catch (err) {
        failures.push(err instanceof Error ? err.message : String(err));
      }

      if (!output && prepared && !cancelledRef.current) {
        try {
          output = await runWan22();
        } catch (err) {
          failures.push(err instanceof Error ? err.message : String(err));
        }
      }

      if (!output && prepared && !cancelledRef.current) {
        try {
          output = await runWan21();
        } catch (err) {
          failures.push(err instanceof Error ? err.message : String(err));
        }
      }

      submissionRef.current = null;

      if (cancelledRef.current) {
        updateJob(jobId, { status: "cancelled", progress: 0, error: "Cancelled" });
        return;
      }

      if (!output) {
        throw new Error(
          failures[failures.length - 1] ||
            (prepared
              ? "No free engine returned a video."
              : "Text-only generation is temporarily unavailable. Attach an image and try again.")
        );
      }

      updateJob(jobId, { status: "done", progress: 100, outputUrl: output });
    } catch (err) {
      submissionRef.current = null;
      const message = err instanceof Error ? err.message : String(err);
      updateJob(jobId, { status: "error", progress: 0, error: message });
      setError(message);
    }
  };

  return (
    <main className="prime-higgs-page">
      <div className="prime-grid-bg" />

      <header className="prime-nav">
        <button className="prime-logo" aria-label="Prime Higgs Motion">
          <Sparkles size={19} strokeWidth={2.4} />
        </button>
        <nav>
          <button className="active"><Activity size={18} /> Jobs</button>
          <button><Film size={18} /> Video</button>
          <button><ImageIcon size={18} /> Image</button>
          <button><Layers3 size={18} /> Assets</button>
        </nav>
      </header>

      <section className="prime-shell">
        <div className="prime-model-card">
          <div className="prime-model-icon"><Sparkles size={20} /></div>
          <div className="prime-model-copy">
            <b>Seedance 2.5</b>
            <span>{subtitle}</span>
          </div>
          <div className="prime-version">2.5</div>
          <ChevronDown size={20} className="prime-chevron" />
        </div>

        <div className="prime-prompt-card">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe your shot..."
            maxLength={5000}
          />
          <span className="prime-shortcut">⌘/Ctrl + Enter</span>
          <span className="prime-char-count">{prompt.length}</span>
        </div>

        <div className="prime-toolbar">
          <button className={studioTab === "settings" ? "active" : ""} onClick={() => setStudioTab("settings")}>
            <SlidersHorizontal size={17} /> Settings
          </button>
          <button className={studioTab === "media" ? "active" : ""} onClick={() => setStudioTab("media")}>
            <Paperclip size={18} /> Media
          </button>
          <button className={studioTab === "upload" ? "active" : ""} onClick={() => setStudioTab("upload")}>
            <Upload size={18} /> Upload
          </button>
        </div>

        <section className="prime-settings-card">
          {studioTab === "settings" && (
            <>
              <div className="prime-setting-block">
                <label>ASPECT RATIO</label>
                <div className="prime-chip-row">
                  {ratios.map((item) => (
                    <button key={item} className={ratio === item ? "active" : ""} onClick={() => setRatio(item)}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="prime-setting-block">
                <label>RESOLUTION</label>
                <div className="prime-chip-row">
                  {(["480p", "720p"] as Resolution[]).map((item) => (
                    <button key={item} className={resolution === item ? "active" : ""} onClick={() => setResolution(item)}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="prime-setting-block">
                <div className="prime-setting-title-row">
                  <label>DURATION</label>
                  <b>{duration}s</b>
                </div>
                <input
                  className="prime-duration"
                  type="range"
                  min={4}
                  max={30}
                  value={duration}
                  onChange={(event) => setDuration(Number(event.target.value))}
                  style={{ "--progress": (((duration - 4) / 26) * 100) + "%" } as React.CSSProperties}
                />
                <div className="prime-range-labels"><span>4s</span><span>30s</span></div>
              </div>

              <div className="prime-inline-setting">
                <label>AUDIO</label>
                <button className={audio ? "prime-toggle on" : "prime-toggle"} onClick={() => setAudio((value) => !value)}>
                  <span>{audio ? <Volume2 size={14} /> : <VolumeX size={14} />}</span>
                </button>
              </div>

              <div className="prime-setting-block prime-format-block">
                <label>OUTPUT FORMAT</label>
                <div className="prime-chip-row">
                  {(["MP4", "MOV"] as const).map((item) => (
                    <button key={item} className={outputFormat === item ? "active" : ""} onClick={() => setOutputFormat(item)}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {studioTab === "media" && (
            <div className="prime-media-panel">
              <div className="prime-media-header">
                <div><b>MEDIA</b><span>{currentMediaLabel}</span></div>
                {file && <button onClick={removeMedia}><X size={15} /> Remove</button>}
              </div>

              {!file ? (
                <button className="prime-media-empty" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip size={24} />
                  <b>Attach a reference image</b>
                  <span>Use an image for image-to-video generation.</span>
                </button>
              ) : (
                <div className="prime-media-preview">
                  <img src={previewUrl} alt="Reference" />
                  <div>
                    <b>{file.name}</b>
                    <span>{Math.max(0.1, file.size / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {studioTab === "upload" && (
            <button className="prime-upload-zone" onClick={() => fileInputRef.current?.click()}>
              <Upload size={27} />
              <b>{file ? "Replace uploaded media" : "Upload media"}</b>
              <span>JPG, PNG, WEBP, HEIC</span>
            </button>
          )}

          <input ref={fileInputRef} hidden type="file" accept="image/*" onChange={onFileChange} />
        </section>

        <div className="prime-generate-row">
          <button className="prime-generate" disabled={busy} onClick={() => void generate()}>
            {busy ? <Loader2 size={21} className="spin" /> : <Sparkles size={20} />}
            {busy ? "Generating" : "Generate"}
          </button>
          <div className="prime-cost-chip"><Layers3 size={20} /> 4×</div>
        </div>

        <div className="prime-server-status">
          {busy ? "Generation running — free engine fallback enabled." : "Free multi-engine backend ready."}
          {audio ? " Audio instructions are included when supported." : ""}
        </div>

        {error && <div className="prime-error">{error}</div>}

        <section className="prime-jobs-card">
          <div className="prime-jobs-header">
            <div><Activity size={18} /><b>Active Jobs</b></div>
            <span>{jobs.length}</span>
          </div>

          {jobs.length === 0 ? (
            <div className="prime-empty-jobs">
              <span>No jobs yet.</span>
              <small>Your generations will appear here.</small>
            </div>
          ) : (
            <div className="prime-job-list">
              {jobs.map((job) => (
                <article key={job.id} className="prime-job">
                  <div className="prime-job-top">
                    <div>
                      <b>{job.prompt.slice(0, 56) + (job.prompt.length > 56 ? "…" : "")}</b>
                      <span>{new Date(job.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                    </div>
                    <span className={"prime-job-status " + job.status}>{job.status}</span>
                  </div>

                  {(job.status === "queued" || job.status === "generating") && (
                    <div className="prime-job-progress"><div style={{ width: job.progress + "%" }} /></div>
                  )}

                  {job.status === "done" && job.outputUrl && (
                    <div className="prime-job-result">
                      <video src={job.outputUrl} controls playsInline />
                      <a href={job.outputUrl} target="_blank" rel="noreferrer">
                        <Download size={15} /> Open video
                      </a>
                    </div>
                  )}

                  {job.status === "error" && job.error && <p className="prime-job-error">{job.error}</p>}
                </article>
              ))}
            </div>
          )}
        </section>

        {activeJob && <button className="prime-cancel" onClick={cancelActiveJob}>Cancel active job</button>}
      </section>
    </main>
  );
}
