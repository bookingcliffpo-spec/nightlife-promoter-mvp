import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access, chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 300;

const execFileAsync = promisify(execFile);

const SUPABASE_URL = "https://ntmunryoutmjqdxgmzpw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_6CJ2zR2iEKoVR3Lsd_eECA_iIl7vd6P";
const SIGNER_URL = SUPABASE_URL + "/functions/v1/video-export-signer";

type Ratio = "1:1" | "3:4" | "9:16";
type Quality = "1080p" | "4K" | "8K";

const DIMENSIONS: Record<Quality, Record<Ratio, { width: number; height: number }>> = {
  "1080p": {
    "1:1": { width: 1080, height: 1080 },
    "3:4": { width: 1080, height: 1440 },
    "9:16": { width: 1080, height: 1920 },
  },
  "4K": {
    "1:1": { width: 2160, height: 2160 },
    "3:4": { width: 2160, height: 2880 },
    "9:16": { width: 2160, height: 3840 },
  },
  "8K": {
    "1:1": { width: 4320, height: 4320 },
    "3:4": { width: 4320, height: 5760 },
    "9:16": { width: 4320, height: 7680 },
  },
};

async function resolveFfmpegPath() {
  const candidates = [
    join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg"),
    join(process.cwd(), ".next", "server", "app", "api", "upscale-video", "ffmpeg"),
  ];

  for (const candidate of candidates) {
    try {
      await chmod(candidate, 0o755).catch(() => undefined);
      await access(candidate, fsConstants.X_OK);
      return candidate;
    } catch {
      // Try the next traced path.
    }
  }

  throw new Error(
    "FFmpeg binary is missing from the Vercel function bundle. Checked: " +
      candidates.join(", "),
  );
}

function isAllowedSource(url: URL) {
  const host = url.hostname.toLowerCase();
  return (
    host.endsWith(".hf.space") ||
    host.endsWith(".huggingface.co") ||
    host === "huggingface.co" ||
    host.endsWith(".hf.co") ||
    host.endsWith(".gradio.live") ||
    host.endsWith(".supabase.co")
  );
}

export async function POST(request: NextRequest) {
  let workDir = "";

  try {
    const body = await request.json();
    const sourceUrl = String(body.source_url || "");
    const ratio = String(body.aspect_ratio || "3:4") as Ratio;
    const quality = String(body.quality || "1080p") as Quality;

    if (!["1:1", "3:4", "9:16"].includes(ratio)) {
      return NextResponse.json({ error: "Unsupported aspect ratio." }, { status: 400 });
    }
    if (!["1080p", "4K", "8K"].includes(quality)) {
      return NextResponse.json({ error: "Unsupported output quality." }, { status: 400 });
    }

    const parsed = new URL(sourceUrl);
    if (parsed.protocol !== "https:" || !isAllowedSource(parsed)) {
      return NextResponse.json({ error: "Unsupported source URL." }, { status: 400 });
    }
    const ffmpegPath = await resolveFfmpegPath();

    const source = await fetch(parsed, { cache: "no-store" });
    if (!source.ok) {
      throw new Error("Could not download the generated video.");
    }

    const declaredLength = Number(source.headers.get("content-length") || 0);
    if (declaredLength > 180 * 1024 * 1024) {
      throw new Error("Generated video is too large to process.");
    }

    const inputBuffer = Buffer.from(await source.arrayBuffer());
    if (inputBuffer.byteLength > 180 * 1024 * 1024) {
      throw new Error("Generated video is too large to process.");
    }

    workDir = await mkdtemp(join(tmpdir(), "cliff-video-"));
    const inputPath = join(workDir, "input.mp4");
    const outputPath = join(workDir, "output.mp4");
    await writeFile(inputPath, inputBuffer);

    const { width, height } = DIMENSIONS[quality][ratio];
    const preset = quality === "8K" ? "ultrafast" : quality === "4K" ? "veryfast" : "faster";
    const crf = quality === "8K" ? "27" : quality === "4K" ? "23" : "19";

    const filter =
      `scale=${width}:${height}:force_original_aspect_ratio=increase:flags=lanczos,` +
      `crop=${width}:${height},setsar=1`;

    await execFileAsync(
      ffmpegPath,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        inputPath,
        "-vf",
        filter,
        "-c:v",
        "libx264",
        "-preset",
        preset,
        "-crf",
        crf,
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-y",
        outputPath,
      ],
      {
        timeout: quality === "8K" ? 280_000 : 180_000,
        maxBuffer: 8 * 1024 * 1024,
      },
    );

    const outputBuffer = await readFile(outputPath);
    const id = randomUUID();

    const signerResponse = await fetch(SIGNER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const signer = await signerResponse.json();

    if (!signerResponse.ok || !signer?.token || !signer?.path || !signer?.public_url) {
      throw new Error(signer?.error || "Could not prepare export upload.");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: uploadError } = await supabase.storage
      .from("video-exports")
      .uploadToSignedUrl(
        String(signer.path),
        String(signer.token),
        new Blob([outputBuffer], { type: "video/mp4" }),
        { contentType: "video/mp4" },
      );

    if (uploadError) throw uploadError;

    return NextResponse.json({
      ok: true,
      output_url: String(signer.public_url) + "?v=" + Date.now(),
      width,
      height,
      quality,
      aspect_ratio: ratio,
      upscale: quality !== "1080p",
    });
  } catch (error) {
    console.error("upscale-video failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  } finally {
    if (workDir) {
      await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
