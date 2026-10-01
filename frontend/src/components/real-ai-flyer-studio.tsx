"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ntmunryoutmjqdxgmzpw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_6CJ2zR2iEKoVR3Lsd_eECA_iIl7vd6P";
const API_URL = SUPABASE_URL + "/functions/v1/flyer-video-api";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

type UploadItem = {
  id: string;
  file: File;
  preview: string;
};

type JobStatus = "idle" | "uploading" | "queued" | "processing" | "completed" | "failed" | "cancelled";

type ActiveJob = {
  jobId: string;
  accessToken: string;
};

type StatusPayload = {
  id: string;
  status: JobStatus;
  progress: number;
  error?: string | null;
  output_url?: string | null;
};

const DEFAULT_PROMPT = `Use the uploaded flyer as the exact first frame/reference. Create a cinematic luxury nightlife promo video for Instagram Reels with smooth controlled motion.

Preserve the person's exact recognizable identity, clothing, jewelry, pose, hands, skin tone, facial structure, hairline, eyes, nose, lips, beard, and natural skin texture. Keep all flyer text, logos, typography, spelling, date, venue information, hierarchy, and layout unchanged and readable.

Add realistic cinematic depth, subtle parallax, atmospheric lighting, natural environmental motion, and object-specific movement described below. Do not morph the face or body, do not move text out of position, and do not invent extra people, limbs, hands, words, logos, or props.

Animate this flyer cinematically:`;

const STATUS_COPY: Record<string, string> = {
  uploading: "Uploading your references…",
  queued: "Waiting for the free AI engine…",
  processing: "Generating your cinematic video…",
  completed: "Your video is ready.",
  failed: "Generation failed.",
  cancelled: "Generation cancelled.",
};

function cleanMime(file: File) {
  const type = (file.type || "").toLowerCase();
  if (["image/jpeg","image/png","image/webp","image/heic","image/heif"].includes(type)) return type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  if (ext === "heif") return "image/heif";
  return "image/jpeg";
}

async function callApi<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || "Request failed.");
  return data as T;
}

export function RealAiFlyerStudio() {
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [images, setImages] = useState<UploadItem[]>([]);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [aspect, setAspect] = useState("9:16");
  const [duration, setDuration] = useState(8);
  const [engineOnline, setEngineOnline] = useState<boolean | null>(null);
  const [status, setStatus] = useState<JobStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [outputUrl, setOutputUrl] = useState("");
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);

  const busy = ["uploading","queued","processing"].includes(status);

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  const checkEngine = useCallback(async () => {
    try {
      const data = await callApi<{ online: boolean }>("engine_status");
      setEngineOnline(Boolean(data.online));
    } catch {
      setEngineOnline(false);
    }
  }, []);

  const pollJob = useCallback(async (job: ActiveJob) => {
    try {
      const data = await callApi<StatusPayload>("job_status", {
        job_id: job.jobId,
        access_token: job.accessToken,
      });
      setStatus(data.status);
      setProgress(Math.max(0, Math.min(100, Number(data.progress || 0))));
      setMessage(STATUS_COPY[data.status] || "");
      if (data.status === "completed" && data.output_url) {
        setOutputUrl(data.output_url);
        localStorage.removeItem("cliff-ai-active-job");
        stopPolling();
      } else if (["failed","cancelled"].includes(data.status)) {
        if (data.error) setMessage(data.error);
        localStorage.removeItem("cliff-ai-active-job");
        stopPolling();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not check generation status.");
    }
  }, [stopPolling]);

  useEffect(() => {
    void checkEngine();
    const engineTimer = setInterval(() => void checkEngine(), 10000);

    const saved = localStorage.getItem("cliff-ai-active-job");
    if (saved) {
      try {
        const job = JSON.parse(saved) as ActiveJob;
        if (job.jobId && job.accessToken) {
          setActiveJob(job);
          setStatus("queued");
          setMessage("Restoring your generation…");
          void pollJob(job);
          pollRef.current = setInterval(() => void pollJob(job), 3000);
        }
      } catch {
        localStorage.removeItem("cliff-ai-active-job");
      }
    }

    return () => {
      clearInterval(engineTimer);
      stopPolling();
    };
  }, [checkEngine, pollJob, stopPolling]);

  useEffect(() => {
    return () => images.forEach((item) => URL.revokeObjectURL(item.preview));
  }, [images]);

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || [])
      .filter((file) => file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name))
      .slice(0, Math.max(0, 8 - images.length));

    if (!selected.length) return;

    const next = selected.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((current) => [...current, ...next].slice(0, 8));
    setMessage("");
    event.target.value = "";
  };

  const removeImage = (id: string) => {
    setImages((current) => {
      const target = current.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return current.filter((item) => item.id !== id);
    });
  };

  const reset = () => {
    stopPolling();
    images.forEach((item) => URL.revokeObjectURL(item.preview));
    setImages([]);
    setPrompt(DEFAULT_PROMPT);
    setStatus("idle");
    setProgress(0);
    setMessage("");
    setOutputUrl("");
    setActiveJob(null);
    localStorage.removeItem("cliff-ai-active-job");
  };

  const generate = async () => {
    if (!images.length) {
      setMessage("Upload at least one image.");
      return;
    }
    if (!prompt.trim()) {
      setMessage("Type the video prompt you want.");
      return;
    }

    stopPolling();
    setOutputUrl("");
    setStatus("uploading");
    setProgress(2);
    setMessage("Preparing your AI generation…");

    try {
      const create = await callApi<{
        job_id: string;
        access_token: string;
        uploads: Array<{ index: number; path: string; token: string }>;
      }>("create_job", {
        prompt: prompt.trim(),
        aspect_ratio: aspect,
        duration_seconds: duration,
        files: images.map((item) => ({
          file_name: item.file.name,
          mime_type: cleanMime(item.file),
        })),
      });

      const job = { jobId: create.job_id, accessToken: create.access_token };
      setActiveJob(job);
      localStorage.setItem("cliff-ai-active-job", JSON.stringify(job));

      for (const upload of create.uploads) {
        const item = images[upload.index];
        if (!item) throw new Error("Missing upload reference.");
        setMessage(`Uploading reference ${upload.index + 1} of ${create.uploads.length}…`);
        setProgress(4 + Math.round(((upload.index + 1) / create.uploads.length) * 16));

        const { error } = await supabase.storage
          .from("flyer-video-inputs")
          .uploadToSignedUrl(upload.path, upload.token, item.file, {
            contentType: cleanMime(item.file),
          });
        if (error) throw error;
      }

      await callApi("queue_job", {
        job_id: job.jobId,
        access_token: job.accessToken,
      });

      setStatus("queued");
      setProgress(20);
      setMessage(engineOnline === false
        ? "Uploaded. Waiting for the free AI engine to come online…"
        : "Uploaded. Your AI video is queued…");

      void pollJob(job);
      pollRef.current = setInterval(() => void pollJob(job), 3000);
    } catch (error) {
      setStatus("failed");
      setProgress(0);
      setMessage(error instanceof Error ? error.message : "Could not start generation.");
    }
  };

  const cancel = async () => {
    if (!activeJob) return;
    try {
      await callApi("cancel_job", {
        job_id: activeJob.jobId,
        access_token: activeJob.accessToken,
      });
      setStatus("cancelled");
      setMessage("Generation cancelled.");
      setProgress(0);
      localStorage.removeItem("cliff-ai-active-job");
      stopPolling();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not cancel generation.");
    }
  };

  const engineLabel = engineOnline === null
    ? "CHECKING AI ENGINE"
    : engineOnline
      ? "AI ENGINE ONLINE"
      : "AI ENGINE OFFLINE";

  const totalSize = useMemo(
    () => images.reduce((sum, item) => sum + item.file.size, 0),
    [images],
  );

  return (
    <main className="real-ai-page">
      <header className="real-ai-topbar">
        <div>
          <b>CLIFF AI VIDEO</b>
          <span>FLYER → CINEMATIC VIDEO</span>
        </div>
        <div className={"engine-pill " + (engineOnline ? "online" : "offline")}>
          <i />
          {engineLabel}
        </div>
      </header>

      <section className="real-ai-shell">
        <div className="real-ai-heading">
          <p>FREE LOCAL AI • NO HIGGSFIELD CREDITS</p>
          <h1>Upload. Prompt. Generate.</h1>
          <span>
            Upload your flyer and reference images, describe exactly what should move,
            and generate a real AI video.
          </span>
        </div>

        <section className="real-ai-grid">
          <div className="real-ai-card creator-card">
            <div className="creator-section">
              <div className="creator-label">
                <div><strong>1</strong><b>UPLOAD IMAGES</b></div>
                <span>{images.length}/8</span>
              </div>

              {images.length === 0 ? (
                <button className="reference-drop" onClick={() => inputRef.current?.click()}>
                  <span className="upload-icon">+</span>
                  <b>ADD FLYER / REFERENCE IMAGES</b>
                  <small>JPEG • PNG • WEBP • HEIC</small>
                </button>
              ) : (
                <>
                  <div className="reference-grid">
                    {images.map((item, index) => (
                      <div className="reference-card" key={item.id}>
                        <img src={item.preview} alt={index === 0 ? "First frame" : "Reference"} />
                        <span>{index === 0 ? "FIRST FRAME" : `REF ${index + 1}`}</span>
                        <button onClick={() => removeImage(item.id)} aria-label="Remove image">×</button>
                      </div>
                    ))}
                    {images.length < 8 && (
                      <button className="reference-add" onClick={() => inputRef.current?.click()}>
                        <span>+</span>
                        <small>ADD</small>
                      </button>
                    )}
                  </div>
                  <div className="reference-meta">
                    <span>The first image is the exact first-frame reference.</span>
                    <span>{(totalSize / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                </>
              )}

              <input
                ref={inputRef}
                className="hidden-file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                multiple
                onChange={addFiles}
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
                placeholder="Describe exactly what should move, stay locked, glow, pulse, crawl, float, change, or remain unchanged."
              />
              <div className="prompt-help">
                Your prompt goes directly to the local WanGP LTX-2.5 generation engine.
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
                    {[5,8,10,12,15].map((seconds) => (
                      <option key={seconds} value={seconds}>{seconds} SEC</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="generate-zone">
              <button
                className="real-generate-button"
                disabled={busy || !images.length || !prompt.trim()}
                onClick={() => void generate()}
              >
                {busy ? "GENERATING…" : "GENERATE AI VIDEO"}
              </button>
              {busy && (
                <button className="cancel-generation" onClick={() => void cancel()}>
                  CANCEL
                </button>
              )}
              <p>No account. No Higgsfield key. Generation uses your connected free local AI engine.</p>
            </div>

            {(message || status !== "idle") && (
              <div className={"generation-status " + status}>
                <div className="status-row">
                  <b>{STATUS_COPY[status] || "STATUS"}</b>
                  <span>{progress}%</span>
                </div>
                <div className="status-track">
                  <div style={{ width: progress + "%" }} />
                </div>
                {message && <p>{message}</p>}
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
              ) : images[0] ? (
                <div className="waiting-preview">
                  <img src={images[0].preview} alt="First frame preview" />
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
                <div><b>FIRST FRAME LOCK</b><span>Image 1 starts the generation.</span></div>
                <div><b>REFERENCE GUIDANCE</b><span>Extra images guide identity and details.</span></div>
                <div><b>PROMPT DRIVEN</b><span>Describe specific camera, object, light and atmosphere motion.</span></div>
              </div>
            )}
          </aside>
        </section>

        <footer className="real-ai-footer">
          <span>REAL AI BACKEND: WANGP + LTX-2.5</span>
          <button onClick={reset}>RESET STUDIO</button>
        </footer>
      </section>
    </main>
  );
}
