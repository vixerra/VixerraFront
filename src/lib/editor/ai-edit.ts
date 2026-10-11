/**
 * AI edits inside the Editing Studio: pick 2-10 seconds of a clip, describe a
 * change, and get those seconds back redrawn — either the whole frame
 * ("segment") or only inside a rectangle the user drew ("region").
 *
 * The model is Wan 2.7 Video Edit, run by the API like any other generation
 * (POST /api/generations/video-edit, see lib/video-edit.ts there). Everything
 * around it happens in this tab, because that is where the frames are:
 *
 *  1. The stretch is cut out of the source and re-encoded with WebCodecs
 *     (fitVideoToPixels, the same pipeline the reference editor uses). A
 *     region edit sends the WHOLE frame, so the model sees the scene the box
 *     sits in, with the box marked on it by a red outline drawn just outside
 *     it (see editWindow and drawRegionMarker). The API wraps the user's
 *     prompt in an instruction to change only what is inside the outline and
 *     to drop the outline itself (lib/video-edit.ts there).
 *  2. It is uploaded and the run is queued. That costs credits and takes
 *     minutes, so the editor tracks it in the background (use-ai-edit-jobs)
 *     and the user keeps working.
 *  3. When it finishes, a segment result drops straight into the timeline. A
 *     region result is first pasted back over the original inside the
 *     rectangle (compositeRegion) and filed as a studio edit. The model
 *     re-renders every pixel however well it is told not to, and no edit
 *     model kie.ai sells takes a mask, so this paste is what actually keeps
 *     the outside of the box the original's, bit for bit. It also discards
 *     the outline if the model left it in: the outline lies outside the box.
 */

import { apiFetch } from "@/lib/api-client";
import { workspaceQuery } from "@/components/providers/workspace-provider";
import type { CropRect } from "@/lib/downscale-video";
import { AI_EDIT_MIN_SECONDS } from "./types";

export type AiEditMode = "segment" | "region";
export type AiEditResolution = "720p" | "1080p";
export type { CropRect };

/** What the dialog hands over: the edit as the user described it. */
export type AiEditRequest = {
  mode: AiEditMode;
  clipId: string;
  /** The generation the clip plays, so the result can be traced back. */
  sourceId: string;
  clipLabel: string;
  /** The stretch, in SOURCE seconds. */
  start: number;
  end: number;
  prompt: string;
  resolution: AiEditResolution;
  /** Segment only: keep the clip's sound under the new picture. */
  keepAudio: boolean;
  /** Region only: the rectangle, as fractions of the source frame. */
  region?: CropRect;
};

/** A submitted edit the editor is waiting on. Persisted per project, so a
 *  reload picks the wait back up instead of losing a paid-for result. */
export type AiEditJob = AiEditRequest & {
  /** The video-edit generation's id. */
  id: string;
  /** Region only: the part of the frame that was actually sent — the whole
   *  frame unless its shape is one the model can't be asked for. */
  crop?: CropRect;
  createdAt: string;
  /** `applying` is the composite and the timeline insert after the model is
   *  done. A reload during it goes back to `running`, whose first stream
   *  event for a finished row is "completed", so it simply runs again. */
  status: "running" | "applying" | "failed";
  progress: number;
  error?: string;
  /** The model finished but the composite or the timeline insert didn't.
   *  Only such a failure is worth retrying: the paid-for result exists. */
  failedAfterModel?: boolean;
};

/** Whether a clip's trim leaves room for an AI edit at all. */
export function canAiEdit(clipIn: number, clipOut: number): boolean {
  return clipOut - clipIn >= AI_EDIT_MIN_SECONDS - 0.001;
}

/* -------------------------------------------------- what the model sees */

/** The aspect ratios Wan 2.7 Video Edit can be asked for. A region edit is
 *  sent in one of these exactly, so the result comes back the same shape and
 *  pastes over the original without stretching. */
const AI_EDIT_ASPECTS: { id: string; ratio: number }[] = [
  { id: "16:9", ratio: 16 / 9 },
  { id: "9:16", ratio: 9 / 16 },
  { id: "1:1", ratio: 1 },
  { id: "4:3", ratio: 4 / 3 },
  { id: "3:4", ratio: 3 / 4 },
];

/** How far a frame's shape may be off one of the five and still count as it:
 *  1080x1920 is 9:16 exactly, 720x1278 (a model's odd crop) is close enough
 *  for the model to hand it back unchanged. */
const ASPECT_TOLERANCE = 0.01;

/**
 * The part of the frame a region edit sends, and the aspect ratio to ask for.
 *
 * The whole frame, whenever its shape is one the model can be asked for —
 * which nearly every generated clip's is. The model then edits the box with
 * the full scene around it: the light, the other people, where the camera is.
 *
 * A frame of any other shape (4:5, 21:9) would come back reshaped, and the
 * paste-back would no longer line up. Then the largest window of a supported
 * shape that still holds the box goes instead, as near the box's centre as
 * the frame allows. Failing even that, the whole frame goes with no ratio,
 * and the result is trusted to follow the source.
 */
export function editWindow(
  region: CropRect,
  frame: { width: number; height: number },
): { crop: CropRect; aspectRatio?: string } {
  const W = frame.width;
  const H = frame.height;
  const own = AI_EDIT_ASPECTS.find(({ ratio }) => Math.abs(W / H / ratio - 1) <= ASPECT_TOLERANCE);
  if (own) return { crop: { x: 0, y: 0, width: 1, height: 1 }, aspectRatio: own.id };

  const r = { x: region.x * W, y: region.y * H, w: region.width * W, h: region.height * H };
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;

  let best: { crop: CropRect; aspectRatio: string; area: number } | null = null;
  for (const { id, ratio } of AI_EDIT_ASPECTS) {
    // The biggest window of this shape the frame has room for.
    const cw = Math.min(W, H * ratio);
    const ch = cw / ratio;
    if (cw < r.w - 0.5 || ch < r.h - 0.5) continue;
    const x = Math.max(0, Math.min(W - cw, cx - cw / 2));
    const y = Math.max(0, Math.min(H - ch, cy - ch / 2));
    const area = cw * ch;
    if (!best || area > best.area) {
      best = { crop: { x: x / W, y: y / H, width: cw / W, height: ch / H }, aspectRatio: id, area };
    }
  }

  return best
    ? { crop: best.crop, aspectRatio: best.aspectRatio }
    : { crop: { x: 0, y: 0, width: 1, height: 1 } };
}

/** The box as a fraction of the window that is sent, which is where the
 *  model will see it — the same as the box itself when the whole frame goes. */
export function regionInWindow(region: CropRect, window: CropRect): CropRect {
  return {
    x: (region.x - window.x) / window.width,
    y: (region.y - window.y) / window.height,
    width: region.width / window.width,
    height: region.height / window.height,
  };
}

/** The outline's colour. Pure red reads as an annotation to every model that
 *  has seen "edit inside the red box"; the API's prompt names it the same. */
const MARKER_COLOR = "#ff0000";

/**
 * Draws the box the model is told to edit inside, as a red outline.
 *
 * The outline sits entirely OUTSIDE the box, with a small gap, so the model
 * sees everything inside the box untouched by it — and so the paste-back,
 * which only ever takes pixels from inside the box, can't carry the outline
 * into the result even when the model leaves it in.
 */
function drawRegionMarker(box: CropRect) {
  return (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const thickness = Math.max(3, Math.round(Math.min(width, height) * 0.006));
    const gap = Math.max(2, Math.round(thickness / 2));
    const out = gap + thickness / 2;
    ctx.save();
    ctx.strokeStyle = MARKER_COLOR;
    ctx.lineWidth = thickness;
    ctx.strokeRect(
      box.x * width - out,
      box.y * height - out,
      box.width * width + 2 * out,
      box.height * height + 2 * out,
    );
    ctx.restore();
  };
}

/* ------------------------------------------------------- send it off */

/** What is sent keeps its own size, down to 1080p at most. */
const EDIT_PIXELS = { min: 240 * 426, max: 1920 * 1080 };

/**
 * Cuts the stretch out of the source file and re-encodes it for upload — for
 * a region edit, the window from editWindow with the box outlined on every
 * frame. Throws ExportUnsupportedError in a browser without WebCodecs.
 */
export async function prepareAiEditClip(
  source: Blob,
  request: Pick<AiEditRequest, "mode" | "start" | "end" | "region">,
  sent: CropRect | undefined,
  onProgress?: (fraction: number) => void,
): Promise<File> {
  const { fitVideoToPixels } = await import("@/lib/downscale-video");
  const file = source instanceof File ? source : new File([source], "clip.mp4", { type: "video/mp4" });
  const region = request.mode === "region" ? request.region : undefined;
  const whole = !sent || (sent.x === 0 && sent.y === 0 && sent.width === 1 && sent.height === 1);
  return await fitVideoToPixels(file, EDIT_PIXELS, onProgress, {
    range: { start: request.start, end: request.end },
    crop: whole ? undefined : sent,
    overlay: region ? drawRegionMarker(sent ? regionInWindow(region, sent) : region) : undefined,
    // A region edit goes up silent: its sound is the original's again after
    // the composite, and the model has no use for it.
    dropAudio: request.mode === "region",
  });
}

type UploadResponse = { url?: string; ref?: string; error?: string };

async function uploadFile(file: File | Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append("file", new File([file], filename, { type: file.type }));
  const res = await apiFetch("/api/upload", { method: "POST", body: form });
  const data = (await res.json().catch(() => ({}))) as UploadResponse;
  if (!res.ok || !data.ref) throw new Error(data.error ?? "That clip could not be uploaded.");
  return data.ref;
}

/** Uploads the prepared clip and queues the run. Returns the job's id. */
export async function submitAiEdit(
  request: AiEditRequest,
  clip: File,
  crop?: { crop: CropRect; aspectRatio?: string },
): Promise<{ jobId: string }> {
  const ref = await uploadFile(clip, "ai-edit.mp4");
  const res = await apiFetch(`/api/generations/video-edit${workspaceQuery()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      video: ref,
      prompt: request.prompt,
      resolution: request.resolution,
      keepAudio: request.keepAudio,
      mode: request.mode,
      sourceGenerationId: request.sourceId,
      sourceStart: Number(request.start.toFixed(3)),
      region: request.region,
      crop: crop?.crop,
      aspectRatio: crop?.aspectRatio,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { job_id?: string; error?: string };
  if (!res.ok || !data.job_id) throw new Error(data.error ?? "The AI edit couldn't be started.");
  return { jobId: data.job_id };
}

/* -------------------------------------------------- paste it back in */

const COMPOSITE_FPS = 24;
const COMPOSITE_KEYFRAME_SECONDS = 2;
const COMPOSITE_BITRATE = 8_000_000;

function evenDown(n: number) {
  const r = Math.floor(n);
  return r % 2 === 0 ? r : r - 1;
}

/**
 * A white rectangle with a soft inner edge, the alpha the result is pasted
 * through. The fade sits entirely INSIDE the rectangle and reaches zero at its
 * border, so not one pixel outside the box the user drew is touched; the
 * softness only hides the seam inside it.
 *
 * `ctx.filter` is what blurs it. A browser without canvas filters draws the
 * same rectangle with a hard edge, which is still correct, just visible.
 */
function featherMask(width: number, height: number, rect: { x: number; y: number; w: number; h: number }) {
  const mask = document.createElement("canvas");
  mask.width = width;
  mask.height = height;
  const ctx = mask.getContext("2d");
  if (!ctx) throw new Error("This browser could not open a 2D canvas.");
  const feather = Math.max(2, Math.min(16, Math.min(rect.w, rect.h) * 0.04));
  ctx.fillStyle = "#fff";
  // Inset by the feather and blurred by a third of it: three sigma, so the
  // alpha left at the rectangle's border is about a thousandth.
  ctx.filter = `blur(${(feather / 3).toFixed(2)}px)`;
  ctx.fillRect(rect.x + feather, rect.y + feather, Math.max(1, rect.w - 2 * feather), Math.max(1, rect.h - 2 * feather));
  return mask;
}

/**
 * The original stretch with the region edit pasted over it, as an MP4 at the
 * source's own size (1080p at most), with the original sound.
 *
 * The result is drawn over the crop it was made from, stretched to it rather
 * than cover-fitted: the model keeps its composition against the frame's
 * edges, so stretching keeps the two pictures registered where they meet.
 * Its timeline is mapped onto the stretch proportionally, so a result a few
 * frames longer or shorter still starts and ends with the original.
 */
export async function compositeRegion(options: {
  originalUrl: string;
  resultUrl: string;
  start: number;
  end: number;
  region: CropRect;
  crop: CropRect;
  onProgress?: (fraction: number) => void;
}): Promise<{ video: File; poster: Blob | null }> {
  const { originalUrl, resultUrl, start, end, region, crop, onProgress } = options;
  const [{ ArrayBufferTarget, Muxer }, exportLib, media, audioLib, reencode] = await Promise.all([
    import("mp4-muxer"),
    import("./export"),
    import("./media"),
    import("./audio"),
    import("@/lib/downscale-video"),
  ]);
  if (!exportLib.isExportSupported()) {
    throw new exportLib.ExportUnsupportedError(
      "This browser can't finish an area edit. Use Chrome, Edge, Firefox 130+ or Safari 17+.",
    );
  }

  const original = media.createDecodeVideo(originalUrl);
  const result = media.createDecodeVideo(resultUrl);
  try {
    await Promise.all([media.waitForReady(original), media.waitForReady(result)]);
    original.pause();
    result.pause();

    const duration = Math.max(1 / COMPOSITE_FPS, end - start);
    const resultDuration = Number.isFinite(result.duration) && result.duration > 0 ? result.duration : duration;
    const size = reencode.targetSize(original.videoWidth, original.videoHeight, { min: 1, max: 1920 * 1080 });
    const width = size?.width ?? evenDown(original.videoWidth);
    const height = size?.height ?? evenDown(original.videoHeight);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("This browser could not open a 2D canvas.");
    ctx.imageSmoothingQuality = "high";

    // The crop, in output pixels, and a layer of its size the result is
    // masked on before it goes down over the original.
    const cropPx = {
      x: Math.round(crop.x * width),
      y: Math.round(crop.y * height),
      w: Math.max(2, Math.round(crop.width * width)),
      h: Math.max(2, Math.round(crop.height * height)),
    };
    const layer = document.createElement("canvas");
    layer.width = cropPx.w;
    layer.height = cropPx.h;
    const layerCtx = layer.getContext("2d");
    if (!layerCtx) throw new Error("This browser could not open a 2D canvas.");
    layerCtx.imageSmoothingQuality = "high";
    const mask = featherMask(cropPx.w, cropPx.h, {
      x: region.x * width - cropPx.x,
      y: region.y * height - cropPx.y,
      w: region.width * width,
      h: region.height * height,
    });

    const soundtrack = await (async () => {
      const full = await reencode.decodeSoundtrack(await (await fetch(originalUrl)).blob());
      return full ? reencode.sliceAudio(full, start, duration) : null;
    })();
    const withAudio = soundtrack !== null && (await reencode.canEncodeAudio());

    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: "avc", width, height, frameRate: COMPOSITE_FPS },
      ...(withAudio
        ? {
            audio: {
              codec: "aac" as const,
              numberOfChannels: audioLib.MIX_CHANNELS,
              sampleRate: audioLib.MIX_SAMPLE_RATE,
            },
          }
        : {}),
      fastStart: "in-memory",
    });

    let encodeError: unknown = null;
    const codec = await exportLib.pickVideoCodec({
      width,
      height,
      bitrate: COMPOSITE_BITRATE,
      framerate: COMPOSITE_FPS,
    });
    const encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (error) => {
        encodeError = error;
      },
    });
    encoder.configure({
      codec,
      width,
      height,
      bitrate: COMPOSITE_BITRATE,
      framerate: COMPOSITE_FPS,
      avc: { format: "avc" },
    });

    const totalFrames = Math.max(1, Math.round(duration * COMPOSITE_FPS));
    // Taken at 40%, like an export's poster, past any dark opening frame.
    const posterFrame = Math.floor(totalFrames * 0.4);
    let poster: Blob | null = null;
    const frameDuration = 1e6 / COMPOSITE_FPS;
    try {
      for (let frame = 0; frame < totalFrames; frame++) {
        if (encodeError) throw encodeError;
        // Mid-frame, for the reason fitVideoToPixels gives: a seek to the
        // exact n/24 often decodes frame n-1. The prepared clip the model saw
        // was sampled the same way, so its frames and these stay in step.
        const t = (frame + 0.5) / COMPOSITE_FPS;
        await Promise.all([
          media.seekTo(original, start + t),
          media.seekTo(result, Math.min(resultDuration - 0.001, (t / duration) * resultDuration)),
        ]);

        ctx.drawImage(original, 0, 0, width, height);

        layerCtx.globalCompositeOperation = "copy";
        layerCtx.drawImage(result, 0, 0, cropPx.w, cropPx.h);
        layerCtx.globalCompositeOperation = "destination-in";
        layerCtx.drawImage(mask, 0, 0);
        layerCtx.globalCompositeOperation = "source-over";
        ctx.drawImage(layer, cropPx.x, cropPx.y);

        if (frame === posterFrame) {
          poster = await new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85));
        }

        const videoFrame = new VideoFrame(canvas, {
          timestamp: Math.round(frame * frameDuration),
          duration: Math.round(frameDuration),
        });
        encoder.encode(videoFrame, { keyFrame: frame % (COMPOSITE_FPS * COMPOSITE_KEYFRAME_SECONDS) === 0 });
        videoFrame.close();
        await exportLib.waitForQueue(encoder);
        if (frame % 6 === 0) onProgress?.(0.95 * ((frame + 1) / totalFrames));
      }
      await encoder.flush();
      if (withAudio && soundtrack) await exportLib.encodeAudio(soundtrack, reencode.AUDIO_CONFIG, muxer);
      muxer.finalize();
    } finally {
      if (encoder.state !== "closed") encoder.close();
    }
    if (encodeError) throw encodeError;

    onProgress?.(1);
    return {
      video: new File([muxer.target.buffer], "ai-area-edit.mp4", { type: "video/mp4" }),
      poster,
    };
  } finally {
    for (const el of [original, result]) {
      el.removeAttribute("src");
      el.load();
    }
  }
}

/**
 * Files a finished composite as a studio edit, the same way an export is
 * filed — free, since the credits were spent on the model run it came from.
 * A missing poster never fails it; the timeline just shows no thumbnail.
 */
export async function fileAiComposite(options: {
  video: File;
  poster: Blob | null;
  job: AiEditJob;
}): Promise<{ id: string; resultUrl: string; thumbnailUrl: string | null }> {
  const { video, poster, job } = options;
  const resultRef = await uploadFile(video, "ai-area-edit.mp4");
  const thumbnailRef = poster ? await uploadFile(poster, "ai-area-edit.jpg").catch(() => null) : null;

  const res = await apiFetch("/api/generations/edited", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resultRef,
      thumbnailRef,
      name: `AI area edit · ${job.prompt}`.slice(0, 120),
      sourceIds: [job.sourceId, job.id],
      parameters: {
        aiEdit: "region",
        prompt: job.prompt,
        start: job.start,
        end: job.end,
        region: job.region,
        crop: job.crop,
        duration: Number((job.end - job.start).toFixed(2)),
        sizeBytes: video.size,
      },
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    id?: string;
    resultUrl?: string | null;
    thumbnailUrl?: string | null;
    error?: string;
  };
  if (!res.ok || !data.id || !data.resultUrl) {
    throw new Error(data.error ?? "The finished area edit couldn't be saved.");
  }
  return { id: data.id, resultUrl: data.resultUrl, thumbnailUrl: data.thumbnailUrl ?? null };
}

/* ---------------------------------------------------------- persistence */

/** One key for every project's pending edits, keyed by project id inside.
 *  Small — a handful of ids and numbers per edit — and dropped per project
 *  as soon as nothing is pending there. */
const JOBS_KEY = "aivio.studio.aiEdits.v1";

function readAll(): Record<string, AiEditJob[]> {
  try {
    const raw = window.localStorage.getItem(JOBS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, AiEditJob[]>)
      : {};
  } catch {
    return {};
  }
}

export function loadAiJobs(projectId: string): AiEditJob[] {
  const jobs = readAll()[projectId];
  if (!Array.isArray(jobs)) return [];
  return jobs
    .filter((job) => job && typeof job.id === "string" && typeof job.clipId === "string")
    .map((job) => (job.status === "applying" ? { ...job, status: "running" as const } : job));
}

export function saveAiJobs(projectId: string, jobs: AiEditJob[]) {
  try {
    const all = readAll();
    if (jobs.length > 0) all[projectId] = jobs;
    else delete all[projectId];
    window.localStorage.setItem(JOBS_KEY, JSON.stringify(all));
  } catch {
    // Private mode or a full quota. The edit still runs and still lands in
    // the gallery; only a reload mid-run would lose track of it.
  }
}
