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
  engine?: string;
  error?: string;
};

const VIDEO_PROXY_URL =
  "https://ntmunryoutmjqdxgmzpw.supabase.co/functions/v1/video-generate-proxy";

const ratios: Ratio[] = ["16:9", "9:16", "1:1", "4:3", "3:2", "21:9"];

async function imageToDataUrl(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () =>
        reject(new Error("Could not prepare this image. Try JPG, PNG, WebP, or a different HEIC photo."));
      element.src = objectUrl;
    });

    const maxSide = 1400;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare the image.");

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function PrimeHiggsMotion() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

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
    setJobs((current) =>
      current.map((job) => (job.id === id ? { ...job, ...patch } : job)),
    );
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
    abortRef.current?.abort();
    abortRef.current = null;

    if (activeJob) {
      updateJob(activeJob.id, {
        status: "cancelled",
        progress: 0,
        error: "Cancelled",
      });
    }
  };

  const generate = async () => {
    if (!prompt.trim()) {
      setError("Describe your shot first.");
      return;
    }

    if (!file) {
      setError("Upload a reference image first. The free backend currently supports image-to-video.");
      setStudioTab("upload");
      return;
    }

    const jobId = crypto.randomUUID();
    const newJob: StudioJob = {
      id: jobId,
      prompt: prompt.trim(),
      status: "queued",
      progress: 3,
      createdAt: Date.now(),
    };

    setJobs((current) => [newJob, ...current].slice(0, 8));
    setError("");

    const controller = new AbortController();
    abortRef.current = controller;

    let progressTimer: ReturnType<typeof setInterval> | null = null;

    try {
      updateJob(jobId, { status: "generating", progress: 8 });
      const imageDataUrl = await imageToDataUrl(file);

      let fakeProgress = 12;
      progressTimer = setInterval(() => {
        fakeProgress = Math.min(92, fakeProgress + (fakeProgress < 55 ? 3 : 1));
        updateJob(jobId, { status: "generating", progress: fakeProgress });
      }, 3000);

      const response = await fetch(VIDEO_PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: prompt.trim() + (audio ? "\nAudio: include matching cinematic ambience when the selected engine supports audio." : ""),
          image_data_url: imageDataUrl,
          mime_type: "image/jpeg",
          aspect_ratio: ratio,
          resolution,
          duration_seconds: Math.min(5, duration),
          output_format: outputFormat.toLowerCase(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.output_url) {
        throw new Error(
          data?.error ||
            "The free video engines are busy right now. Try again shortly.",
        );
      }

      updateJob(jobId, {
        status: "done",
        progress: 100,
        outputUrl: String(data.output_url),
        engine: String(data.engine || "Free AI"),
      });
    } catch (err) {
      if (controller.signal.aborted) {
        updateJob(jobId, { status: "cancelled", progress: 0, error: "Cancelled" });
      } else {
        const message = err instanceof Error ? err.message : String(err);
        updateJob(jobId, { status: "error", progress: 0, error: message });
        setError(message);
      }
    } finally {
      if (progressTimer) clearInterval(progressTimer);
      if (abortRef.current === controller) abortRef.current = null;
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
          <button
            className={studioTab === "settings" ? "active" : ""}
            onClick={() => setStudioTab("settings")}
          >
            <SlidersHorizontal size={17} /> Settings
          </button>
          <button
            className={studioTab === "media" ? "active" : ""}
            onClick={() => setStudioTab("media")}
          >
            <Paperclip size={18} /> Media
          </button>
          <button
            className={studioTab === "upload" ? "active" : ""}
            onClick={() => setStudioTab("upload")}
          >
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
                    <button
                      key={item}
                      className={ratio === item ? "active" : ""}
                      onClick={() => setRatio(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="prime-setting-block">
                <label>RESOLUTION</label>
                <div className="prime-chip-row">
                  {(["480p", "720p"] as Resolution[]).map((item) => (
                    <button
                      key={item}
                      className={resolution === item ? "active" : ""}
                      onClick={() => setResolution(item)}
                    >
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
                <button
                  className={audio ? "prime-toggle on" : "prime-toggle"}
                  onClick={() => setAudio((value) => !value)}
                >
                  <span>{audio ? <Volume2 size={14} /> : <VolumeX size={14} />}</span>
                </button>
              </div>

              <div className="prime-setting-block prime-format-block">
                <label>OUTPUT FORMAT</label>
                <div className="prime-chip-row">
                  {(["MP4", "MOV"] as const).map((item) => (
                    <button
                      key={item}
                      className={outputFormat === item ? "active" : ""}
                      onClick={() => setOutputFormat(item)}
                    >
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

          <input
            ref={fileInputRef}
            hidden
            type="file"
            accept="image/*"
            onChange={onFileChange}
          />
        </section>

        <div className="prime-generate-row">
          <button className="prime-generate" disabled={busy} onClick={() => void generate()}>
            {busy ? <Loader2 size={21} className="spin" /> : <Sparkles size={20} />}
            {busy ? "Generating" : "Generate"}
          </button>
          <div className="prime-cost-chip"><Layers3 size={20} /> 4×</div>
        </div>

        <div className="prime-server-status">
          {busy
            ? "Server proxy is generating — Safari stays connected to this site only."
            : "Server proxy ready — no direct Hugging Face browser connection."}
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
                    <div className="prime-job-progress">
                      <div style={{ width: job.progress + "%" }} />
                    </div>
                  )}

                  {job.status === "done" && job.outputUrl && (
                    <div className="prime-job-result">
                      <video src={job.outputUrl} controls playsInline />
                      <div>
                        <b>{job.engine || "Free AI"}</b>
                        <a href={job.outputUrl} target="_blank" rel="noreferrer">
                          <Download size={15} /> Open video
                        </a>
                      </div>
                    </div>
                  )}

                  {job.status === "error" && job.error && (
                    <p className="prime-job-error">{job.error}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {activeJob && (
          <button className="prime-cancel" onClick={cancelActiveJob}>
            Cancel active job
          </button>
        )}
      </section>
    </main>
  );
}
