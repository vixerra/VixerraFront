/**
 * Turning a project into an actual MP4, entirely in the browser.
 *
 * ## Why here and not on the server
 *
 * This app's API is a Deno Edge Function on Supabase: stateless, capped at a
 * few minutes of wall clock, and with no ffmpeg binary to call. Rendering
 * server-side would mean standing up a whole second piece of infrastructure
 * — a worker, a queue, a machine with a video toolchain on it — for an
 * operation the user's own machine can do in seconds. WebCodecs gives real
 * hardware-accelerated H.264 encoding in the tab, so that is where the
 * render runs, and the finished file is then uploaded like any other asset.
 *
 * ## How a frame is made
 *
 * Frames are produced by SEEKING, not by playing. Playing a video and
 * grabbing whatever the compositor happens to have ready drops and repeats
 * frames the moment the machine is busy, which shows up as stutter that was
 * never in the source. Seeking to an exact source time and waiting for
 * `seeked` is slower than real time but deterministic: frame N of the export
 * is always the same picture, on every machine, at every speed.
 *
 * The drawing itself is `drawFrame` from render.ts — the same function the
 * live preview calls, which is what makes the export match what was on
 * screen.
 */

import { ArrayBufferTarget, Muxer } from "mp4-muxer";

import { MIX_CHANNELS, MIX_SAMPLE_RATE, mixProjectAudio } from "./audio";
import { seekTo, waitForReady, isVideoEl, type MediaEl } from "./media";
import { clipsAt, sourceTimeFor, timelineLayout } from "./project";
import { drawFrame, primeWatermark } from "./render";
import { canvasSize, EXPORT_QUALITIES, type Project } from "./types";

export type ExportPhase = "preparing" | "audio" | "video" | "packaging";

export type ExportProgress = {
  phase: ExportPhase;
  /** 0..1 across the whole export, not within the phase — a progress bar
   *  that restarts at each stage is worse than no bar at all. */
  percent: number;
  frame?: number;
  totalFrames?: number;
};

export type ExportResult = {
  blob: Blob;
  width: number;
  height: number;
  duration: number;
  /** False when the mix produced nothing, or when this browser has no AAC
   *  encoder — the caller warns rather than silently shipping a mute file. */
  hasAudio: boolean;
};

export class ExportUnsupportedError extends Error {}

/**
 * H.264 profiles to try, best first.
 *
 * High profile encodes visibly better at the same bitrate, which matters
 * because the sources are already lossy. Baseline is last because every
 * decoder on earth accepts it — it is the "at least it plays" fallback, not
 * a choice anyone would make deliberately.
 */
const AVC_CODECS = [
  "avc1.640034", // High 5.2
  "avc1.640028", // High 4.0
  "avc1.4d0032", // Main 5.0
  "avc1.42001f", // Baseline 3.1
];

/** A keyframe every two seconds. Frequent enough that scrubbing a posted
 *  clip is responsive, rare enough not to eat the bitrate. */
const KEYFRAME_SECONDS = 2;

/** How deep the encoder's queue is allowed to get before the render loop
 *  waits. Without a cap the loop hands over frames faster than the encoder
 *  drains them and the whole render sits in memory at once. */
const MAX_QUEUE = 8;

export function isExportSupported(): boolean {
  return typeof window !== "undefined" && typeof window.VideoEncoder !== "undefined";
}

async function pickVideoCodec(config: Omit<VideoEncoderConfig, "codec">): Promise<string> {
  for (const codec of AVC_CODECS) {
    try {
      const support = await VideoEncoder.isConfigSupported({ ...config, codec });
      if (support.supported) return codec;
    } catch {
      // isConfigSupported throws rather than reporting false for some
      // malformed codec strings on some builds — try the next one.
    }
  }
  throw new ExportUnsupportedError(
    "This browser can't encode H.264 video. Chrome, Edge or Safari 17+ can.",
  );
}

async function waitForQueue(encoder: { encodeQueueSize: number }) {
  while (encoder.encodeQueueSize > MAX_QUEUE) {
    await new Promise((resolve) => setTimeout(resolve, 8));
  }
}

/**
 * Renders and packages the project.
 *
 * `videoFor` hands back the decode element for a clip — the studio already
 * keeps a pool of those for the preview (see VideoPool), so the export
 * borrows them rather than downloading and decoding everything a second
 * time. They are seeked here, which is why the caller must have the preview
 * paused before starting.
 */
export async function exportProject(options: {
  project: Project;
  videoFor: (clipId: string) => MediaEl | null;
  objectUrlFor: (clipId: string) => string | null;
  onProgress?: (progress: ExportProgress) => void;
  signal?: AbortSignal;
}): Promise<ExportResult> {
  const { project, videoFor, objectUrlFor, onProgress, signal } = options;

  if (!isExportSupported()) {
    throw new ExportUnsupportedError(
      "Exporting needs the WebCodecs API. Chrome, Edge or Safari 17+ can do it; this browser can't yet.",
    );
  }

  const layout = timelineLayout(project);
  if (layout.duration <= 0) throw new Error("Add a clip before exporting.");

  const { width, height } = canvasSize(project.aspect, project.quality);
  const quality = EXPORT_QUALITIES.find((q) => q.id === project.quality) ?? EXPORT_QUALITIES[1];
  const fps = project.fps;
  const totalFrames = Math.max(1, Math.round(layout.duration * fps));

  const report = (phase: ExportPhase, percent: number, frame?: number) =>
    onProgress?.({ phase, percent, frame, totalFrames });

  report("preparing", 0);

  // Text is measured with `ctx.measureText`, and an unloaded webfont
  // measures at the fallback's metrics — the export would wrap its titles
  // somewhere the preview never did.
  if (document.fonts?.ready) await document.fonts.ready;
  await primeWatermark(project.watermark);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  // `alpha: false` lets the compositor skip per-pixel blending against a
  // transparent backdrop; the frame is opaque by construction anyway.
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("This browser could not open a 2D canvas.");
  ctx.imageSmoothingQuality = "high";

  // Every clip has to be decodable before the first frame — discovering a
  // dead source at frame 400 wastes the whole render.
  for (const clip of project.clips) {
    const video = videoFor(clip.id);
    if (!video) throw new Error(`"${clip.label}" isn't loaded yet. Give it a moment and retry.`);
    await waitForReady(video);
    // Stills have no playback to stop.
    if (isVideoEl(video)) video.pause();
  }

  /* ---------------------------------------------------------- audio */

  report("audio", 0.02);
  let mixed: AudioBuffer | null = null;
  try {
    mixed = await mixProjectAudio(project, objectUrlFor, layout);
  } catch {
    // A mix that will not render must not cost the user their video.
    mixed = null;
  }
  throwIfAborted(signal);

  const audioConfig: AudioEncoderConfig = {
    codec: "mp4a.40.2",
    sampleRate: MIX_SAMPLE_RATE,
    numberOfChannels: MIX_CHANNELS,
    bitrate: 128_000,
  };
  const audioSupported =
    mixed !== null &&
    typeof window.AudioEncoder !== "undefined" &&
    (await AudioEncoder.isConfigSupported(audioConfig)
      .then((r) => r.supported ?? false)
      .catch(() => false));

  /* ---------------------------------------------------------- muxer */

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "avc", width, height, frameRate: fps },
    ...(audioSupported
      ? {
          audio: {
            codec: "aac" as const,
            numberOfChannels: MIX_CHANNELS,
            sampleRate: MIX_SAMPLE_RATE,
          },
        }
      : {}),
    // Metadata at the front of the file: without it a browser or a social
    // platform has to read to the end before it can start playing, which is
    // what makes an uploaded clip look broken for its first few seconds.
    fastStart: "in-memory",
  });

  let encodeError: unknown = null;

  const videoCodec = await pickVideoCodec({
    width,
    height,
    bitrate: quality.bitrate,
    framerate: fps,
  });
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => {
      encodeError = error;
    },
  });
  videoEncoder.configure({
    codec: videoCodec,
    width,
    height,
    bitrate: quality.bitrate,
    framerate: fps,
    // AVCC (length-prefixed) rather than Annex B — that is what an MP4
    // sample entry expects, and the muxer would otherwise write chunks the
    // file's own `avcC` box does not describe.
    avc: { format: "avc" },
  });

  /* ---------------------------------------------------------- frames */

  const frameDuration = 1e6 / fps;
  const keyframeInterval = Math.max(1, Math.round(fps * KEYFRAME_SECONDS));

  try {
    for (let frame = 0; frame < totalFrames; frame++) {
      throwIfAborted(signal);
      if (encodeError) throw encodeError;

      const time = frame / fps;

      // Park every visible clip on its exact source frame first, then draw
      // once — drawing between seeks would blend a new frame with an old one
      // during a transition.
      for (const placed of clipsAt(layout, time)) {
        const video = videoFor(placed.clip.id);
        if (video) await seekTo(video, sourceTimeFor(placed, time));
      }

      drawFrame(ctx, project, time, (clip) => videoFor(clip.id), layout);

      const videoFrame = new VideoFrame(canvas, {
        timestamp: Math.round(frame * frameDuration),
        duration: Math.round(frameDuration),
      });
      videoEncoder.encode(videoFrame, { keyFrame: frame % keyframeInterval === 0 });
      videoFrame.close();

      await waitForQueue(videoEncoder);

      // The video pass is the long one, so it owns most of the bar: 5% is
      // spent getting here and 10% is left for flushing and packaging.
      if (frame % 3 === 0 || frame === totalFrames - 1) {
        report("video", 0.05 + 0.85 * ((frame + 1) / totalFrames), frame + 1);
      }
    }

    await videoEncoder.flush();

    if (audioSupported && mixed) {
      report("packaging", 0.92);
      await encodeAudio(mixed, audioConfig, muxer, signal);
    }

    report("packaging", 0.97);
    muxer.finalize();
  } finally {
    // close() on an already-closed encoder throws; the state check keeps a
    // failed export from masking its own cause with a second error.
    if (videoEncoder.state !== "closed") videoEncoder.close();
  }

  if (encodeError) throw encodeError;

  const blob = new Blob([muxer.target.buffer], { type: "video/mp4" });
  report("packaging", 1);

  return {
    blob,
    width,
    height,
    duration: layout.duration,
    hasAudio: audioSupported && mixed !== null,
  };
}

/**
 * Feeds the rendered mix through the AAC encoder in slices.
 *
 * One `AudioData` for the whole track would be a single allocation the size
 * of the entire song, and encoders reject oversized inputs anyway. A tenth
 * of a second per slice keeps the queue shallow and the timestamps exact —
 * they are computed from the running sample offset, never accumulated from
 * the slice length, so rounding cannot drift the audio out of sync.
 */
async function encodeAudio(
  buffer: AudioBuffer,
  config: AudioEncoderConfig,
  muxer: Muxer<ArrayBufferTarget>,
  signal?: AbortSignal,
) {
  let error: unknown = null;
  const encoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (e) => {
      error = e;
    },
  });
  encoder.configure(config);

  const sliceFrames = Math.round(config.sampleRate! / 10);
  const channels = Math.min(MIX_CHANNELS, buffer.numberOfChannels);
  const channelData = Array.from({ length: MIX_CHANNELS }, (_, i) =>
    // A mono mix is written to both channels rather than left silent on the
    // right — a hard-panned export sounds broken on headphones.
    buffer.getChannelData(Math.min(i, channels - 1)),
  );

  try {
    for (let offset = 0; offset < buffer.length; offset += sliceFrames) {
      throwIfAborted(signal);
      if (error) throw error;

      const frames = Math.min(sliceFrames, buffer.length - offset);
      // f32-planar: all of channel 0, then all of channel 1.
      const planar = new Float32Array(frames * MIX_CHANNELS);
      for (let channel = 0; channel < MIX_CHANNELS; channel++) {
        planar.set(channelData[channel].subarray(offset, offset + frames), channel * frames);
      }

      const data = new AudioData({
        format: "f32-planar",
        sampleRate: config.sampleRate!,
        numberOfFrames: frames,
        numberOfChannels: MIX_CHANNELS,
        timestamp: Math.round((offset / config.sampleRate!) * 1e6),
        data: planar,
      });
      encoder.encode(data);
      data.close();

      await waitForQueue(encoder);
    }
    await encoder.flush();
  } finally {
    if (encoder.state !== "closed") encoder.close();
  }

  if (error) throw error;
}

export class ExportCancelledError extends Error {
  constructor() {
    super("Export cancelled.");
  }
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new ExportCancelledError();
}

/**
 * A still from the middle of the timeline, for the gallery tile.
 *
 * Taken at 40% rather than at zero because a generated clip very often opens
 * on a dark or empty frame, and a black thumbnail makes a finished edit look
 * like a failed one.
 */
export async function renderPoster(options: {
  project: Project;
  videoFor: (clipId: string) => MediaEl | null;
}): Promise<Blob | null> {
  const { project, videoFor } = options;
  const layout = timelineLayout(project);
  if (layout.duration <= 0) return null;

  const { width, height } = canvasSize(project.aspect, "540");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return null;

  const time = layout.duration * 0.4;
  for (const placed of clipsAt(layout, time)) {
    const video = videoFor(placed.clip.id);
    if (video) await seekTo(video, sourceTimeFor(placed, time));
  }
  drawFrame(ctx, project, time, (clip) => videoFor(clip.id), layout);

  return await new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob), "image/png"),
  );
}
