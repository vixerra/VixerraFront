/**
 * Burns the Free plan's watermark into a result on download. The why and the
 * limits are in lib/watermark.ts; this is the heavy half — an encoder, a
 * muxer, the studio's decode helpers — split out so it is fetched only when
 * a Free user actually downloads, not with every page that has a player.
 */

import { ArrayBufferTarget, Muxer } from "mp4-muxer";

import { MIX_CHANNELS, MIX_SAMPLE_RATE } from "@/lib/editor/audio";
import {
  encodeAudio,
  ExportUnsupportedError,
  isExportSupported,
  pickVideoCodec,
  waitForQueue,
} from "@/lib/editor/export";
import { createDecodeVideo, probeVideo, seekTo, studioMediaUrl, waitForReady } from "@/lib/editor/media";
import { fontStack } from "@/lib/editor/render";
import {
  WATERMARK_FONT_SCALE,
  WATERMARK_GAP_EM,
  WATERMARK_MARK_EM,
  WATERMARK_OPACITY,
  WATERMARK_TEXT,
} from "@/lib/watermark";

/* ------------------------------------------------------------- drawing */

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/**
 * The mark from components/layout/logo.tsx: two rounded bars leaning ±20°
 * about their shared foot, one at half strength. Same coordinates as that
 * SVG (viewBox -8 -8 116 116), scaled into a `size` square at (x, y).
 */
function drawMark(ctx: Ctx2D, x: number, y: number, size: number) {
  const scale = size / 116;
  const bars: [angle: number, alpha: number][] = [
    [-20, 0.5],
    [20, 1],
  ];
  for (const [angle, alpha] of bars) {
    ctx.save();
    ctx.translate(x + 8 * scale, y + 8 * scale);
    ctx.scale(scale, scale);
    ctx.translate(50, 82);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.translate(-50, -82);
    ctx.globalAlpha *= alpha;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") ctx.roundRect(37, 18, 26, 64, 7);
    else ctx.rect(37, 18, 26, 64);
    ctx.fill();
    ctx.restore();
  }
}

type Stamp = { image: HTMLCanvasElement; x: number; y: number };

/**
 * The lockup for a `width`×`height` frame, drawn once at full strength.
 *
 * Opacity is applied when the stamp is laid on the frame, not while drawing
 * it: the two bars overlap, and fading each shape separately would darken
 * the overlap — the on-screen overlay fades the lockup as one layer, so this
 * has to as well. It also means a video draws the text once, not per frame.
 */
function createStamp(width: number, height: number): Stamp {
  const { stack, weight } = fontStack("display");
  const fontSize = WATERMARK_FONT_SCALE * Math.min(width, height);
  const font = `${weight} ${fontSize}px ${stack}`;

  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("This browser could not open a 2D canvas.");
  measure.font = font;
  const textWidth = measure.measureText(WATERMARK_TEXT).width;

  const markSize = WATERMARK_MARK_EM * fontSize;
  const gap = WATERMARK_GAP_EM * fontSize;
  // Room for the shadow on every side, so it isn't clipped at the edge.
  const pad = Math.ceil(fontSize * 0.5);
  const lockupWidth = markSize + gap + textWidth;
  const lockupHeight = Math.max(markSize, fontSize * 1.2);

  const image = document.createElement("canvas");
  image.width = Math.ceil(lockupWidth + pad * 2);
  image.height = Math.ceil(lockupHeight + pad * 2);
  const ctx = image.getContext("2d");
  if (!ctx) throw new Error("This browser could not open a 2D canvas.");

  // Light text over light footage is what the shadow is for; it matches the
  // overlay's drop-shadow in components/result-watermark.tsx.
  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = fontSize * 0.25;
  ctx.fillStyle = "#ffffff";
  const midY = image.height / 2;
  drawMark(ctx, pad, midY - markSize / 2, markSize);
  ctx.font = font;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(WATERMARK_TEXT, pad + markSize + gap, midY);

  return {
    image,
    x: Math.round((width - image.width) / 2),
    y: Math.round((height - image.height) / 2),
  };
}

function applyStamp(ctx: Ctx2D, stamp: Stamp) {
  ctx.save();
  ctx.globalAlpha = WATERMARK_OPACITY;
  ctx.drawImage(stamp.image, stamp.x, stamp.y);
  ctx.restore();
}

/* ------------------------------------------------------------ images */

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

async function burnIntoImage(source: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser could not open a 2D canvas.");
    ctx.drawImage(bitmap, 0, 0);
    applyStamp(ctx, createStamp(canvas.width, canvas.height));

    // Kept in the format it arrived in, so the extension the caller picked
    // from the source still describes the file.
    const type = IMAGE_TYPES.has(source.type) ? source.type : "image/png";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92));
    if (!blob) throw new Error("The watermarked image could not be encoded.");
    return blob;
  } finally {
    bitmap.close();
  }
}

/* ------------------------------------------------------------ videos */

/**
 * Output frame rate. Nothing cheap tells a browser a file's real rate, and
 * the models behind the Free plan render at 24fps, so re-timing a clip that
 * is already 24 changes nothing.
 */
const VIDEO_FPS = 24;
const KEYFRAME_SECONDS = 2;

/** H.264 wants even dimensions — see canvasSize in lib/editor/types.ts. */
function even(n: number) {
  return n % 2 === 0 ? n : n + 1;
}

/**
 * The source's own bitrate plus a quarter, clamped. A flat bits-per-pixel
 * figure tripled a 1080p clip's size (8MB in, 24MB out) for no visible gain;
 * the provider already chose a rate its footage looks right at, and the
 * headroom covers the second generation of encoding loss.
 */
function videoBitrate(source: Blob, durationSeconds: number) {
  const sourceRate = durationSeconds > 0 ? (source.size * 8) / durationSeconds : 0;
  return Math.min(12_000_000, Math.max(1_000_000, Math.round(sourceRate * 1.25)));
}

/** The clip's own soundtrack, resampled to what the AAC encoder takes, or
 *  null when it has none (decodeAudioData rejects a file with no audio). */
async function decodeSoundtrack(source: Blob): Promise<AudioBuffer | null> {
  try {
    const ctx = new OfflineAudioContext(MIX_CHANNELS, 1, MIX_SAMPLE_RATE);
    return await ctx.decodeAudioData(await source.arrayBuffer());
  } catch {
    return null;
  }
}

async function burnIntoVideo(source: Blob, onProgress?: (percent: number) => void): Promise<Blob> {
  if (!isExportSupported()) {
    throw new ExportUnsupportedError(
      "Downloading on the Free plan needs a browser that can encode video (Chrome, Edge, Firefox 130+ or Safari 17+).",
    );
  }

  const objectUrl = URL.createObjectURL(source);
  const video = createDecodeVideo(objectUrl);
  try {
    // probeVideo, not video.duration: some files report Infinity until the
    // browser has read to the end, and a frame count needs a real number.
    const probe = await probeVideo(objectUrl);
    await waitForReady(video);
    video.pause();

    const width = even(probe.width);
    const height = even(probe.height);
    const totalFrames = Math.max(1, Math.round(probe.duration * VIDEO_FPS));
    const bitrate = videoBitrate(source, probe.duration);

    const soundtrack = await decodeSoundtrack(source);
    const audioConfig: AudioEncoderConfig = {
      codec: "mp4a.40.2",
      sampleRate: MIX_SAMPLE_RATE,
      numberOfChannels: MIX_CHANNELS,
      bitrate: 128_000,
    };
    const withAudio =
      soundtrack !== null &&
      typeof window.AudioEncoder !== "undefined" &&
      (await AudioEncoder.isConfigSupported(audioConfig)
        .then((r) => r.supported ?? false)
        .catch(() => false));

    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: "avc", width, height, frameRate: VIDEO_FPS },
      ...(withAudio
        ? { audio: { codec: "aac" as const, numberOfChannels: MIX_CHANNELS, sampleRate: MIX_SAMPLE_RATE } }
        : {}),
      fastStart: "in-memory",
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("This browser could not open a 2D canvas.");
    ctx.imageSmoothingQuality = "high";
    if (document.fonts?.ready) await document.fonts.ready;
    const stamp = createStamp(width, height);

    let encodeError: unknown = null;
    const codec = await pickVideoCodec({ width, height, bitrate, framerate: VIDEO_FPS });
    const encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (error) => {
        encodeError = error;
      },
    });
    encoder.configure({ codec, width, height, bitrate, framerate: VIDEO_FPS, avc: { format: "avc" } });

    const frameDuration = 1e6 / VIDEO_FPS;
    const keyframeInterval = VIDEO_FPS * KEYFRAME_SECONDS;
    try {
      // Frame by frame through seeks, like the studio's export: playing the
      // clip and grabbing frames drops and repeats them when the tab is busy.
      for (let frame = 0; frame < totalFrames; frame++) {
        if (encodeError) throw encodeError;
        await seekTo(video, frame / VIDEO_FPS);
        ctx.drawImage(video, 0, 0, width, height);
        applyStamp(ctx, stamp);

        const videoFrame = new VideoFrame(canvas, {
          timestamp: Math.round(frame * frameDuration),
          duration: Math.round(frameDuration),
        });
        encoder.encode(videoFrame, { keyFrame: frame % keyframeInterval === 0 });
        videoFrame.close();
        await waitForQueue(encoder);

        if (frame % 6 === 0) onProgress?.(0.9 * ((frame + 1) / totalFrames));
      }
      await encoder.flush();
      if (withAudio && soundtrack) await encodeAudio(soundtrack, audioConfig, muxer);
      muxer.finalize();
    } finally {
      if (encoder.state !== "closed") encoder.close();
    }
    if (encodeError) throw encodeError;

    onProgress?.(1);
    return new Blob([muxer.target.buffer], { type: "video/mp4" });
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}

/* ------------------------------------------------------------ entry */

/**
 * Fetches a result through the same-origin media proxy and returns it with
 * the watermark burned in.
 *
 * `playbackUrl` is the signed URL the player already has. It has to go
 * through /api/studio/media: drawing cross-origin pixels taints the canvas,
 * and R2's signed URLs carry no CORS headers (see that route).
 *
 * `isVideo` comes from the generation's type rather than the response's
 * Content-Type, which a pre-R2 row can serve as application/octet-stream.
 */
export async function burnWatermark(
  playbackUrl: string,
  isVideo: boolean,
  onProgress?: (percent: number) => void,
): Promise<Blob> {
  const res = await fetch(studioMediaUrl(playbackUrl));
  if (!res.ok) throw new Error("This result couldn't be loaded for download. Try again.");
  return await burnWatermarkIntoBlob(await res.blob(), isVideo, onProgress);
}

/** The same burn, for bytes already in hand. */
export async function burnWatermarkIntoBlob(
  source: Blob,
  isVideo: boolean,
  onProgress?: (percent: number) => void,
): Promise<Blob> {
  return isVideo ? await burnIntoVideo(source, onProgress) : await burnIntoImage(source);
}

/** The extension a burned file should be saved under. */
export function watermarkedExtension(blob: Blob): string {
  if (blob.type === "video/mp4") return ".mp4";
  if (blob.type === "image/jpeg") return ".jpg";
  if (blob.type === "image/webp") return ".webp";
  return ".png";
}
