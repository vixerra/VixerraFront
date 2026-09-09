"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Copy, Scissors, Trash2, Type, ZoomIn, ZoomOut } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { Tooltip } from "@/components/ui/tooltip";
import { MIN_CLIP_SECONDS, formatTimecode, type TimelineLayout } from "@/lib/editor/project";
import type { Clip, Project, TextOverlay } from "@/lib/editor/types";
import { cn } from "@/lib/utils";
import type { ClipLoadState } from "./use-studio-engine";

/**
 * The timeline: where the edit is actually assembled.
 *
 * Everything here works in one unit — pixels per second — so a zoom is a
 * single number and every block, tick and playhead position derives from it.
 * The lanes are absolutely positioned rather than laid out in flow because
 * an overlapping transition genuinely overlaps: two clips share the same
 * horizontal space during a dissolve, which no flow layout will do.
 */

const MIN_PPS = 8;
const MAX_PPS = 320;
/** Reserve for the ruler plus both lanes' padding, so `fit` leaves the last
 *  clip's right trim handle reachable instead of flush against the edge. */
const FIT_PADDING_PX = 48;

export type Selection =
  | { kind: "clip"; id: string }
  | { kind: "overlay"; id: string }
  | null;

export function Timeline({
  project,
  layout,
  time,
  loadState,
  selection,
  onSelect,
  onSeek,
  onTrim,
  onReorder,
  onSplit,
  onDuplicate,
  onDeleteClip,
  onMoveOverlay,
  onAddOverlay,
}: {
  project: Project;
  layout: TimelineLayout;
  time: number;
  loadState: Record<string, ClipLoadState>;
  selection: Selection;
  onSelect: (selection: Selection) => void;
  onSeek: (time: number) => void;
  onTrim: (clipId: string, patch: Partial<Clip>) => void;
  onReorder: (from: number, to: number) => void;
  onSplit: () => void;
  onDuplicate: (clipId: string) => void;
  onDeleteClip: (clipId: string) => void;
  onMoveOverlay: (overlayId: string, patch: Partial<TextOverlay>) => void;
  onAddOverlay: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [pps, setPps] = useState(60);
  const [autoFit, setAutoFit] = useState(true);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  // Fit stays on until the user zooms by hand, so adding clips keeps the
  // whole edit visible — and then stops fighting them the moment they
  // express a preference.
  useEffect(() => {
    if (!autoFit) return;
    const el = trackRef.current;
    if (!el || layout.duration <= 0) return;
    const available = el.clientWidth - FIT_PADDING_PX;
    if (available > 0) {
      setPps(Math.max(MIN_PPS, Math.min(MAX_PPS, available / layout.duration)));
    }
  }, [autoFit, layout.duration]);

  const zoom = (factor: number) => {
    setAutoFit(false);
    setPps((current) => Math.max(MIN_PPS, Math.min(MAX_PPS, current * factor)));
  };

  const timeFromEvent = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      return Math.max(0, Math.min(layout.duration, (clientX - rect.left + el.scrollLeft) / pps));
    },
    [layout.duration, pps],
  );

  const width = Math.max(layout.duration * pps, 1);

  return (
    <div className="flex flex-col border-t border-line bg-surface-2">
      <div className="flex items-center gap-1 px-3 py-2">
        <ToolbarButton
          label="Split at playhead"
          shortcut="S"
          icon={Scissors}
          onClick={onSplit}
          disabled={project.clips.length === 0}
        />
        <ToolbarButton
          label="Add text"
          shortcut="T"
          icon={Type}
          onClick={onAddOverlay}
          disabled={layout.duration <= 0}
        />
        <div className="mx-1 h-5 w-px bg-line" />
        <ToolbarButton
          label="Duplicate clip"
          icon={Copy}
          onClick={() => selection?.kind === "clip" && onDuplicate(selection.id)}
          disabled={selection?.kind !== "clip"}
        />
        <ToolbarButton
          label="Delete clip"
          shortcut="Del"
          icon={Trash2}
          danger
          onClick={() => selection?.kind === "clip" && onDeleteClip(selection.id)}
          disabled={selection?.kind !== "clip"}
        />

        <div className="ml-auto flex items-center gap-1">
          {/* Hidden on phones — the same timecode already sits in the
              transport bar directly above, and at this width the duplicate
              wrapped the toolbar onto three lines. */}
          <span className="mr-2 hidden font-mono text-caption text-muted tabular-nums sm:inline">
            {formatTimecode(time)} / {formatTimecode(layout.duration)}
          </span>
          <ToolbarButton label="Zoom out" icon={ZoomOut} onClick={() => zoom(1 / 1.5)} />
          <ToolbarButton label="Zoom in" icon={ZoomIn} onClick={() => zoom(1.5)} />
          <button
            type="button"
            onClick={() => setAutoFit(true)}
            className={cn(
              "rounded-lg px-2 py-1 text-caption transition-colors",
              autoFit ? "text-brand" : "text-muted hover:text-ink-soft",
            )}
          >
            Fit
          </button>
        </div>
      </div>

      <div ref={trackRef} className="min-h-0 overflow-x-auto overflow-y-hidden pb-3">
        <div className="relative" style={{ width, minWidth: "100%" }}>
          <Ruler duration={layout.duration} pps={pps} onScrub={(x) => onSeek(timeFromEvent(x))} />

          <ClipLane
            project={project}
            layout={layout}
            pps={pps}
            trackRef={trackRef}
            loadState={loadState}
            selection={selection}
            dropIndex={dropIndex}
            onSelect={onSelect}
            onTrim={onTrim}
            onDropIndexChange={setDropIndex}
            onReorder={onReorder}
          />

          <OverlayLane
            project={project}
            duration={layout.duration}
            pps={pps}
            selection={selection}
            onSelect={onSelect}
            onMoveOverlay={onMoveOverlay}
          />

          {/* Drawn last so it sits over both lanes. pointer-events-none keeps
              it from swallowing clicks meant for the clip underneath. */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-accent-hot"
            style={{ left: time * pps }}
          >
            <span className="absolute -top-0.5 -left-[5px] size-2.5 rounded-full bg-accent-hot" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ ruler */

function Ruler({
  duration,
  pps,
  onScrub,
}: {
  duration: number;
  pps: number;
  onScrub: (clientX: number) => void;
}) {
  // A tick roughly every 90px, snapped to a value people count in — 0.1s
  // ticks on a tight zoom read as noise, and 7-second ticks read as random.
  const step = [0.5, 1, 2, 5, 10, 15, 30, 60].find((s) => s * pps >= 90) ?? 60;
  const ticks = Math.floor(duration / step);

  const startScrub = (event: React.PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    onScrub(event.clientX);
  };

  return (
    // Deliberately not `role="slider"`: this is a pointer-only scrub target,
    // and the playhead's real accessible control is the labelled range input
    // in the transport bar (see PreviewStage), which keyboard users reach
    // first. Two elements claiming to be the playhead would announce the
    // position twice and offer one of them no way to change it.
    <div
      className="relative h-6 cursor-ew-resize touch-none select-none border-b border-border-subtle"
      onPointerDown={startScrub}
      onPointerMove={(e) => e.buttons === 1 && onScrub(e.clientX)}
      aria-hidden="true"
    >
      {Array.from({ length: ticks + 1 }, (_, i) => (
        <span
          key={i}
          className="absolute top-0 flex h-full items-center border-l border-border-subtle pl-1 text-[10px] text-text-tertiary"
          style={{ left: i * step * pps }}
        >
          {formatTimecode(i * step)}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- clip lane */

const CLIP_LANE_HEIGHT = 72;

function ClipLane({
  project,
  layout,
  pps,
  trackRef,
  loadState,
  selection,
  dropIndex,
  onSelect,
  onTrim,
  onDropIndexChange,
  onReorder,
}: {
  project: Project;
  layout: TimelineLayout;
  pps: number;
  trackRef: React.RefObject<HTMLDivElement | null>;
  loadState: Record<string, ClipLoadState>;
  selection: Selection;
  dropIndex: number | null;
  onSelect: (selection: Selection) => void;
  onTrim: (clipId: string, patch: Partial<Clip>) => void;
  onDropIndexChange: (index: number | null) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const dragRef = useRef<{ from: number; startX: number } | null>(null);

  const beginTrim = (
    event: React.PointerEvent,
    clip: Clip,
    edge: "in" | "out",
  ) => {
    event.stopPropagation();
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);

    const startX = event.clientX;
    const startIn = clip.in;
    const startOut = clip.out;

    const move = (e: PointerEvent) => {
      // A pixel on the timeline is a timeline second / pps; the trim points
      // are in SOURCE seconds, so the delta has to be pushed back through
      // the clip's speed or trimming a 2x clip moves at half rate.
      const deltaSource = ((e.clientX - startX) / pps) * clip.speed;
      if (edge === "in") {
        const next = Math.min(
          Math.max(0, startIn + deltaSource),
          startOut - MIN_CLIP_SECONDS * clip.speed,
        );
        onTrim(clip.id, { in: next });
      } else {
        const next = Math.max(
          Math.min(clip.sourceDuration, startOut + deltaSource),
          startIn + MIN_CLIP_SECONDS * clip.speed,
        );
        onTrim(clip.id, { out: next });
      }
    };
    const up = () => {
      target.releasePointerCapture?.(event.pointerId);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const beginReorder = (event: React.PointerEvent, index: number) => {
    if (project.clips.length < 2) return;
    dragRef.current = { from: index, startX: event.clientX };

    const move = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      // Only becomes a reorder once the pointer has actually travelled —
      // otherwise every click to select a clip would register as a drag.
      if (Math.abs(e.clientX - drag.startX) < 8) return;
      onDropIndexChange(indexAtX(layout, pps, e.clientX, trackRef.current));
    };
    const up = (e: PointerEvent) => {
      const drag = dragRef.current;
      dragRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (drag && Math.abs(e.clientX - drag.startX) >= 8) {
        const to = indexAtX(layout, pps, e.clientX, trackRef.current);
        // Removing the dragged clip shifts every later index down by one, so
        // dropping to its right has to account for the gap it leaves.
        onReorder(drag.from, to > drag.from ? to - 1 : to);
      }
      onDropIndexChange(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className="relative" style={{ height: CLIP_LANE_HEIGHT }}>
      {layout.placed.length === 0 && (
        <p className="absolute inset-0 flex items-center justify-center text-body-sm text-muted">
          Add a video from your library to start your edit.
        </p>
      )}

      {layout.placed.map((placed, index) => {
        const clip = placed.clip;
        const state = loadState[clip.id] ?? (clip.sourceUrl ? "loading" : "error");
        const selected = selection?.kind === "clip" && selection.id === clip.id;

        return (
          <div
            key={clip.id}
            className={cn(
              "group absolute top-2 bottom-2 overflow-hidden rounded-lg border-2 bg-surface-3 select-none",
              selected ? "border-brand shadow-glow-sm" : "border-transparent hover:border-line",
            )}
            style={{ left: placed.start * pps, width: Math.max(14, placed.duration * pps) }}
            onPointerDown={(e) => {
              onSelect({ kind: "clip", id: clip.id });
              beginReorder(e, index);
            }}
            role="button"
            tabIndex={0}
            aria-label={`${clip.label}, ${placed.duration.toFixed(1)} seconds`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect({ kind: "clip", id: clip.id });
              }
            }}
          >
            {clip.posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={clip.posterUrl}
                alt=""
                className="pointer-events-none absolute inset-0 size-full object-cover opacity-45"
              />
            ) : null}

            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between bg-gradient-to-b from-black/50 to-black/70 p-1.5">
              <span className="truncate text-[11px] font-medium text-white/90">{clip.label}</span>
              <span className="flex items-center gap-1 font-mono text-[10px] text-white/70">
                {placed.duration.toFixed(1)}s
                {clip.speed !== 1 && <span className="text-brand">{clip.speed}x</span>}
                {state === "loading" && <Spinner size={9} className="text-brand" />}
                {state === "error" && <AlertCircle className="size-2.5 text-accent" />}
              </span>
            </div>

            {/* Transition marker: an overlapping transition is real timeline
                space, so it is shown as the band it actually occupies. */}
            {placed.transitionDuration > 0 && (
              <div
                className="pointer-events-none absolute inset-y-0 left-0 border-r border-brand/50 bg-brand/20"
                style={{ width: placed.transitionDuration * pps }}
              />
            )}

            <TrimHandle side="left" onPointerDown={(e) => beginTrim(e, clip, "in")} />
            <TrimHandle side="right" onPointerDown={(e) => beginTrim(e, clip, "out")} />
          </div>
        );
      })}

      {dropIndex !== null && (
        <div
          className="pointer-events-none absolute top-1 bottom-1 z-10 w-0.5 rounded-full bg-brand"
          style={{ left: (layout.placed[dropIndex]?.start ?? layout.duration) * pps }}
        />
      )}
    </div>
  );
}

/**
 * Which gap the pointer is over, as an insertion index.
 *
 * Measured against the scroll container rather than the lane so a timeline
 * scrolled halfway along still resolves the pointer to the right clip.
 */
function indexAtX(
  layout: TimelineLayout,
  pps: number,
  clientX: number,
  track: HTMLElement | null,
): number {
  const rect = track?.getBoundingClientRect();
  const x = rect ? clientX - rect.left + (track?.scrollLeft ?? 0) : clientX;
  const seconds = x / pps;

  const index = layout.placed.findIndex((p) => seconds < p.start + p.duration / 2);
  return index === -1 ? layout.placed.length : index;
}

function TrimHandle({
  side,
  onPointerDown,
}: {
  side: "left" | "right";
  onPointerDown: (event: React.PointerEvent) => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      role="separator"
      aria-label={side === "left" ? "Trim clip start" : "Trim clip end"}
      className={cn(
        "absolute inset-y-0 z-10 w-2 cursor-ew-resize touch-none bg-brand/0 transition-colors",
        "group-hover:bg-brand/60 hover:bg-brand",
        side === "left" ? "left-0" : "right-0",
      )}
    />
  );
}

/* ---------------------------------------------------------- overlay lane */

function OverlayLane({
  project,
  duration,
  pps,
  selection,
  onSelect,
  onMoveOverlay,
}: {
  project: Project;
  duration: number;
  pps: number;
  selection: Selection;
  onSelect: (selection: Selection) => void;
  onMoveOverlay: (overlayId: string, patch: Partial<TextOverlay>) => void;
}) {
  const begin = (
    event: React.PointerEvent,
    overlay: TextOverlay,
    mode: "move" | "start" | "end",
  ) => {
    event.stopPropagation();
    event.preventDefault();
    onSelect({ kind: "overlay", id: overlay.id });

    const startX = event.clientX;
    const from = { start: overlay.start, end: overlay.end };
    const MIN = 0.3;

    const move = (e: PointerEvent) => {
      const delta = (e.clientX - startX) / pps;
      if (mode === "move") {
        const span = from.end - from.start;
        const start = Math.max(0, Math.min(duration - span, from.start + delta));
        onMoveOverlay(overlay.id, { start, end: start + span });
      } else if (mode === "start") {
        onMoveOverlay(overlay.id, {
          start: Math.max(0, Math.min(from.end - MIN, from.start + delta)),
        });
      } else {
        onMoveOverlay(overlay.id, {
          end: Math.min(duration, Math.max(from.start + MIN, from.end + delta)),
        });
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className="relative mt-1 h-8 border-t border-border-subtle">
      {project.overlays.length === 0 ? (
        <p className="absolute inset-0 flex items-center pl-2 text-[10px] text-text-tertiary">
          Text track
        </p>
      ) : null}

      {project.overlays.map((overlay) => {
        const selected = selection?.kind === "overlay" && selection.id === overlay.id;
        return (
          <div
            key={overlay.id}
            className={cn(
              "absolute top-1 bottom-1 flex items-center overflow-hidden rounded-md border px-2 select-none",
              selected
                ? "border-accent-amber bg-accent-amber/20"
                : "border-accent-amber/40 bg-accent-amber/10 hover:border-accent-amber/70",
            )}
            style={{
              left: overlay.start * pps,
              width: Math.max(18, (overlay.end - overlay.start) * pps),
            }}
            onPointerDown={(e) => begin(e, overlay, "move")}
            role="button"
            tabIndex={0}
            aria-label={`Text: ${overlay.text}`}
          >
            <span className="truncate text-[10px] text-accent-amber">
              {overlay.text || "Text"}
            </span>
            <div
              onPointerDown={(e) => begin(e, overlay, "start")}
              className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize touch-none hover:bg-accent-amber"
              role="separator"
              aria-label="Text start"
            />
            <div
              onPointerDown={(e) => begin(e, overlay, "end")}
              className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize touch-none hover:bg-accent-amber"
              role="separator"
              aria-label="Text end"
            />
          </div>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------- toolbar */

function ToolbarButton({
  label,
  shortcut,
  icon: Icon,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  shortcut?: string;
  icon: typeof Scissors;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Tooltip content={shortcut ? `${label} (${shortcut})` : label}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={cn(
          "rounded-lg p-2 transition-colors disabled:pointer-events-none disabled:opacity-30",
          danger
            ? "text-muted hover:bg-accent/10 hover:text-accent"
            : "text-muted hover:bg-white/5 hover:text-ink",
        )}
      >
        <Icon className="size-4" />
      </button>
    </Tooltip>
  );
}
