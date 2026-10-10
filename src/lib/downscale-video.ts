/**
 * Re-encodes a clip so each frame falls inside a pixel budget — today only
 * for the AI influencer's "Replace in the clip", whose provider (Seedance 2.5
 * on kie.ai) takes reference videos at 480p-720p only. A phone records 1080p
 * or more, which kie would refuse after the run was billed.
 *
 * Same pipeline as the Free plan's watermark burn (lib/watermark-burn.ts):
 * frames drawn by seeking, H.264 through WebCodecs, the soundtrack re-encoded
 * to AAC, muxed with mp4-muxer. Heavy, so callers import it dynamically and
 * only when a clip actually needs it.
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
import { createDecodeVideo, probeVideo, seekTo, waitForReady } from "@/lib/editor/media";

export type PixelBounds = { min: number; max: number };

/** A part of the frame, each side a fraction (0-1) of the frame's size. */
export type CropRect = { x: number; y: number; width: number; height: number };

const FPS = 24;
const KEYFRAME_SECONDS = 2;

/** Even, so H.264 accepts it, rounded toward the inside of the budget. */
function evenDown(n: number) {
  const r = Math.floor(n);
  return r % 2 === 0 ? r : r - 1;
}
function evenUp(n: number) {
  const r = Math.ceil(n);
  return r % 2 === 0 ? r : r + 1;
}

/** The size a `width`×`height` frame should be encoded at to fit `bounds`,
 *  aspect kept, or null when it already fits. */
export function targetSize(width: number, height: number, bounds: PixelBounds): { width: number; height: number } | null {
  const pixels = width * height;
  if (pixels >= bounds.min && pixels <= bounds.max) return null;
  const scale = Math.sqrt((pixels > bounds.max ? bounds.max : bounds.min) / pixels);
  const round = pixels > bounds.max ? evenDown : evenUp;
  return { width: round(width * scale), height: round(height * scale) };
}

async function decodeSoundtrack(source: Blob): Promise<AudioBuffer | null> {
  try {
    const ctx = new OfflineAudioContext(MIX_CHANNELS, 1, MIX_SAMPLE_RATE);
    return await ctx.decodeAudioData(await source.arrayBuffer());
  } catch {
    return null;
  }
}

const AUDIO_CONFIG: AudioEncoderConfig = {
  codec: "mp4a.40.2",
  sampleRate: MIX_SAMPLE_RATE,
  numberOfChannels: MIX_CHANNELS,
  bitrate: 128_000,
};

async function canEncodeAudio(): Promise<boolean> {
  return (
    typeof window.AudioEncoder !== "undefined" &&
    (await AudioEncoder.isConfigSupported(AUDIO_CONFIG)
      .then((r) => r.supported ?? false)
      .catch(() => false))
  );
}

/**
 * The clip's soundtrack alone, as an AAC .m4a. "Replace" sends its clip to
 * the provider without sound (see `dropAudio` below), so Seedance writes a
 * song of its own; this copy is uploaded beside it, never sent to the
 * provider, and the API puts it back on the result (lib/mp4-remux.ts there).
 *
 * Null when the clip has no sound or this browser can't encode AAC: the run
 * still goes ahead, with Seedance's audio.
 */
export async function extractSoundtrack(file: File): Promise<File | null> {
  if (!(await canEncodeAudio())) return null;
  const soundtrack = await decodeSoundtrack(file);
  if (!soundtrack) return null;
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    audio: { codec: "aac", numberOfChannels: MIX_CHANNELS, sampleRate: MIX_SAMPLE_RATE },
    fastStart: "in-memory",
  });
  await encodeAudio(soundtrack, AUDIO_CONFIG, muxer);
  muxer.finalize();
  const name = file.name.replace(/\.[^.]+$/, "") || "clip";
  return new File([muxer.target.buffer], `${name}-soundtrack.m4a`, { type: "audio/mp4" });
}

/** `duration` seconds of `buffer` from `start`, as a buffer of its own. */
function sliceAudio(buffer: AudioBuffer, start: number, duration: number): AudioBuffer | null {
  const from = Math.min(buffer.length, Math.round(start * buffer.sampleRate));
  const length = Math.min(buffer.length - from, Math.round(duration * buffer.sampleRate));
  if (length <= 0) return null;
  const slice = new AudioBuffer({ length, numberOfChannels: buffer.numberOfChannels, sampleRate: buffer.sampleRate });
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    slice.copyToChannel(buffer.getChannelData(channel).subarray(from, from + length), channel);
  }
  return slice;
}

/**
 * Returns `file` re-encoded to fit `bounds`, or `file` itself when it
 * already does and there's nothing else to change. Throws
 * ExportUnsupportedError in a browser without WebCodecs.
 *
 * `dropAudio` re-encodes even a clip that fits, to leave its soundtrack out:
 * ByteDance screens a reference video's audio and refuses the whole run when
 * it hears something it calls sensitive — a real person's voice, a song
 * (2026-10-08: "the input audio 'content[2]' may contain sensitive
 * information"). The sound comes back on the result through
 * extractSoundtrack above.
 *
 * `maxBytes` re-encodes a clip over that size too, at a bitrate chosen to
 * land under it — for a provider that caps the file rather than the frame.
 *
 * `range` keeps only that stretch of the clip, in seconds, and `crop` only
 * that part of the frame, as fractions of its width and height (see
 * editVideo).
 */
export async function fitVideoToPixels(
  file: File,
  bounds: PixelBounds,
  onProgress?: (fraction: number) => void,
  {
    dropAudio = false,
    maxBytes,
    range,
    crop,
  }: { dropAudio?: boolean; maxBytes?: number; range?: { start: number; end: number }; crop?: CropRect } = {},
): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  const video = createDecodeVideo(objectUrl);
  try {
    const probe = await probeVideo(objectUrl);
    // The source rectangle every frame is drawn from: the whole frame, or the
    // crop in pixels.
    const source = crop
      ? {
          x: Math.round(crop.x * probe.width),
          y: Math.round(crop.y * probe.height),
          width: Math.max(2, Math.round(crop.width * probe.width)),
          height: Math.max(2, Math.round(crop.height * probe.height)),
        }
      : { x: 0, y: 0, width: probe.width, height: probe.height };
    const resized = targetSize(source.width, source.height, bounds);
    const tooLarge = maxBytes !== undefined && file.size > maxBytes;
    if (!resized && !dropAudio && !tooLarge && !range && !crop) return file;
    const start = range ? Math.max(0, range.start) : 0;
    const duration = range ? Math.max(1 / FPS, Math.min(probe.duration, range.end) - start) : probe.duration;
    if (!isExportSupported()) {
      throw new ExportUnsupportedError(
        "This browser can't prepare your clip. Use Chrome, Edge, Firefox 130+ or Safari 17+.",
      );
    }

    await waitForReady(video);
    video.pause();
    // H.264 wants even sides; a clip that fits keeps its own size.
    const size = resized ?? { width: evenDown(source.width), height: evenDown(source.height) };
    const { width, height } = size;
    const totalFrames = Math.max(1, Math.round(duration * FPS));
    // Plenty for 720p; the provider re-encodes anyway. Under `maxBytes`
    // (Wan 2.2 Animate takes 10MB) it is lowered to fit, with 10% headroom
    // for the container and 128 kb/s set aside for the soundtrack.
    const bitrate = maxBytes
      ? Math.max(500_000, Math.min(4_000_000, Math.floor((maxBytes * 0.9 * 8) / Math.max(1, duration)) - 128_000))
      : 4_000_000;

    const fullSoundtrack = dropAudio ? null : await decodeSoundtrack(file);
    const soundtrack = fullSoundtrack && range ? sliceAudio(fullSoundtrack, start, duration) : fullSoundtrack;
    const withAudio = soundtrack !== null && (await canEncodeAudio());

    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: "avc", width, height, frameRate: FPS },
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

    let encodeError: unknown = null;
    const codec = await pickVideoCodec({ width, height, bitrate, framerate: FPS });
    const encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (error) => {
        encodeError = error;
      },
    });
    encoder.configure({ codec, width, height, bitrate, framerate: FPS, avc: { format: "avc" } });

    const frameDuration = 1e6 / FPS;
    try {
      for (let frame = 0; frame < totalFrames; frame++) {
        if (encodeError) throw encodeError;
        await seekTo(video, start + frame / FPS);
        ctx.drawImage(video, source.x, source.y, source.width, source.height, 0, 0, width, height);
        const videoFrame = new VideoFrame(canvas, {
          timestamp: Math.round(frame * frameDuration),
          duration: Math.round(frameDuration),
        });
        encoder.encode(videoFrame, { keyFrame: frame % (FPS * KEYFRAME_SECONDS) === 0 });
        videoFrame.close();
        await waitForQueue(encoder);
        if (frame % 6 === 0) onProgress?.(0.95 * ((frame + 1) / totalFrames));
      }
      await encoder.flush();
      if (withAudio && soundtrack) await encodeAudio(soundtrack, AUDIO_CONFIG, muxer);
      muxer.finalize();
    } finally {
      if (encoder.state !== "closed") encoder.close();
    }
    if (encodeError) throw encodeError;

    onProgress?.(1);
    const name = file.name.replace(/\.[^.]+$/, "") || "clip";
    return new File([muxer.target.buffer], `${name}-prepared.mp4`, { type: "video/mp4" });
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}

/** An edited clip keeps its own frame size, down to 1080p at most: every
 *  provider here takes 1080p, and a 4K phone clip would only make the encode
 *  slower and the upload heavier. */
const EDIT_PIXELS: PixelBounds = { min: 1, max: 1920 * 1080 };

/**
 * `file` cut to the stretch from `start` to `end` seconds and, with `crop`,
 * to that part of the frame, re-encoded as an MP4 with its sound. Used by the
 * reference editor (components/video-library/video-edit-modal.tsx). Throws
 * ExportUnsupportedError in a browser without WebCodecs.
 */
export async function editVideo(
  file: File,
  { start, end, crop }: { start: number; end: number; crop?: CropRect },
  onProgress?: (fraction: number) => void,
): Promise<File> {
  const edited = await fitVideoToPixels(file, EDIT_PIXELS, onProgress, { range: { start, end }, crop });
  const name = file.name.replace(/\.[^.]+$/, "") || "clip";
  const at = (s: number) => `${Math.round(s * 10) / 10}`;
  return new File([edited], `${name} (${at(start)}-${at(end)}s${crop ? ", cropped" : ""}).mp4`, { type: "video/mp4" });
}
