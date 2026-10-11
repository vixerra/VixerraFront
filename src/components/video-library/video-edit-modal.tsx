"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Pause, Play, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import type { CropRect } from "@/lib/downscale-video";
import { cn } from "@/lib/utils";

export type EditSource = { file: File; seconds?: number };

const FULL: CropRect = { x: 0, y: 0, width: 1, height: 1 };
/** Smallest crop, as a share of each side. */
const MIN_CROP = 0.12;
const THUMBNAILS = 14;
const KEY_STEP = 0.1;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const isFull = (c: CropRect) => c.x < 0.005 && c.y < 0.005 && c.width > 0.995 && c.height > 0.995;

/** "00:13", or "00:04.5" under ten seconds where a tenth matters. */
function timecode(seconds: number): string {
  const s = Math.max(0, seconds);
  const minutes = Math.floor(s / 60);
  const rest = s - minutes * 60;
  const secs = s >= 10 ? String(Math.round(rest)).padStart(2, "0") : rest.toFixed(1).padStart(4, "0");
  return `${String(minutes).padStart(2, "0")}:${secs}`;
}

/**
 * "Edit reference": crop the frame and trim the clip before it is used.
 *
 * Opened by the reference-video slot for every clip it is handed. Skip uses
 * the clip as it is (offered only when it already fits the slot); Confirm
 * re-encodes it in the browser with the crop and the trim (lib/downscale-
 * video.ts, editVideo), or behaves like Skip when nothing was changed.
 *
 * The selection can never be longer than `maxSeconds` nor shorter than
 * `minSeconds`: dragging one end past the limit pulls the other along, so
 * whatever comes out is a clip the form accepts.
 */
export function VideoEditModal({
  source,
  minSeconds = 1,
  maxSeconds,
  onCancel,
  onSkip,
  onConfirm,
}: {
  source: EditSource | null;
  minSeconds?: number;
  maxSeconds?: number;
  onCancel: () => void;
  onSkip: () => void;
  onConfirm: (file: File, seconds: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog.Root
      open={source !== null}
      onOpenChange={(open) => {
        if (!open && !busy) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay/80 backdrop-blur-sm" />
        <Dialog.Content
          onInteractOutside={(e) => busy && e.preventDefault()}
          className={cn(
            "fixed top-1/2 left-1/2 z-[60] flex h-[min(92vh,900px)] w-[calc(100%-1.5rem)] max-w-6xl -translate-x-1/2 -translate-y-1/2 flex-col",
            "rounded-[28px] border border-line bg-surface-dark p-3 shadow-modal focus:outline-none sm:p-4",
          )}
        >
          <div className="flex items-center justify-between gap-3 px-2 pb-3">
            <Dialog.Title className="text-subheading font-semibold text-ink sm:text-heading">Edit reference</Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              disabled={busy}
              className="flex size-10 items-center justify-center rounded-full bg-white/[0.06] text-ink transition-colors hover:bg-white/[0.12] disabled:opacity-40 sm:size-12"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Drag the box to crop the frame and the yellow handles to trim the clip.
          </Dialog.Description>
          {/* Keyed by the file so a new clip starts from a fresh edit. */}
          {source && (
            <Editor
              key={`${source.file.name}-${source.file.size}-${source.file.lastModified}`}
              source={source}
              minSeconds={minSeconds}
              maxSeconds={maxSeconds}
              onSkip={onSkip}
              onConfirm={onConfirm}
              onBusyChange={setBusy}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Editor({
  source,
  minSeconds,
  maxSeconds,
  onSkip,
  onConfirm,
  onBusyChange,
}: {
  source: EditSource;
  minSeconds: number;
  maxSeconds?: number;
  onSkip: () => void;
  onConfirm: (file: File, seconds: number) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const { toast } = useToast();
  // Not revoked on unmount: StrictMode's mount-unmount-mount would revoke it
  // under the live player. The form keeps the same File alive anyway. The
  // editor is keyed by the file, so this runs once per clip.
  const [objectUrl] = useState(() => URL.createObjectURL(source.file));
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const maxSpan = maxSeconds ?? Infinity;
  const [duration, setDuration] = useState<number | undefined>(source.seconds);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [frameSize, setFrameSize] = useState<{ width: number; height: number } | null>(null);
  const [range, setRange] = useState<[number, number]>(() => [0, Math.min(source.seconds ?? maxSpan, maxSpan)]);
  const [crop, setCrop] = useState<CropRect>(FULL);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const encoding = progress !== null;

  const total = duration ?? 0;
  const [start, end] = range;
  const span = end - start;
  const minGap = Math.min(minSeconds, total || minSeconds);
  const fits = duration !== undefined && duration <= maxSpan + 0.05;
  const trimmed = duration !== undefined && (start > 0.05 || end < total - 0.05);
  const cropped = !isFull(crop);

  useEffect(() => onBusyChange(encoding), [encoding, onBusyChange]);

  // The picture is laid out at the largest size that fits the stage with its
  // own aspect, so the crop box can sit exactly on top of it.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !natural) return;
    const fit = () => {
      const { width: sw, height: sh } = stage.getBoundingClientRect();
      const ratio = natural.width / natural.height;
      const width = Math.min(sw - 48, (sh - 48) * ratio);
      setFrameSize({ width, height: width / ratio });
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [natural]);

  // Filmstrip: a row of frames drawn from a second, hidden decoder so the
  // visible player is never seeked under the user.
  useEffect(() => {
    if (!duration || !natural) return;
    let cancelled = false;
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = objectUrl;
    const height = 96;
    const width = Math.round((height * natural.width) / natural.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const seek = (t: number) =>
      new Promise<void>((resolve) => {
        const done = () => {
          video.removeEventListener("seeked", done);
          resolve();
        };
        video.addEventListener("seeked", done);
        video.currentTime = t;
        setTimeout(done, 3000);
      });
    (async () => {
      await new Promise<void>((resolve) => {
        if (video.readyState >= 1) resolve();
        else video.addEventListener("loadedmetadata", () => resolve(), { once: true });
      });
      const out: string[] = [];
      for (let i = 0; i < THUMBNAILS && !cancelled; i++) {
        await seek(((i + 0.5) / THUMBNAILS) * duration);
        if (cancelled || !ctx) break;
        ctx.drawImage(video, 0, 0, width, height);
        out.push(canvas.toDataURL("image/jpeg", 0.6));
        setThumbs([...out]);
      }
    })();
    return () => {
      cancelled = true;
      video.removeAttribute("src");
      video.load();
    };
  }, [duration, natural, objectUrl]);

  // The playhead follows the player smoothly while it plays, and playback
  // stays inside the selection: back to its start at its end.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const el = videoRef.current;
      if (el) {
        if (el.currentTime >= end || el.currentTime < start - 0.1) el.currentTime = start;
        setCurrent(el.currentTime);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, start, end]);

  function onMetadata() {
    const el = videoRef.current;
    if (!el) return;
    setNatural({ width: el.videoWidth || 16, height: el.videoHeight || 9 });
    if (source.seconds === undefined && Number.isFinite(el.duration)) {
      setDuration(el.duration);
      setRange([0, Math.min(el.duration, maxSpan)]);
    }
    el.currentTime = 0.01;
  }

  function seek(t: number) {
    const el = videoRef.current;
    const time = clamp(t, 0, total);
    if (el) el.currentTime = time;
    setCurrent(time);
  }

  function togglePlay() {
    const el = videoRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
      return;
    }
    if (el.currentTime < start || el.currentTime >= end - 0.05) el.currentTime = start;
    void el.play().then(
      () => setPlaying(true),
      () => setPlaying(false),
    );
  }

  /** Moves one end of the selection, pulling the other along past the
   *  slot's limit and holding the minimum length. */
  function moveEdge(edge: "start" | "end", t: number) {
    let [s, e] = range;
    if (edge === "start") {
      s = clamp(t, 0, Math.max(0, e - minGap));
      if (e - s > maxSpan) e = s + maxSpan;
    } else {
      e = clamp(t, Math.min(total, s + minGap), total);
      if (e - s > maxSpan) s = e - maxSpan;
    }
    setRange([s, e]);
    seek(edge === "start" ? s : Math.max(s, e - 0.05));
  }

  function timeAt(clientX: number): number {
    const rect = stripRef.current?.getBoundingClientRect();
    if (!rect || !total) return 0;
    return clamp((clientX - rect.left) / rect.width, 0, 1) * total;
  }

  function drag(e: ReactPointerEvent, onMove: (ev: PointerEvent) => void) {
    if (encoding) return;
    e.preventDefault();
    e.stopPropagation();
    if (playing) {
      videoRef.current?.pause();
      setPlaying(false);
    }
    const move = (ev: PointerEvent) => onMove(ev);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    onMove(e.nativeEvent);
  }

  function edgeKeys(edge: "start" | "end", e: KeyboardEvent) {
    const delta = e.key === "ArrowLeft" || e.key === "ArrowDown" ? -KEY_STEP : e.key === "ArrowRight" || e.key === "ArrowUp" ? KEY_STEP : 0;
    if (!delta) return;
    e.preventDefault();
    moveEdge(edge, (edge === "start" ? start : end) + delta);
  }

  /** Crop handles: which sides of the box a drag moves. */
  function cropDrag(e: ReactPointerEvent, sides: { l?: boolean; r?: boolean; t?: boolean; b?: boolean } | "move") {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    const origin = { x: e.clientX, y: e.clientY, crop };
    drag(e, (ev) => {
      const dx = (ev.clientX - origin.x) / rect.width;
      const dy = (ev.clientY - origin.y) / rect.height;
      const c = origin.crop;
      let { x, y, width, height } = c;
      if (sides === "move") {
        x = clamp(c.x + dx, 0, 1 - c.width);
        y = clamp(c.y + dy, 0, 1 - c.height);
      } else {
        if (sides.l) {
          x = clamp(c.x + dx, 0, c.x + c.width - MIN_CROP);
          width = c.width + (c.x - x);
        }
        if (sides.r) width = clamp(c.width + dx, MIN_CROP, 1 - c.x);
        if (sides.t) {
          y = clamp(c.y + dy, 0, c.y + c.height - MIN_CROP);
          height = c.height + (c.y - y);
        }
        if (sides.b) height = clamp(c.height + dy, MIN_CROP, 1 - c.y);
      }
      setCrop({ x, y, width, height });
    });
  }

  async function confirm() {
    if (!trimmed && !cropped) {
      onSkip();
      return;
    }
    videoRef.current?.pause();
    setPlaying(false);
    setProgress(0);
    try {
      const { editVideo } = await import("@/lib/downscale-video");
      const file = await editVideo(source.file, { start, end, crop: cropped ? crop : undefined }, setProgress);
      onConfirm(file, span);
    } catch (err) {
      toast({ title: "Couldn't edit the video", description: (err as Error).message, variant: "error" });
    } finally {
      setProgress(null);
    }
  }

  const pct = (t: number) => (total ? (t / total) * 100 : 0);
  const handles: { key: string; style: React.CSSProperties; sides: { l?: boolean; r?: boolean; t?: boolean; b?: boolean }; cursor: string }[] = [
    { key: "nw", style: { left: 0, top: 0 }, sides: { l: true, t: true }, cursor: "cursor-nwse-resize" },
    { key: "n", style: { left: "50%", top: 0 }, sides: { t: true }, cursor: "cursor-ns-resize" },
    { key: "ne", style: { left: "100%", top: 0 }, sides: { r: true, t: true }, cursor: "cursor-nesw-resize" },
    { key: "e", style: { left: "100%", top: "50%" }, sides: { r: true }, cursor: "cursor-ew-resize" },
    { key: "se", style: { left: "100%", top: "100%" }, sides: { r: true, b: true }, cursor: "cursor-nwse-resize" },
    { key: "s", style: { left: "50%", top: "100%" }, sides: { b: true }, cursor: "cursor-ns-resize" },
    { key: "sw", style: { left: 0, top: "100%" }, sides: { l: true, b: true }, cursor: "cursor-nesw-resize" },
    { key: "w", style: { left: 0, top: "50%" }, sides: { l: true }, cursor: "cursor-ew-resize" },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] bg-white/[0.03]">
        {/* Stage */}
        <div ref={stageRef} className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          <div
            ref={frameRef}
            className="relative"
            style={frameSize ? { width: frameSize.width, height: frameSize.height } : { visibility: "hidden" }}
          >
            <video
              ref={videoRef}
              src={objectUrl}
              className="absolute inset-0 h-full w-full"
              playsInline
              preload="auto"
              onLoadedMetadata={onMetadata}
              onPause={() => setPlaying(false)}
            />
            {/* Crop box. The huge spread shadow dims everything outside it;
                the frame clips it to the picture. */}
            <div className="absolute inset-0 overflow-hidden">
              <div
                className={cn("absolute border-[1.5px] border-white", encoding ? "cursor-default" : "cursor-move")}
                style={{
                  left: `${crop.x * 100}%`,
                  top: `${crop.y * 100}%`,
                  width: `${crop.width * 100}%`,
                  height: `${crop.height * 100}%`,
                  boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.55)",
                }}
                onPointerDown={(e) => cropDrag(e, "move")}
                onDoubleClick={() => setCrop(FULL)}
              >
                {/* Rule of thirds */}
                <span className="pointer-events-none absolute inset-y-0 left-1/3 w-px bg-white/35" />
                <span className="pointer-events-none absolute inset-y-0 left-2/3 w-px bg-white/35" />
                <span className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-white/35" />
                <span className="pointer-events-none absolute inset-x-0 top-2/3 h-px bg-white/35" />
              </div>
            </div>
            {/* Handles sit outside the clipping layer so they can overhang. */}
            <div
              className="pointer-events-none absolute"
              style={{
                left: `${crop.x * 100}%`,
                top: `${crop.y * 100}%`,
                width: `${crop.width * 100}%`,
                height: `${crop.height * 100}%`,
              }}
            >
              {handles.map((h) => (
                <span
                  key={h.key}
                  onPointerDown={(e) => cropDrag(e, h.sides)}
                  className={cn(
                    "pointer-events-auto absolute size-[22px] -translate-x-1/2 -translate-y-1/2 touch-none rounded-full bg-white shadow-[0_1px_6px_rgb(0_0_0/0.5)]",
                    h.cursor,
                  )}
                  style={h.style}
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>

          {cropped && !encoding && (
            <button
              type="button"
              onClick={() => setCrop(FULL)}
              className="absolute top-3 right-3 rounded-full bg-black/60 px-3 py-1.5 text-caption font-semibold whitespace-nowrap text-white backdrop-blur-sm hover:bg-black/80"
            >
              Reset crop
            </button>
          )}

          {encoding && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-[2px]">
              <div className="h-1.5 w-56 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${progress * 100}%` }} />
              </div>
              <p className="text-body-sm font-medium text-white">
                Preparing your clip… {Math.round(progress * 100)}%
              </p>
              <p className="text-caption text-white/60">Keep this tab open.</p>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="flex items-center gap-3 border-t border-line p-3 sm:gap-4 sm:p-4">
          <button
            type="button"
            onClick={togglePlay}
            disabled={encoding || !duration}
            aria-label={playing ? "Pause" : "Play"}
            className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/[0.07] text-ink transition-colors hover:bg-white/[0.12] disabled:opacity-40 sm:size-16"
          >
            {playing ? <Pause className="size-7 fill-current" /> : <Play className="size-7 fill-current" />}
          </button>

          <div className="relative min-w-0 flex-1 pt-3">
            {/* Playhead marker above the strip */}
            {duration !== undefined && (
              <span
                className="pointer-events-none absolute top-0 z-20 -translate-x-1/2"
                style={{ left: `${pct(current)}%` }}
                aria-hidden="true"
              >
                <span className="block size-0 border-x-[7px] border-t-[9px] border-x-transparent border-t-white" />
              </span>
            )}
            <div
              ref={stripRef}
              className="relative h-16 cursor-pointer touch-none overflow-hidden rounded-xl bg-white/[0.05] select-none sm:h-[72px]"
              onPointerDown={(e) => drag(e, (ev) => seek(timeAt(ev.clientX)))}
            >
              <div className="absolute inset-0 flex">
                {Array.from({ length: THUMBNAILS }, (_, i) => (
                  <div key={i} className="h-full min-w-0 flex-1 bg-white/[0.03]">
                    {thumbs[i] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbs[i]} alt="" className="h-full w-full object-cover" draggable={false} />
                    )}
                  </div>
                ))}
              </div>
              {duration !== undefined && (
                <>
                  {/* Outside the selection, dimmed */}
                  <div className="absolute inset-y-0 left-0 bg-black/65" style={{ width: `${pct(start)}%` }} />
                  <div className="absolute inset-y-0 right-0 bg-black/65" style={{ width: `${100 - pct(end)}%` }} />
                  {/* Playhead line */}
                  <div
                    className="pointer-events-none absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 bg-white"
                    style={{ left: `${pct(current)}%` }}
                  />
                  {/* Selection frame with its two grips */}
                  <div
                    className="pointer-events-none absolute inset-y-0 rounded-xl border-[3px] border-brand"
                    style={{ left: `${pct(start)}%`, width: `${pct(end) - pct(start)}%` }}
                  >
                    <span className="absolute bottom-1.5 left-5 rounded-md bg-black/70 px-1.5 py-0.5 text-caption font-semibold text-white tabular-nums">
                      {timecode(span)}
                    </span>
                  </div>
                  {(["start", "end"] as const).map((edge) => (
                    <span
                      key={edge}
                      role="slider"
                      tabIndex={0}
                      aria-label={edge === "start" ? "Trim start" : "Trim end"}
                      aria-valuemin={0}
                      aria-valuemax={Math.round(total * 10) / 10}
                      aria-valuenow={Math.round((edge === "start" ? start : end) * 10) / 10}
                      aria-valuetext={timecode(edge === "start" ? start : end)}
                      onKeyDown={(e) => edgeKeys(edge, e)}
                      onPointerDown={(e) => drag(e, (ev) => moveEdge(edge, timeAt(ev.clientX)))}
                      className="absolute inset-y-0 z-10 flex w-4 cursor-ew-resize items-center justify-center bg-brand focus-visible:outline-2 focus-visible:outline-white"
                      style={
                        edge === "start"
                          ? { left: `${pct(start)}%`, borderRadius: "12px 0 0 12px" }
                          : { left: `calc(${pct(end)}% - 1rem)`, borderRadius: "0 12px 12px 0" }
                      }
                    >
                      <span className="h-6 w-1 rounded-full bg-on-brand/70" />
                    </span>
                  ))}
                </>
              )}
            </div>
            {/* Exact seconds, for a cut the handles can't land on by eye.
                Each goes through moveEdge, so the limits hold here too. */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-caption text-text-tertiary tabular-nums">
              <SecondsInput
                label="Start"
                value={start}
                disabled={encoding || duration === undefined}
                onCommit={(t) => moveEdge("start", t)}
              />
              <span>
                {maxSeconds && maxSeconds !== Infinity ? `${minSeconds}-${maxSeconds}s` : ""}
              </span>
              <SecondsInput
                label="End"
                value={end}
                disabled={encoding || duration === undefined}
                onCommit={(t) => moveEdge("end", t)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onSkip}
          disabled={encoding || !fits}
          title={!fits && maxSeconds ? `This clip is longer than ${maxSeconds}s: trim it, then confirm.` : undefined}
          className="h-12 rounded-2xl bg-white/[0.07] px-6 text-body font-semibold text-ink transition-colors hover:bg-white/[0.12] disabled:opacity-40 sm:h-14 sm:px-8"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={() => void confirm()}
          disabled={encoding || duration === undefined}
          className="h-12 rounded-2xl bg-ink px-7 text-body font-semibold text-surface transition-opacity hover:opacity-90 disabled:opacity-40 sm:h-14 sm:px-10"
        >
          {encoding ? "Processing…" : "Confirm"}
        </button>
      </div>
    </div>
  );
}

/** A trim edge typed in seconds. Holds its own text while it is being
 *  typed ("3." is not a number yet) and commits on Enter or blur; the
 *  editor's own limits then decide where the edge lands, which is shown
 *  back here. */
function SecondsInput({
  label,
  value,
  disabled,
  onCommit,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  onCommit: (seconds: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const seconds = Number(draft.replace(",", "."));
    setDraft(null);
    if (Number.isFinite(seconds)) onCommit(seconds);
  };
  return (
    <label className="flex items-center gap-1.5">
      <span>{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={draft ?? value.toFixed(1)}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        className="h-8 w-16 rounded-lg border border-line bg-white/[0.05] px-2 text-right text-ink outline-none focus:border-brand disabled:opacity-40"
        aria-label={`${label}, in seconds`}
      />
      <span>s</span>
    </label>
  );
}
