"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  PREVIEW_DRIFT_TOLERANCE,
  VideoPool,
  loadSource,
  waitForReady,
  isVideoEl,
} from "@/lib/editor/media";
import { clipsAt, sourceTimeFor, timelineLayout } from "@/lib/editor/project";
import { drawFrame } from "@/lib/editor/render";
import type { Clip, Project } from "@/lib/editor/types";

export type ClipLoadState = "loading" | "ready" | "error";

/**
 * The moving parts of the studio that aren't the document: the decoders, the
 * playhead, and the loop that paints the canvas.
 *
 * Kept out of the component tree on purpose. All of this is imperative and
 * runs at 60Hz — a `<video>` element's currentTime, a rAF loop, a canvas
 * context — and putting any of it in React state would re-render the whole
 * editor sixty times a second to move one line. React only hears about the
 * playhead (throttled to whatever it renders at) and about which clips have
 * finished loading; everything else is refs.
 */
export function useStudioEngine(project: Project) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Lazy state initialiser rather than a ref assigned on first render: the
  // pool has to be created exactly once per editor, and a ref written during
  // render is both a lint error and genuinely unsafe under concurrent
  // rendering, which may throw a render away after the constructor ran.
  const [pool] = useState(() => new VideoPool());

  /** clip id -> object URL of the downloaded source. */
  const urlsRef = useRef(new Map<string, string>());
  const [loadState, setLoadState] = useState<Record<string, ClipLoadState>>({});

  const [time, setTimeState] = useState(0);
  const [playing, setPlaying] = useState(false);

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

  /* ------------------------------------------------------------ loading */

  // Only the identity of the clips matters here, not their trim or filters —
  // without this the effect would re-run (and re-check every source) on
  // every drag of a slider.
  const sourceSignature = project.clips
    .map((c) => `${c.id}:${c.sourceId}:${c.sourceUrl ? "1" : "0"}`)
    .join("|");

  useEffect(() => {
    const clips = projectRef.current.clips;
    pool.retain(new Set(clips.map((c) => c.id)));

    let cancelled = false;

    for (const clip of clips) {
      if (urlsRef.current.has(clip.id) || !clip.sourceUrl) continue;
      setLoadState((prev) => ({ ...prev, [clip.id]: "loading" }));

      void (async () => {
        try {
          const objectUrl = await loadSource(clip.sourceId, clip.sourceUrl);
          if (cancelled) return;
          urlsRef.current.set(clip.id, objectUrl);
          await waitForReady(pool.ensure(clip.id, objectUrl, clip.kind ?? "video"));
          if (cancelled) return;
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
  }, [sourceSignature, pool]);

  useEffect(
    () => () => {
      pool.dispose();
    },
    [pool],
  );

  const videoFor = useCallback((clipId: string) => pool.get(clipId), [pool]);
  const objectUrlFor = useCallback((clipId: string) => urlsRef.current.get(clipId) ?? null, []);

  /* ----------------------------------------------------------- playback */

  /**
   * Brings every decoder in line with the playhead.
   *
   * While playing, videos run on their own clock and are only nudged when
   * they drift past PREVIEW_DRIFT_TOLERANCE — correcting every frame would
   * mean a seek per frame, which stalls the decoder and looks far worse than
   * the drift being corrected. While paused the tolerance is tight, because
   * a scrub has to land on the frame the user pointed at.
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
          continue;
        }

        const target = sourceTimeFor(placed, t);
        video.playbackRate = placed.clip.speed;

        if (isPlaying) {
          if (Math.abs(video.currentTime - target) > PREVIEW_DRIFT_TOLERANCE) {
            video.currentTime = target;
          }
          if (video.paused) video.play().catch(() => {});
        } else {
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
    },
    [syncVideos],
  );

  const pause = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    pool.pauseAll();
  }, [pool]);

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
    syncVideos(timeRef.current, true);
  }, [syncVideos]);

  const toggle = useCallback(() => {
    if (playingRef.current) pause();
    else play();
  }, [pause, play]);

  /* ----------------------------------------------------- the draw loop */

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;

      if (playingRef.current) {
        const end = layoutRef.current.duration;
        const next = timeRef.current + delta;
        if (next >= end) {
          timeRef.current = end;
          playingRef.current = false;
          setPlaying(false);
          pool.pauseAll();
        } else {
          timeRef.current = next;
        }
        setTimeState(timeRef.current);
        syncVideos(timeRef.current, playingRef.current);
      }

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
  }, [pool, syncVideos]);

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
  };
}
