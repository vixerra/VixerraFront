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
 *     (fitVideoToPixels, the same pipeline the reference editor uses). For a
 *     region edit only a crop around the rectangle is sent — see contextCrop.
 *  2. It is uploaded and the run is queued. That costs credits and takes
 *     minutes, so the editor tracks it in the background (use-ai-edit-jobs)
 *     and the user keeps working.
 *  3. When it finishes, a segment result drops straight into the timeline. A
 *     region result is first pasted back over the original inside the
 *     rectangle (compositeRegion) and filed as a studio edit, so pixels
 *     outside the box are the original's, bit for bit — no edit model kie.ai
 *     sells takes a mask, so that guarantee has to come from here.
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
  /** Region only: the part of the frame that was actually sent. */
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

/* ------------------------------------------------------------ the crop */

/** The aspect ratios Wan 2.7 Video Edit can be asked for. A region crop is
 *  cut to one of these exactly, so the result comes back the same shape and
 *  pastes over the original without stretching. */
const AI_EDIT_ASPECTS: { id: string; ratio: number }[] = [
  { id: "16:9", ratio: 16 / 9 },
  { id: "9:16", ratio: 9 / 16 },
  { id: "1:1", ratio: 1 },
  { id: "4:3", ratio: 4 / 3 },
  { id: "3:4", ratio: 3 / 4 },
];

/** Context kept around the rectangle on each side, as a fraction of its own
 *  size. The model has to see what it is editing in its surroundings — a
 *  jacket cropped to its seams could be anything — but every extra pixel of
 *  context is one it may redraw for nothing. */
const CROP_CONTEXT = 0.3;
/** Smallest crop, as a fraction of the frame's short side, so a tiny box
 *  still arrives with enough around it to be recognisable. */
const CROP_MIN_SHORT_SIDE = 0.25;

/**
 * The part of the frame sent for a region edit, and the aspect ratio to ask
 * for: the rectangle plus context, grown to whichever supported ratio wastes
 * the least, shifted to stay inside the frame.
 *
 * A ratio that can't hold the rectangle inside the frame is skipped. When
 * none can (a box that is most of a frame whose shape is none of the five),
 * the whole frame goes, with no ratio, and the result follows the source.
 */
export function contextCrop(
  region: CropRect,
  frame: { width: number; height: number },
): { crop: CropRect; aspectRatio?: string } {
  const W = frame.width;
  const H = frame.height;
  const r = {
    x: region.x * W,
    y: region.y * H,
    w: region.width * W,
    h: region.height * H,
  };
  const minSide = Math.min(W, H) * CROP_MIN_SHORT_SIDE;
  const wantW = Math.max(r.w * (1 + 2 * CROP_CONTEXT), minSide);
  const wantH = Math.max(r.h * (1 + 2 * CROP_CONTEXT), minSide);
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;

  let best: { crop: CropRect; aspectRatio: string; area: number } | null = null;
  for (const { id, ratio } of AI_EDIT_ASPECTS) {
    let cw = Math.max(wantW, wantH * ratio);
    let ch = cw / ratio;
    // Too big for the frame: shrink, keeping the ratio, and give up on the
    // context before giving up on the rectangle.
    if (cw > W) {
      cw = W;
      ch = cw / ratio;
    }
    if (ch > H) {
      ch = H;
      cw = ch * ratio;
    }
    if (cw < r.w - 0.5 || ch < r.h - 0.5) continue;

    const x = Math.max(0, Math.min(W - cw, cx - cw / 2));
    const y = Math.max(0, Math.min(H - ch, cy - ch / 2));
    const area = cw * ch;
    if (!best || area < best.area) {
      best = { crop: { x: x / W, y: y / H, width: cw / W, height: ch / H }, aspectRatio: id, area };
    }
  }

  return best
    ? { crop: best.crop, aspectRatio: best.aspectRatio }
    : { crop: { x: 0, y: 0, width: 1, height: 1 } };
}

/* ------------------------------------------------------- send it off */

/** A whole-frame stretch keeps its own size, down to 1080p at most. */
const SEGMENT_PIXELS = { min: 240 * 426, max: 1920 * 1080 };
/** A crop is usually small. It is scaled UP to at least this many pixels
 *  (853x480 at 16:9): the provider wants 240px a side at the very least, and
 *  the model draws detail it can see. The paste-back scales it down again. */
const REGION_PIXELS = { min: 640 * 640, max: 1920 * 1080 };

/**
 * Cuts the stretch (and, for a region, the crop) out of the source file and
 * re-encodes it for upload. Throws ExportUnsupportedError in a browser
 * without WebCodecs.
 */
export async function prepareAiEditClip(
  source: Blob,
  request: Pick<AiEditRequest, "mode" | "start" | "end">,
  crop: CropRect | undefined,
  onProgress?: (fraction: number) => void,
): Promise<File> {
  const { fitVideoToPixels } = await import("@/lib/downscale-video");
  const file = source instanceof File ? source : new File([source], "clip.mp4", { type: "video/mp4" });
  return await fitVideoToPixels(
    file,
    request.mode === "region" ? REGION_PIXELS : SEGMENT_PIXELS,
    onProgress,
    {
      range: { start: request.start, end: request.end },
      crop,
      // A crop goes up silent: its sound is the original's again after the
      // composite, and the model has no use for it.
      dropAudio: request.mode === "region",
    },
  );
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
