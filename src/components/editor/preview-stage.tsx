"use client";

import { type RefObject } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";

import { Tooltip } from "@/components/ui/tooltip";
import { formatTimecode } from "@/lib/editor/project";
import { canvasSize, type Project } from "@/lib/editor/types";
import { cn } from "@/lib/utils";

/**
 * The canvas the edit plays on, and the transport under it.
 *
 * The canvas is sized in real pixels at a fixed 540-on-the-short-side and
 * then scaled DOWN by CSS to fit whatever space the layout gives it. That
 * separation is the whole trick behind the preview matching the export: every
 * position in the project is a fraction of the frame, so the same numbers
 * paint the same picture at 540 and at 1080, and the only thing that changes
 * between preview and export is how many pixels each fraction lands on.
 *
 * Rendering at 540 rather than at the export size is a deliberate cost
 * decision — a 1080x1920 canvas redrawn sixty times a second with blur
 * filters on it will drop frames on a laptop, and nobody is judging colour
 * grading at preview resolution anyway.
 */
const PREVIEW_QUALITY = "540" as const;

export function PreviewStage({
  project,
  canvasRef,
  time,
  duration,
  playing,
  onToggle,
  onSeek,
  emptyHint,
}: {
  project: Project;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  time: number;
  duration: number;
  playing: boolean;
  onToggle: () => void;
  onSeek: (time: number) => void;
  emptyHint?: string;
}) {
  const { width, height } = canvasSize(project.aspect, PREVIEW_QUALITY);
  const empty = project.clips.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        <div className="relative flex h-full max-h-full items-center justify-center">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            // The intrinsic size above is the drawing surface; these two keep
            // it inside the pane without distorting it, since the element's
            // own aspect ratio comes from those attributes.
            className={cn(
              "max-h-full max-w-full rounded-xl border border-line bg-black object-contain shadow-floating",
              empty && "opacity-40",
            )}
            style={{ aspectRatio: `${width} / ${height}` }}
            aria-label="Edit preview"
          />

          {empty && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
              <p className="max-w-[22ch] text-center text-body-sm text-muted">
                {emptyHint ?? "Add a video to see it here."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tighter gutters on a phone: at 375px the default spacing plus the
          range input's intrinsic ~129px min-width pushed the timecode off
          the right edge. */}
      <div className="flex items-center gap-2 border-t border-border-subtle px-3 py-2.5 sm:gap-3 sm:px-4">
        <Tooltip content="Back to start (Home)">
          <button
            type="button"
            onClick={() => onSeek(0)}
            disabled={empty}
            aria-label="Back to start"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-ink disabled:opacity-30"
          >
            <SkipBack className="size-4" />
          </button>
        </Tooltip>

        <Tooltip content={playing ? "Pause (Space)" : "Play (Space)"}>
          <button
            type="button"
            onClick={onToggle}
            disabled={empty}
            aria-label={playing ? "Pause" : "Play"}
            className={cn(
              "flex size-9 items-center justify-center rounded-full transition-colors",
              "bg-brand text-on-brand hover:bg-brand-hover disabled:opacity-30",
            )}
          >
            {playing ? (
              <Pause className="size-4 fill-current" />
            ) : (
              <Play className="ml-0.5 size-4 fill-current" />
            )}
          </button>
        </Tooltip>

        <Tooltip content="To end (End)">
          <button
            type="button"
            onClick={() => onSeek(duration)}
            disabled={empty}
            aria-label="To end"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-ink disabled:opacity-30"
          >
            <SkipForward className="size-4" />
          </button>
        </Tooltip>

        {/* A plain range input rather than the app's Slider: this is a scrub
            bar that has to stay usable at a 1px step over a 30-second
            timeline, and it carries the playhead's accessible semantics for
            keyboard users, which the timeline's own pointer-driven ruler
            cannot. */}
        <input
          type="range"
          min={0}
          max={Math.max(0.1, duration)}
          step={0.01}
          value={Math.min(time, duration)}
          onChange={(e) => onSeek(Number(e.target.value))}
          disabled={empty}
          aria-label="Playhead"
          // min-w-0 is load-bearing: a range input's default min-width is
          // its intrinsic size, so flex-1 alone will not let it shrink and
          // the whole row overflows on narrow screens.
          className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-line accent-[var(--color-brand)] disabled:opacity-30"
        />

        <span className="shrink-0 font-mono text-caption text-muted tabular-nums">
          {formatTimecode(time)} / {formatTimecode(duration)}
        </span>
      </div>
    </div>
  );
}
