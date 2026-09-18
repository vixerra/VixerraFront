"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  PREVIEW_DRIFT_NUDGE,
  PREVIEW_DRIFT_SOFT,
  PREVIEW_DRIFT_TOLERANCE,
  PREVIEW_PREROLL_SECONDS,
  VideoPool,
  loadSource,
  waitForReady,
  isVideoEl,
} from "@/lib/editor/media";
import { PreviewAudio } from "@/lib/editor/preview-audio";
import {
  getPreviewPrefs,
  getServerPreviewPrefs,
  setPreviewPrefs,
  subscribePreviewPrefs,
} from "@/lib/editor/preview-prefs";
import { clipsAt, sourceTimeFor, timelineLayout } from "@/lib/editor/project";
import { drawFrame } from "@/lib/editor/render";
import type { Clip, Project } from "@/lib/editor/types";

export type ClipLoadState = "loading" | "ready" | "error";

/** Preview speeds. A review tool, not an edit: none of this is stored in the
 *  project or reaches the export. */
export const PREVIEW_RATES = [0.25, 0.5, 1, 1.5, 2] as const;
export type PreviewRate = (typeof PREVIEW_RATES)[number];

/**
 * The moving parts of the studio that aren't the document: the decoders, the
 * playhead, the mixer, and the loop that paints the canvas.
 *
 * Kept out of the component tree on purpose. All of this is imperative and
 * runs at 60Hz — a `<video>` element's currentTime, a rAF loop, a canvas
 * context, a gain node — and putting any of it in React state would
 * re-render the whole editor sixty times a second to move one line. React
 * only hears about the playhead (throttled to whatever it renders at), about
 * which clips have finished loading, and about the transport settings the
 * user changes by hand; everything else is refs.
 */
export function useStudioEngine(project: Project) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Lazy state initialisers rather than refs assigned on first render: each
  // has to be created exactly once per editor, and a ref written during
  // render is both a lint error and genuinely unsafe under concurrent
  // rendering, which may throw a render away after the constructor ran.
  const [pool] = useState(() => new VideoPool());
  const [audio] = useState(() => new PreviewAudio());

  /** clip id -> object URL of the downloaded source. */
  const urlsRef = useRef(new Map<string, string>());
  const [loadState, setLoadState] = useState<Record<string, ClipLoadState>>({});

  const [time, setTimeState] = useState(0);
  const [playing, setPlaying] = useState(false);

  /* ----------------------------------------------------- transport prefs */

  const { volume, muted } = useSyncExternalStore(
    subscribePreviewPrefs,
    getPreviewPrefs,
    getServerPreviewPrefs,
  );
  const [rate, setRateState] = useState<PreviewRate>(1);
  const [loop, setLoopState] = useState(false);
  const rateRef = useRef<PreviewRate>(1);
  const loopRef = useRef(false);

  // Pushing the setting into the mixer, rather than the mixer asking for it,
  // is what keeps the gain a plain number the audio frame can read without
  // touching React at 60Hz.
  useEffect(() => {
    audio.setVolume(volume);
    audio.setMuted(muted);
  }, [audio, volume, muted]);

  const setVolume = useCallback(
    (next: number) => {
      // Reaching for the slider is how people unmute without ever thinking
      // about the mute button.
      setPreviewPrefs({ volume: next, muted: next > 0 ? false : muted });
    },
    [muted],
  );

  const setMuted = useCallback(
    (next: boolean) => setPreviewPrefs({ volume, muted: next }),
    [volume],
  );

  const toggleMuted = useCallback(() => setMuted(!muted), [muted, setMuted]);

  const setRate = useCallback(
    (next: PreviewRate) => {
      rateRef.current = next;
      setRateState(next);
      audio.setRate(next);
    },
    [audio],
  );

  const setLoop = useCallback((next: boolean) => {
    loopRef.current = next;
    setLoopState(next);
  }, []);

  /* -------------------------------------------------------- the document */

  // The loop reads these every frame and must never see a stale closure, so
  // the authoritative copies live in refs and state is only the mirror React
  // renders from.
  const timeRef = useRef(0);
  const playingRef = useRef(false);
  const projectRef = useRef(project);
  const layout = useMemo(() => timelineLayout(project), [project]);
  const layoutRef = useRef(layout);
  const duration = layout.duration;

  // Mirrored in an effect, not during render. The loop can therefore be one
  // frame behind a just-committed edit, which is 16ms of a preview and
  // invisible — whereas writing a ref while rendering breaks the moment
  // React discards and replays a render.
  useEffect(() => {
    projectRef.current = project;
    layoutRef.current = layout;
  }, [project, layout]);

  // Only the identity of the track matters: the mixer reads its volume,
  // fades and offset off the project every frame, and only a different file
  // has to be fetched and decoded again.
  useEffect(() => {
    audio.setMusic(project.music);
  }, [audio, project.music]);

  /* ------------------------------------------------------------ loading */

  // Only the identity of the clips matters here, not their trim or filters —
  // without this the effect would re-run (and re-check every source) on
  // every drag of a slider.
  const sourceSignature = project.clips
    .map((c) => `${c.id}:${c.sourceId}:${c.sourceUrl ? "1" : "0"}`)
    .join("|");

  useEffect(() => {
    const clips = projectRef.current.clips;
    const ids = new Set(clips.map((c) => c.id));
    pool.retain(ids);
    audio.retain(ids);

    let cancelled = false;

    for (const clip of clips) {
      if (urlsRef.current.has(clip.id) || !clip.sourceUrl) continue;
      setLoadState((prev) => ({ ...prev, [clip.id]: "loading" }));

      void (async () => {
        try {
          const objectUrl = await loadSource(clip.sourceId, clip.sourceUrl);
          if (cancelled) return;
          urlsRef.current.set(clip.id, objectUrl);
          const element = pool.ensure(clip.id, objectUrl, clip.kind ?? "video");
          await waitForReady(element);
          if (cancelled) return;
          // A still has no audio track to route.
          if (isVideoEl(element)) audio.attach(clip.id, element);
          setLoadState((prev) => ({ ...prev, [clip.id]: "ready" }));
        } catch {
          if (cancelled) return;
          // Left out of urlsRef so a retry (re-signing the URL from the
          // gallery) gets a fresh attempt rather than a cached failure.
          setLoadState((prev) => ({ ...prev, [clip.id]: "error" }));
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [sourceSignature, pool, audio]);

  useEffect(
    () => () => {
      pool.dispose();
      audio.dispose();
    },
    [pool, audio],
  );

  const videoFor = useCallback((clipId: string) => pool.get(clipId), [pool]);
  const objectUrlFor = useCallback((clipId: string) => urlsRef.current.get(clipId) ?? null, []);
  /** Polled by the meter from its own rAF — a level pushed through React
   *  state would re-render the editor on every frame. */
  const audioLevel = useCallback(() => audio.level(), [audio]);

  /* ----------------------------------------------------------- playback */

  /**
   * Brings every decoder in line with the playhead.
   *
   * Three jobs, and the seams between clips depend on all three:
   *
   *  - The clip on screen is held to the playhead by its playback RATE
   *    wherever possible (PREVIEW_DRIFT_SOFT) and only seeked once it has
   *    drifted past saving (PREVIEW_DRIFT_TOLERANCE). A seek stalls the
   *    decoder and clicks the audio; a 2% rate change does neither.
   *  - Clips about to arrive are parked on their first frame in advance, so
   *    a cut shows the incoming clip's opening frame and not whatever its
   *    element was last left on.
   *  - Everything else is paused.
   *
   * While paused the tolerance is tight instead, because a scrub has to land
   * on the frame the user pointed at.
   */
  const syncVideos = useCallback(
    (t: number, isPlaying: boolean) => {
      const visible = new Set(clipsAt(layoutRef.current, t).map((p) => p.clip.id));

      for (const placed of layoutRef.current.placed) {
        const video = pool.get(placed.clip.id);
        if (!video) continue;
        // A still has no playhead: nothing to seek, pause or rate-limit, and
        // it is already showing the only frame it will ever show.
        if (!isVideoEl(video)) continue;

        if (!visible.has(placed.clip.id)) {
          if (!video.paused) video.pause();

          // Preroll: the next clip along, parked on the frame the cut will
          // land on. Guarded by `seeking` because this runs 60 times a
          // second and re-issuing a seek that is still in flight is how a
          // decoder ends up thrashing instead of arriving.
          const until = placed.start - t;
          if (
            isPlaying &&
            until > 0 &&
            until <= PREVIEW_PREROLL_SECONDS &&
            !video.seeking &&
            Math.abs(video.currentTime - placed.clip.in) > 0.05
          ) {
            video.currentTime = placed.clip.in;
          }
          continue;
        }

        const target = sourceTimeFor(placed, t);
        // The clip's own speed is an edit and ships in the export; the
        // preview rate is a review setting layered on top of it.
        const base = placed.clip.speed * rateRef.current;

        if (isPlaying) {
          const drift = video.currentTime - target;
          if (Math.abs(drift) > PREVIEW_DRIFT_TOLERANCE) {
            video.currentTime = target;
            video.playbackRate = base;
          } else if (Math.abs(drift) > PREVIEW_DRIFT_SOFT) {
            // Ahead of the playhead: run fractionally slow until it catches
            // down. Behind: run fractionally fast.
            video.playbackRate = base * (1 + (drift > 0 ? -1 : 1) * PREVIEW_DRIFT_NUDGE);
          } else {
            video.playbackRate = base;
          }
          if (video.paused) video.play().catch(() => {});
        } else {
          video.playbackRate = base;
          if (!video.paused) video.pause();
          if (Math.abs(video.currentTime - target) > 0.02) video.currentTime = target;
        }
      }
    },
    [pool],
  );

  const seek = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(next, layoutRef.current.duration));
      timeRef.current = clamped;
      setTimeState(clamped);
      syncVideos(clamped, playingRef.current);
      // Music is a buffer running on its own clock: a jump in the playhead
      // means the node has to be restarted somewhere else in the file.
      audio.seeked(playingRef.current);
    },
    [syncVideos, audio],
  );

  const pause = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    pool.pauseAll();
    audio.pause();
  }, [pool, audio]);

  const play = useCallback(() => {
    if (layoutRef.current.duration <= 0) return;
    // Pressing play at the very end restarts rather than doing nothing —
    // "nothing happens" is indistinguishable from a broken button.
    if (timeRef.current >= layoutRef.current.duration - 0.05) {
      timeRef.current = 0;
      setTimeState(0);
    }
    playingRef.current = true;
    setPlaying(true);
    // This click is the user gesture browsers require before a page may make
    // a sound, so the audio graph is opened here and nowhere else.
    void audio.resume();
    syncVideos(timeRef.current, true);
  }, [syncVideos, audio]);

  const toggle = useCallback(() => {
    if (playingRef.current) pause();
    else play();
  }, [pause, play]);

  /* ----------------------------------------------------- the draw loop */

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      // Scaled by the preview rate so the playhead, the decoders and the
      // mixer all agree about how fast time is passing.
      const delta = ((now - last) / 1000) * rateRef.current;
      last = now;

      if (playingRef.current) {
        const end = layoutRef.current.duration;
        const next = timeRef.current + delta;
        if (next >= end) {
          if (loopRef.current && end > 0) {
            // Round again without stopping. The music node has to be
            // restarted from the top, which is what `seeked` arranges.
            timeRef.current = 0;
            audio.seeked(true);
          } else {
            timeRef.current = end;
            playingRef.current = false;
            setPlaying(false);
            pool.pauseAll();
            audio.pause();
          }
        } else {
          timeRef.current = next;
        }
        setTimeState(timeRef.current);
        syncVideos(timeRef.current, playingRef.current);
      }

      // Runs while paused too: that is what pulls the gains down to silence
      // after a stop instead of leaving the last frame's level hanging.
      audio.frame(projectRef.current, layoutRef.current, timeRef.current, playingRef.current);

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d", { alpha: false });
      if (ctx) {
        drawFrame(
          ctx,
          projectRef.current,
          timeRef.current,
          (clip: Clip) => pool.get(clip.id),
          layoutRef.current,
        );
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pool, syncVideos, audio]);

  // A trim or a delete can leave the playhead past the end of the timeline,
  // which would freeze the preview on a frame that no longer exists.
  useEffect(() => {
    if (timeRef.current > duration) seek(duration);
  }, [duration, seek]);

  return {
    canvasRef,
    time,
    playing,
    duration,
    layout,
    loadState,
    play,
    pause,
    toggle,
    seek,
    videoFor,
    objectUrlFor,
    /* sound */
    volume,
    setVolume,
    muted,
    toggleMuted,
    audioLevel,
    /* review */
    rate,
    setRate,
    loop,
    setLoop,
  };
}
