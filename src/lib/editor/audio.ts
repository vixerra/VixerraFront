/**
 * Flattens the whole timeline's sound into one buffer.
 *
 * Video and audio are rendered by completely different means here — frames
 * are seeked and drawn one at a time, sound is mixed in a single offline
 * pass — so the two only meet again inside the muxer. That split is what
 * lets the video half run slower than real time (it has to; seeking is
 * expensive) without the audio drifting: nothing about this file depends on
 * how long the frames took.
 *
 * Everything is best-effort. A clip whose MP4 carries no audio track, a
 * codec the browser will not decode, a music file that turns out to be
 * corrupt — each is skipped with the rest of the mix intact, because losing
 * one clip's sound is a far better outcome than failing an export that took
 * a minute to render.
 */

import { timelineLayout, type TimelineLayout } from "./project";
import { getAsset } from "./storage";
import type { Project } from "./types";

/** 48kHz stereo: what AAC encoders and every social platform expect, and
 *  high enough that resampling a 44.1kHz source is inaudible. */
export const MIX_SAMPLE_RATE = 48000;
export const MIX_CHANNELS = 2;

/** A hard cut in the middle of a waveform is an audible click. Every clip
 *  gets this much ramp at each end unless a longer transition already
 *  covers it. */
const ANTI_CLICK_SECONDS = 0.03;

type ClipAudio = { clipId: string; buffer: AudioBuffer };

/**
 * Decodes each clip's audio track once.
 *
 * Keyed by clip rather than by source because the caller already holds one
 * object URL per source and `decodeAudioData` detaches the ArrayBuffer it is
 * given — two clips off one file therefore need two reads, and re-fetching
 * from the in-memory Blob URL is essentially free.
 */
async function decodeClipAudio(
  context: OfflineAudioContext,
  project: Project,
  objectUrlFor: (clipId: string) => string | null,
): Promise<ClipAudio[]> {
  const results = await Promise.all(
    project.clips.map(async (clip) => {
      if (clip.volume <= 0) return null;
      const url = objectUrlFor(clip.id);
      if (!url) return null;
      try {
        const bytes = await (await fetch(url)).arrayBuffer();
        return { clipId: clip.id, buffer: await context.decodeAudioData(bytes) };
      } catch {
        // No audio track, or a codec this browser will not decode.
        return null;
      }
    }),
  );
  return results.filter((r): r is ClipAudio => r !== null);
}

async function decodeMusic(
  context: OfflineAudioContext,
  assetId: string,
): Promise<AudioBuffer | null> {
  try {
    const blob = await getAsset(assetId);
    if (!blob) return null;
    return await context.decodeAudioData(await blob.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Renders the project's audio, or null when there is nothing to render.
 *
 * Returning null rather than a buffer of silence matters: the caller uses it
 * to decide whether to declare an audio track in the MP4 at all, and a
 * silent track is worse than no track — some platforms treat it as a
 * corrupted upload rather than as a deliberately quiet video.
 */
export async function mixProjectAudio(
  project: Project,
  objectUrlFor: (clipId: string) => string | null,
  layout: TimelineLayout = timelineLayout(project),
): Promise<AudioBuffer | null> {
  const duration = layout.duration;
  if (duration <= 0) return null;

  const wantsSource = project.keepSourceAudio;
  const wantsMusic = Boolean(project.music);
  if (!wantsSource && !wantsMusic) return null;

  const context = new OfflineAudioContext(
    MIX_CHANNELS,
    Math.ceil(duration * MIX_SAMPLE_RATE),
    MIX_SAMPLE_RATE,
  );

  const master = context.createGain();
  master.connect(context.destination);
  applyGlobalFades(master, project, duration);

  let scheduled = 0;

  if (wantsSource) {
    const decoded = await decodeClipAudio(context, project, objectUrlFor);
    const byClip = new Map(decoded.map((d) => [d.clipId, d.buffer]));

    for (const placed of layout.placed) {
      const buffer = byClip.get(placed.clip.id);
      if (!buffer) continue;

      const node = context.createBufferSource();
      node.buffer = buffer;
      // Speed changes pitch as well as tempo, which is the behaviour people
      // expect from a speed control on a clip — the alternative (time
      // stretching) is not something the Web Audio API offers.
      node.playbackRate.value = placed.clip.speed;

      const gain = context.createGain();
      // An overlapping transition should sound like what it looks like, so
      // the audio ramp is the transition's own length when there is one.
      const rampIn = Math.max(ANTI_CLICK_SECONDS, placed.transitionDuration);
      const nextOverlap = nextTransitionDuration(layout, placed.clip.id);
      const rampOut = Math.max(ANTI_CLICK_SECONDS, nextOverlap);
      shapeClipGain(gain, placed.start, placed.end, placed.clip.volume, rampIn, rampOut);

      node.connect(gain).connect(master);
      // offset/duration are in the BUFFER's own timeline, so the trim points
      // go in untouched — playbackRate then decides how long that takes.
      node.start(placed.start, placed.clip.in, placed.clip.out - placed.clip.in);
      scheduled += 1;
    }
  }

  const music = project.music;
  if (music && music.volume > 0) {
    const buffer = await decodeMusic(context, music.assetId);
    if (buffer) {
      const node = context.createBufferSource();
      node.buffer = buffer;
      node.loop = music.loop;
      if (music.loop) node.loopStart = 0;

      const gain = context.createGain();
      shapeClipGain(
        gain,
        0,
        duration,
        music.volume,
        Math.max(ANTI_CLICK_SECONDS, music.fadeIn),
        Math.max(ANTI_CLICK_SECONDS, music.fadeOut),
      );

      node.connect(gain).connect(master);
      // Without loop, `duration` clamps the track to the timeline; with it,
      // the node is stopped instead, since a looping source ignores it.
      node.start(0, Math.min(music.offset, Math.max(0, buffer.duration - 0.05)));
      node.stop(duration);
      scheduled += 1;
    }
  }

  if (scheduled === 0) return null;
  return await context.startRendering();
}

function nextTransitionDuration(layout: TimelineLayout, clipId: string): number {
  const index = layout.placed.findIndex((p) => p.clip.id === clipId);
  return layout.placed[index + 1]?.transitionDuration ?? 0;
}

/**
 * A clip's volume envelope: ramp up, hold, ramp down.
 *
 * Ramps are clamped to a third of the clip so a 0.3s slice with a 1s
 * transition on it does not end up with an in-ramp that outlives the clip
 * and never reaches full volume before the out-ramp starts.
 */
function shapeClipGain(
  gain: GainNode,
  start: number,
  end: number,
  volume: number,
  rampIn: number,
  rampOut: number,
) {
  const length = Math.max(0.001, end - start);
  const inRamp = Math.min(rampIn, length / 3);
  const outRamp = Math.min(rampOut, length / 3);

  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + inRamp);
  gain.gain.setValueAtTime(volume, Math.max(start + inRamp, end - outRamp));
  gain.gain.linearRampToValueAtTime(0, end);
}

/** The picture's opening and closing fades, matched on the master bus so a
 *  fade to black is also a fade to silence. */
function applyGlobalFades(master: GainNode, project: Project, duration: number) {
  const fadeIn = Math.min(project.fadeIn, duration / 2);
  const fadeOut = Math.min(project.fadeOut, duration / 2);
  if (fadeIn <= 0 && fadeOut <= 0) return;

  master.gain.setValueAtTime(fadeIn > 0 ? 0 : 1, 0);
  if (fadeIn > 0) master.gain.linearRampToValueAtTime(1, fadeIn);
  if (fadeOut > 0) {
    master.gain.setValueAtTime(1, Math.max(fadeIn, duration - fadeOut));
    master.gain.linearRampToValueAtTime(0, duration);
  }
}

/** Reads a dropped audio file's length without decoding all of it, so the
 *  music panel can draw its bar the moment the file is attached. */
export function probeAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That audio file could not be read."));
    };
    audio.src = url;
  });
}
