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

/**
 * Returns `file` re-encoded to fit `bounds`, or `file` itself when it
 * already does. Throws ExportUnsupportedError in a browser without
 * WebCodecs.
 */
export async function fitVideoToPixels(
  file: File,
  bounds: PixelBounds,
  onProgress?: (fraction: number) => void,
): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  const video = createDecodeVideo(objectUrl);
  try {
    const probe = await probeVideo(objectUrl);
    const size = targetSize(probe.width, probe.height, bounds);
    if (!size) return file;
    if (!isExportSupported()) {
      throw new ExportUnsupportedError(
        "Your clip is above 720p and this browser can't resize it. Use Chrome, Edge, Firefox 130+ or Safari 17+, or upload a 720p clip.",
      );
    }

    await waitForReady(video);
    video.pause();
    const { width, height } = size;
    const totalFrames = Math.max(1, Math.round(probe.duration * FPS));
    // Plenty for 720p; the provider re-encodes anyway.
    const bitrate = 4_000_000;

    const soundtrack = await decodeSoundtrack(file);
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
        await seekTo(video, frame / FPS);
        ctx.drawImage(video, 0, 0, width, height);
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
      if (withAudio && soundtrack) await encodeAudio(soundtrack, audioConfig, muxer);
      muxer.finalize();
    } finally {
      if (encoder.state !== "closed") encoder.close();
    }
    if (encodeError) throw encodeError;

    onProgress?.(1);
    const name = file.name.replace(/\.[^.]+$/, "") || "clip";
    return new File([muxer.target.buffer], `${name}-720p.mp4`, { type: "video/mp4" });
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}
