"use client";

import { useEffect, useRef, type RefObject } from "react";
import {
  Gauge,
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";

import {
  DropdownContent,
  DropdownItem,
  DropdownRoot,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { Tooltip } from "@/components/ui/tooltip";
import { formatTimecode } from "@/lib/editor/project";
import { canvasSize, type Project } from "@/lib/editor/types";
import { cn } from "@/lib/utils";
import { PREVIEW_RATES, type PreviewRate } from "./use-studio-engine";

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
  volume,
  onVolumeChange,
  muted,
  onToggleMuted,
  audioLevel,
  rate,
  onRateChange,
  loop,
  onLoopChange,
  emptyHint,
}: {
  project: Project;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  time: number;
  duration: number;
  playing: boolean;
  onToggle: () => void;
  onSeek: (time: number) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  muted: boolean;
  onToggleMuted: () => void;
  audioLevel: () => number;
  rate: PreviewRate;
  onRateChange: (rate: PreviewRate) => void;
  loop: boolean;
  onLoopChange: (loop: boolean) => void;
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

      {/* One row on a laptop, two on a phone: the scrub bar is sent to its
          own full-width line below sm (`order-last basis-full`) because a
          range input squeezed in beside eight buttons at 375px is not a
          scrub bar anyone can hit. */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle px-3 py-2.5 sm:flex-nowrap sm:gap-3 sm:px-4">
        <div className="flex items-center gap-1 sm:gap-2">
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
        </div>

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
          className={cn(
            "h-1 min-w-0 cursor-pointer appearance-none rounded-full bg-line accent-[var(--color-brand)] disabled:opacity-30",
            "order-last w-full basis-full sm:order-none sm:w-auto sm:flex-1 sm:basis-auto",
          )}
        />

        <span className="shrink-0 font-mono text-caption text-muted tabular-nums">
          {formatTimecode(time)} / {formatTimecode(duration)}
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:ml-0">
          <Tooltip content={loop ? "Loop is on (Shift+L)" : "Loop playback (Shift+L)"}>
            <button
              type="button"
              onClick={() => onLoopChange(!loop)}
              disabled={empty}
              aria-label="Loop playback"
              aria-pressed={loop}
              className={cn(
                "rounded-lg p-1.5 transition-colors disabled:opacity-30",
                loop ? "bg-brand/15 text-brand" : "text-muted hover:bg-white/5 hover:text-ink",
              )}
            >
              <Repeat className="size-4" />
            </button>
          </Tooltip>

          <SpeedMenu rate={rate} onRateChange={onRateChange} disabled={empty} />

          <VolumeControl
            volume={volume}
            onVolumeChange={onVolumeChange}
            muted={muted}
            onToggleMuted={onToggleMuted}
            audioLevel={audioLevel}
            playing={playing && !muted}
            disabled={empty}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- speed menu */

function SpeedMenu({
  rate,
  onRateChange,
  disabled,
}: {
  rate: PreviewRate;
  onRateChange: (rate: PreviewRate) => void;
  disabled: boolean;
}) {
  return (
    <DropdownRoot>
      <Tooltip content="Preview speed — the export is unaffected">
        <DropdownTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label={`Preview speed, currently ${rate}x`}
            className={cn(
              "flex items-center gap-1 rounded-lg px-1.5 py-1.5 transition-colors disabled:opacity-30",
              rate === 1 ? "text-muted hover:bg-white/5 hover:text-ink" : "bg-brand/15 text-brand",
            )}
          >
            <Gauge className="size-4" />
            <span className="font-mono text-caption tabular-nums">{rate}×</span>
          </button>
        </DropdownTrigger>
      </Tooltip>
      <DropdownContent align="end" side="top" className="min-w-[140px]">
        {PREVIEW_RATES.map((option) => (
          <DropdownItem
            key={option}
            onSelect={() => onRateChange(option)}
            className={cn("py-2", option === rate && "text-brand")}
          >
            {option}× {option === 1 ? "· Normal" : null}
          </DropdownItem>
        ))}
      </DropdownContent>
    </DropdownRoot>
  );
}

/* ---------------------------------------------------------------- volume */

function VolumeControl({
  volume,
  onVolumeChange,
  muted,
  onToggleMuted,
  audioLevel,
  playing,
  disabled,
}: {
  volume: number;
  onVolumeChange: (volume: number) => void;
  muted: boolean;
  onToggleMuted: () => void;
  audioLevel: () => number;
  playing: boolean;
  disabled: boolean;
}) {
  const silent = muted || volume <= 0;
  return (
    <div className="flex items-center gap-1.5">
      <Tooltip content={silent ? "Unmute (M)" : "Mute (M)"}>
        <button
          type="button"
          onClick={onToggleMuted}
          disabled={disabled}
          aria-label={silent ? "Unmute preview" : "Mute preview"}
          aria-pressed={silent}
          className={cn(
            "rounded-lg p-1.5 transition-colors disabled:opacity-30",
            silent ? "text-accent hover:bg-white/5" : "text-muted hover:bg-white/5 hover:text-ink",
          )}
        >
          {silent ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      </Tooltip>

      <LevelMeter getLevel={audioLevel} active={playing && !disabled} />

      {/* Hidden on a phone, where the row has no width to spare and the
          device's own volume keys are right there. */}
      <input
        type="range"
        min={0}
        max={1.5}
        step={0.01}
        value={silent ? 0 : volume}
        onChange={(e) => onVolumeChange(Number(e.target.value))}
        disabled={disabled}
        aria-label="Preview volume"
        className="hidden h-1 w-16 cursor-pointer appearance-none rounded-full bg-line accent-[var(--color-brand)] disabled:opacity-30 md:block"
      />
    </div>
  );
}

/**
 * A live output meter.
 *
 * Reads the mixer from its own animation frame and writes straight to the
 * DOM — routing a 60Hz level through React state would re-render the whole
 * editor for a 4px bar, which is exactly what the engine's refs exist to
 * avoid.
 *
 * It is fed from the master bus, so it shows what is actually leaving the
 * editor: mutes, fades and clip volumes included. That makes it the fastest
 * answer to "is this clip silent, or is my machine?".
 */
function LevelMeter({ getLevel, active }: { getLevel: () => number; active: boolean }) {
  const fillRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fill = fillRef.current;
    if (!fill) return;

    if (!active) {
      fill.style.transform = "scaleY(0)";
      return;
    }

    let raf = 0;
    let smoothed = 0;
    const tick = () => {
      const level = getLevel();
      // Instant rise, slow fall. A meter that drops as fast as it climbs
      // reads as a flicker rather than as a level.
      smoothed = level > smoothed ? level : smoothed * 0.86 + level * 0.14;
      fill.style.transform = `scaleY(${smoothed.toFixed(3)})`;
      fill.style.backgroundColor =
        smoothed > 0.95 ? "var(--color-accent-hot)" : "var(--color-brand)";
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getLevel, active]);

  return (
    <span
      className="relative hidden h-5 w-1 overflow-hidden rounded-full bg-line sm:block"
      aria-hidden="true"
    >
      <span
        ref={fillRef}
        className="absolute inset-x-0 bottom-0 h-full origin-bottom rounded-full bg-brand"
        style={{ transform: "scaleY(0)" }}
      />
    </span>
  );
}
