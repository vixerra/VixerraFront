/**
 * Sound while you edit.
 *
 * The export has always had audio — `mixProjectAudio` renders the whole
 * timeline offline in one pass. The preview had none, which made every
 * decision that depends on hearing something (where a cut lands, how loud
 * the music sits under a voice, whether a fade is too long) a guess that
 * could only be checked by exporting.
 *
 * An offline mixdown cannot serve the preview: it takes seconds to render
 * and the playhead moves, jumps and reverses constantly. So this is a live
 * graph instead, built from exactly the same numbers:
 *
 *     <video> ──► MediaElementSource ──► clip gain ─┐
 *     music buffer ──► BufferSource ──► music gain ─┴─► master ─► analyser ─► out
 *
 * Every gain is re-evaluated once per animation frame from the project and
 * the playhead, using the envelope helpers in `audio.ts` — the same ones the
 * mixdown schedules. What you hear here is what comes out of the exporter.
 *
 * Two browser rules shape the rest of this file:
 *
 *  1. An AudioContext starts suspended until a user gesture resumes it, and
 *     a media element that has never been unmuted by one may refuse to play
 *     with sound. Nothing here creates a context or unmutes anything until
 *     `resume()` is called from a click — which is why the decoders in
 *     `media.ts` are still created muted.
 *  2. `createMediaElementSource` may be called once per element, ever, and
 *     it permanently re-routes that element's audio into the graph. Hence
 *     the map: an element is wired once and kept until its clip is gone.
 */

import {
  clipMixVolume,
  clipRamps,
  envelopeAt,
  globalFadeAt,
  MIX_SAMPLE_RATE,
} from "./audio";
import type { TimelineLayout } from "./project";
import { getAsset } from "./storage";
import type { MusicTrack, Project } from "./types";

/**
 * Time constant for every gain change.
 *
 * Gains are written 60 times a second; assigning `.value` directly makes a
 * staircase out of a fade and clicks on every step. `setTargetAtTime` turns
 * each write into a short glide, short enough (~10ms) that a real fade still
 * lands where the export puts it.
 */
const GAIN_GLIDE = 0.01;

/** Below this the music node is left stopped rather than started and held at
 *  zero — a muted source still costs a decode. */
const SILENCE = 0.0005;

type ClipNode = {
  el: HTMLVideoElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
};

export class PreviewAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private meterBuffer: Float32Array<ArrayBuffer> | null = null;

  /** Elements handed over before the context existed, wired on first play. */
  private pending = new Map<string, HTMLVideoElement>();
  private clips = new Map<string, ClipNode>();

  private musicGain: GainNode | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  private musicBuffer: AudioBuffer | null = null;
  private musicAssetId: string | null = null;
  private musicLoading: string | null = null;
  /** The playhead the running music node was started against, so a seek can
   *  tell "still valid" from "needs restarting". */
  private musicStartedAt = -1;

  private volume = 1;
  private muted = false;
  private rate = 1;
  private disposed = false;

  /* --------------------------------------------------------- lifecycle */

  /**
   * Opens the audio path. Must be called from a user gesture — the Play
   * button, in practice.
   *
   * Everything downstream is safe to call before this and simply does
   * nothing, so the rest of the studio never has to ask whether audio is up
   * yet.
   */
  async resume(): Promise<void> {
    if (this.disposed) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state !== "running") {
      try {
        await ctx.resume();
      } catch {
        // Blocked despite the gesture (an iOS quirk, or a policy the user
        // set). The picture still plays; only the sound is missing.
        return;
      }
    }
    this.flushPending();
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof window === "undefined" || typeof AudioContext === "undefined") return null;

    // The mixdown's rate, so a buffer decoded for one is not resampled for
    // the other — and so the preview and the export hear the same file.
    const ctx = new AudioContext({ sampleRate: MIX_SAMPLE_RATE, latencyHint: "interactive" });

    const master = ctx.createGain();
    master.gain.value = 0;

    // Feeding the meter from the master bus rather than from the clips is
    // what makes it honest: it shows what is leaving the editor, fades,
    // mutes and all.
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.6;

    master.connect(analyser);
    analyser.connect(ctx.destination);

    const musicGain = ctx.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(master);

    this.ctx = ctx;
    this.master = master;
    this.analyser = analyser;
    this.musicGain = musicGain;
    this.meterBuffer = new Float32Array(analyser.fftSize);
    return ctx;
  }

  /** True once sound can actually come out — the transport shows a hint
   *  until it does. */
  get ready(): boolean {
    return this.ctx?.state === "running";
  }

  /* ------------------------------------------------------------- clips */

  /**
   * Registers a clip's decoder as an audio source.
   *
   * Called for every video the pool loads, whether or not audio has been
   * started yet; the ones that arrive early wait in `pending`.
   */
  attach(clipId: string, el: HTMLVideoElement) {
    if (this.disposed || this.clips.has(clipId)) return;
    this.pending.set(clipId, el);
    if (this.ready) this.flushPending();
  }

  private flushPending() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;

    for (const [clipId, el] of this.pending) {
      this.pending.delete(clipId);
      if (this.clips.has(clipId)) continue;
      try {
        const source = ctx.createMediaElementSource(el);
        const gain = ctx.createGain();
        gain.gain.value = 0;
        source.connect(gain).connect(master);
        // Only now, with the element's output going into the graph rather
        // than to the speakers, does unmuting it make a sound — and the
        // gesture that got us here is what makes the browser allow it.
        el.muted = false;
        el.volume = 1;
        this.clips.set(clipId, { el, source, gain });
      } catch {
        // Already wired to a context (a second studio on the page, or a
        // hot reload). The element keeps playing silently.
      }
    }
  }

  /** Drops nodes for clips the project no longer has. */
  retain(clipIds: Set<string>) {
    for (const [id, node] of this.clips) {
      if (clipIds.has(id)) continue;
      node.gain.gain.value = 0;
      try {
        node.source.disconnect();
        node.gain.disconnect();
      } catch {
        /* already torn down */
      }
      this.clips.delete(id);
    }
    for (const id of this.pending.keys()) {
      if (!clipIds.has(id)) this.pending.delete(id);
    }
  }

  /* ------------------------------------------------------------- music */

  /**
   * Points the music bus at a track, decoding it on first use.
   *
   * The decode is deliberately lazy and fire-and-forget: attaching a song
   * must not block the editor, and a track that fails to decode simply never
   * plays (the mixdown makes the same choice — see decodeMusic).
   */
  setMusic(track: MusicTrack | null) {
    const assetId = track?.assetId ?? null;
    if (assetId === this.musicAssetId) return;

    this.musicAssetId = assetId;
    this.musicBuffer = null;
    this.stopMusic();
    if (assetId) void this.loadMusic(assetId);
  }

  private async loadMusic(assetId: string) {
    if (this.musicLoading === assetId) return;
    this.musicLoading = assetId;
    try {
      const ctx = this.ensureContext();
      const blob = await getAsset(assetId);
      if (!ctx || !blob) return;
      const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
      // The user may have swapped tracks while this was decoding.
      if (this.musicAssetId === assetId) this.musicBuffer = buffer;
    } catch {
      /* unreadable or an unsupported codec — see the doc comment */
    } finally {
      if (this.musicLoading === assetId) this.musicLoading = null;
    }
  }

  private stopMusic() {
    const source = this.musicSource;
    this.musicSource = null;
    this.musicStartedAt = -1;
    if (!source) return;
    try {
      source.stop();
      source.disconnect();
    } catch {
      /* never started */
    }
  }

  /**
   * Starts the music node at the playhead.
   *
   * A BufferSource is single-use, so this runs again after every seek and
   * every pause — which is also why `offset` has to be worked out from the
   * timeline position rather than tracked incrementally.
   */
  private startMusic(track: MusicTrack, time: number) {
    const ctx = this.ctx;
    const buffer = this.musicBuffer;
    const bus = this.musicGain;
    if (!ctx || !buffer || !bus) return;

    this.stopMusic();

    const into = track.offset + time;
    // Past the end of a non-looping track there is nothing to play, and
    // `start()` with an offset beyond the buffer throws.
    if (!track.loop && into >= buffer.duration) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = this.rate;
    if (track.loop) {
      source.loop = true;
      source.loopStart = 0;
      source.loopEnd = buffer.duration;
    }
    source.connect(bus);
    source.start(0, track.loop ? into % buffer.duration : into);

    this.musicSource = source;
    this.musicStartedAt = time;
  }

  /* -------------------------------------------------------- transport */

  /** Master level, 0..1.5 — above 1 is a genuine boost for quiet model
   *  output, which is why this is not clamped at 1. */
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1.5, volume));
  }

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  /**
   * Preview speed. Applied to the music node directly; the clips' own
   * elements are rate-set by the engine, which already multiplies each
   * clip's speed by this.
   */
  setRate(rate: number) {
    this.rate = rate;
    if (this.musicSource) this.musicSource.playbackRate.value = rate;
  }

  /** Stops the clock without tearing the graph down. Elements are paused by
   *  the engine; only the music has to be stopped by hand. */
  pause() {
    this.stopMusic();
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, GAIN_GLIDE);
    }
  }

  /** A jump in the playhead invalidates the running music node. */
  seeked(playing: boolean) {
    if (!playing) this.stopMusic();
    else this.musicStartedAt = -1;
  }

  /* ------------------------------------------------------------- frame */

  /**
   * One pass of the mixer, called from the studio's draw loop.
   *
   * Everything is recomputed from scratch every frame rather than tracked
   * incrementally: an edit can change any number of these values between two
   * frames (a trim moves every clip after it), and a mixer that believed its
   * own cached state would need invalidation for each of them.
   */
  frame(project: Project, layout: TimelineLayout, time: number, playing: boolean) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || ctx.state !== "running") return;

    const now = ctx.currentTime;
    const masterGain = playing
      ? this.volume * (this.muted ? 0 : 1) * globalFadeAt(project, layout.duration, time)
      : 0;
    master.gain.setTargetAtTime(masterGain, now, GAIN_GLIDE);

    /* clips */
    const keepSource = project.keepSourceAudio;
    const active = new Set<string>();

    if (keepSource && playing) {
      for (const placed of layout.placed) {
        const node = this.clips.get(placed.clip.id);
        if (!node) continue;
        const volume = clipMixVolume(placed.clip);
        if (volume <= 0) continue;

        const { rampIn, rampOut } = clipRamps(layout, placed);
        const gain = envelopeAt(placed.start, placed.end, volume, rampIn, rampOut, time);
        if (gain <= 0) continue;

        active.add(placed.clip.id);
        node.gain.gain.setTargetAtTime(gain, now, GAIN_GLIDE);
      }
    }

    // Everything not sounding this frame is pulled to silence, including the
    // clip that just ended — its element goes on playing for a moment before
    // the engine pauses it.
    for (const [id, node] of this.clips) {
      if (active.has(id)) continue;
      node.gain.gain.setTargetAtTime(0, now, GAIN_GLIDE);
    }

    /* music */
    const track = project.music;
    const bus = this.musicGain;
    if (!bus) return;

    if (!track || !playing || this.musicBuffer === null) {
      bus.gain.setTargetAtTime(0, now, GAIN_GLIDE);
      if (this.musicSource) this.stopMusic();
      return;
    }

    const gain =
      track.volume *
      envelopeAt(
        0,
        layout.duration,
        1,
        Math.max(track.fadeIn, 0.001),
        Math.max(track.fadeOut, 0.001),
        time,
      );

    if (gain <= SILENCE) {
      bus.gain.setTargetAtTime(0, now, GAIN_GLIDE);
      return;
    }

    // Restarted after a seek, after a pause, or when a track first finishes
    // decoding mid-playback.
    if (!this.musicSource || this.musicStartedAt < 0) this.startMusic(track, time);
    bus.gain.setTargetAtTime(gain, now, GAIN_GLIDE);
  }

  /* ------------------------------------------------------------- meter */

  /**
   * Current output level, 0..1, as a peak reading.
   *
   * Peak rather than RMS because this drives a two-bar meter a few pixels
   * wide: RMS on speech sits so low that the meter looks broken, while peak
   * moves the way people expect a level to move.
   */
  level(): number {
    const analyser = this.analyser;
    const data = this.meterBuffer;
    if (!analyser || !data || this.ctx?.state !== "running") return 0;

    analyser.getFloatTimeDomainData(data);
    let peak = 0;
    for (let i = 0; i < data.length; i += 1) {
      const value = Math.abs(data[i]);
      if (value > peak) peak = value;
    }
    return Math.min(1, peak);
  }

  dispose() {
    this.disposed = true;
    this.stopMusic();
    this.retain(new Set());
    this.pending.clear();
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.master = null;
    this.analyser = null;
    this.musicGain = null;
    this.musicBuffer = null;
  }
}
