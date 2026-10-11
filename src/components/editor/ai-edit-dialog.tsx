"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pause, Play, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { useInvalidateCredits, useUsage } from "@/hooks/use-credits";
import { estimateVideoCredits, VIDEO_EDIT_MODEL_ID } from "@/lib/credit-estimate";
import {
  editWindow,
  prepareAiEditClip,
  submitAiEdit,
  type AiEditJob,
  type AiEditMode,
  type AiEditRequest,
  type AiEditResolution,
  type CropRect,
} from "@/lib/editor/ai-edit";
import { loadSource } from "@/lib/editor/media";
import { formatTimecode } from "@/lib/editor/project";
import { AI_EDIT_MAX_SECONDS, AI_EDIT_MIN_SECONDS, type Clip } from "@/lib/editor/types";
import { isResolutionLocked } from "@/lib/tier-limits";
import { cn } from "@/lib/utils";
import { Field, Segmented, SliderRow } from "./controls";

/** Mirrors VIDEO_EDIT_PROMPT_MAX_LENGTH in the API's lib/video-edit.ts. */
const PROMPT_MAX_LENGTH = 2000;
/** The stretch the dialog opens on, before the user drags it longer. */
const DEFAULT_LENGTH = 5;
/** Smallest box, per side, as a fraction of the frame. Below this a drag is
 *  read as a click, and the model would be handed a sliver to redraw. */
const MIN_REGION = 0.04;

/**
 * Where an AI edit is set up: which seconds, optionally which part of the
 * frame, and what should change there.
 *
 * Works on the clip's SOURCE, not on the timeline canvas. The canvas shows
 * the clip after its fit, zoom, pan and Ken Burns drift — a box drawn there
 * would mean a different part of the footage on every frame — while the
 * model is sent the footage itself. So the box is drawn over the footage, in
 * the footage's own coordinates.
 */
export function AiEditDialog({
  open,
  onOpenChange,
  clip,
  initialTime,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clip: Clip | null;
  /** Where to start the stretch, in the clip's SOURCE seconds. */
  initialTime: number;
  onSubmitted: (job: AiEditJob) => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Edit with AI"
      description={`Pick up to ${AI_EDIT_MAX_SECONDS} seconds and describe what should change.`}
      className="max-w-4xl"
    >
      {/* Mounted per opening, so every field starts from this clip and this
          playhead instead of whatever the last edit left behind. */}
      {open && clip && (
        <AiEditForm
          key={clip.id}
          clip={clip}
          initialTime={initialTime}
          onDone={(job) => {
            onSubmitted(job);
            onOpenChange(false);
          }}
        />
      )}
    </Modal>
  );
}

type Busy = { label: string; progress?: number } | null;

function AiEditForm({
  clip,
  initialTime,
  onDone,
}: {
  clip: Clip;
  initialTime: number;
  onDone: (job: AiEditJob) => void;
}) {
  const { toast } = useToast();
  const invalidateCredits = useInvalidateCredits();
  const { data: usage } = useUsage();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [frame, setFrame] = useState<{ width: number; height: number } | null>(null);

  const clipLength = clip.out - clip.in;
  const maxLength = Math.min(AI_EDIT_MAX_SECONDS, clipLength);
  // Opens on a few seconds rather than the full ceiling: the price scales
  // with the length, and most fixes are a beat, not a scene.
  const [length, setLength] = useState(() => Math.min(DEFAULT_LENGTH, maxLength));
  const [start, setStart] = useState(() =>
    Math.max(clip.in, Math.min(initialTime, clip.out - Math.min(DEFAULT_LENGTH, maxLength))),
  );
  const end = start + length;

  const [mode, setMode] = useState<AiEditMode>("segment");
  const [region, setRegion] = useState<CropRect | null>(null);
  const [prompt, setPrompt] = useState("");
  const [resolution, setResolution] = useState<AiEditResolution>("720p");
  const [keepAudio, setKeepAudio] = useState(true);
  const [busy, setBusy] = useState<Busy>(null);
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(start);

  // The clip's own download, from the cache the timeline already filled.
  useEffect(() => {
    let cancelled = false;
    loadSource(clip.sourceId, clip.sourceUrl)
      .then((url) => !cancelled && setObjectUrl(url))
      .catch(() => {
        if (!cancelled) toast({ title: "Couldn't load this clip", variant: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [clip.sourceId, clip.sourceUrl, toast]);

  // Parked on the first frame of the stretch whenever it moves, so the box
  // is drawn over the moment the edit begins.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || playing || !frame) return;
    video.currentTime = start;
  }, [start, playing, frame]);

  // Loops the stretch while previewing. rAF rather than timeupdate, which
  // fires a few times a second and would overshoot the end by up to 250ms.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playing) return;
    let raf = 0;
    const tick = () => {
      if (video.currentTime >= end || video.currentTime < start - 0.1) video.currentTime = start;
      setPlayhead(video.currentTime);
      raf = requestAnimationFrame(tick);
    };
    video.currentTime = start;
    void video.play().catch(() => setPlaying(false));
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      video.pause();
    };
  }, [playing, start, end]);

  /* -------------------------------------------------------------- price */

  // What the API will bill: whole seconds, rounded up, from the encoded file.
  const billedSeconds = Math.min(
    AI_EDIT_MAX_SECONDS,
    Math.max(AI_EDIT_MIN_SECONDS, Math.ceil(length - 0.1)),
  );
  const credits = estimateVideoCredits(VIDEO_EDIT_MODEL_ID, billedSeconds, resolution, {
    hasReferenceVideo: true,
    referenceVideoSeconds: billedSeconds,
  });
  const tier = usage?.tier_info;
  const planBlocked = isResolutionLocked("720p", tier);
  const hdLocked = isResolutionLocked("1080p", tier);
  const balance = usage?.credit_balance;
  const short = typeof balance === "number" && credits > balance;

  const missing =
    prompt.trim().length < 3
      ? "Describe the change you want."
      : mode === "region" && !region
        ? "Draw a box on the video first."
        : null;

  /* ------------------------------------------------------------- submit */

  const submit = useCallback(async () => {
    if (!objectUrl || !frame) return;
    setPlaying(false);
    setBusy({ label: "Preparing the clip…", progress: 0 });
    try {
      const request: AiEditRequest = {
        mode,
        clipId: clip.id,
        sourceId: clip.sourceId,
        clipLabel: clip.label,
        start,
        end,
        prompt: prompt.trim(),
        resolution,
        keepAudio: mode === "segment" ? keepAudio : true,
        region: mode === "region" && region ? region : undefined,
      };
      const crop = request.region ? editWindow(request.region, frame) : undefined;
      const source = await (await fetch(objectUrl)).blob();
      const prepared = await prepareAiEditClip(source, request, crop?.crop, (progress) =>
        setBusy({ label: "Preparing the clip…", progress }),
      );
      setBusy({ label: "Uploading and starting…" });
      const { jobId } = await submitAiEdit(request, prepared, crop);
      invalidateCredits();
      onDone({
        ...request,
        id: jobId,
        crop: crop?.crop,
        createdAt: new Date().toISOString(),
        status: "running",
        progress: 0,
      });
      toast({
        title: "AI edit started",
        description: "Keep editing — it replaces those seconds in your timeline when it's ready.",
        variant: "success",
      });
    } catch (error) {
      setBusy(null);
      toast({
        title: "Couldn't start the AI edit",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    }
  }, [objectUrl, frame, mode, clip, start, end, prompt, resolution, keepAudio, region, invalidateCredits, onDone, toast]);

  const aspect = frame ? frame.width / frame.height : 9 / 16;

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_18rem]">
      {/* ------------------------------------------------------- footage */}
      <div className="min-w-0 space-y-3">
        <div
          className="relative mx-auto overflow-hidden rounded-xl border border-line bg-black"
          style={{ aspectRatio: `${aspect}`, width: `min(100%, calc(48vh * ${aspect}))` }}
        >
          {objectUrl && (
            <video
              ref={videoRef}
              src={objectUrl}
              muted
              playsInline
              preload="auto"
              onLoadedMetadata={(e) =>
                setFrame({ width: e.currentTarget.videoWidth, height: e.currentTarget.videoHeight })
              }
              className="absolute inset-0 size-full"
            />
          )}
          {mode === "region" && frame && (
            <RegionSelector value={region} onChange={setRegion} disabled={Boolean(busy)} />
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPlaying((v) => !v)}
            disabled={!frame || Boolean(busy)}
            aria-label={playing ? "Pause preview" : "Play the selected seconds"}
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-on-brand transition-colors hover:bg-brand-hover disabled:opacity-30"
          >
            {playing ? <Pause className="size-3.5 fill-current" /> : <Play className="ml-0.5 size-3.5 fill-current" />}
          </button>
          <RangeBar
            clipIn={clip.in}
            clipOut={clip.out}
            start={start}
            length={length}
            playhead={playing ? playhead : null}
            disabled={Boolean(busy)}
            onChange={(nextStart, nextLength) => {
              setStart(nextStart);
              setLength(nextLength);
            }}
          />
        </div>
        <p className="text-center font-mono text-caption text-muted tabular-nums">
          {formatTimecode(start)} → {formatTimecode(end)} · {length.toFixed(1)}s
        </p>
      </div>

      {/* ------------------------------------------------------ settings */}
      <div className="space-y-4">
        <Segmented<AiEditMode>
          value={mode}
          onChange={(next) => {
            setMode(next);
            setPlaying(false);
          }}
          options={[
            { value: "segment", label: "Whole frame" },
            { value: "region", label: "Selected area" },
          ]}
        />
        <p className="text-caption text-muted">
          {mode === "segment"
            ? "Regenerates every pixel of these seconds from your prompt, using the original as a guide for motion and framing."
            : "Drag a box on the video. The AI sees the whole frame with your box marked, so it knows the scene — but only what's inside the box changes, and everything outside stays exactly as filmed. The box holds still, so make it big enough for the subject as it moves."}
        </p>
        {mode === "region" && region && (
          <button
            type="button"
            onClick={() => setRegion(null)}
            className="flex items-center gap-1 text-caption text-muted transition-colors hover:text-ink-soft"
          >
            <X className="size-3" /> Clear the box
          </button>
        )}

        <SliderRow
          label="Start"
          value={start}
          min={clip.in}
          max={Math.max(clip.in, clip.out - length)}
          step={0.05}
          onChange={(value) => setStart(Math.max(clip.in, Math.min(value, clip.out - length)))}
          format={formatTimecode}
        />
        <SliderRow
          label="Length"
          value={length}
          min={Math.min(AI_EDIT_MIN_SECONDS, maxLength)}
          max={maxLength}
          step={0.1}
          onChange={(value) => {
            setLength(value);
            setStart((s) => Math.min(s, clip.out - value));
          }}
          format={(v) => `${v.toFixed(1)}s`}
        />

        <Field label="What should change?">
          <Textarea
            value={prompt}
            rows={4}
            maxLength={PROMPT_MAX_LENGTH}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              mode === "segment"
                ? "e.g. She turns to the camera, smiles and waves"
                : "e.g. Make the jacket glossy red leather"
            }
            disabled={Boolean(busy)}
          />
        </Field>

        <Field label="Quality">
          <Segmented<AiEditResolution>
            value={resolution}
            onChange={(next) => !(next === "1080p" && hdLocked) && setResolution(next)}
            options={[
              { value: "720p", label: "720p" },
              { value: "1080p", label: hdLocked ? "1080p 🔒" : "1080p", hint: hdLocked ? "Not on your plan" : undefined },
            ]}
          />
        </Field>

        {mode === "segment" && (
          <label className="flex items-center justify-between text-body-sm text-ink-soft">
            Keep the original sound
            <Switch checked={keepAudio} onCheckedChange={setKeepAudio} disabled={Boolean(busy)} />
          </label>
        )}

        <div className="space-y-2 border-t border-border-subtle pt-4">
          {planBlocked ? (
            <p className="text-caption text-muted">
              AI edits render at 720p or higher, which your plan doesn&apos;t include.{" "}
              <Link href="/settings/billing" className="text-brand-ink underline-offset-2 hover:underline">
                Upgrade to use them.
              </Link>
            </p>
          ) : (
            <p className="flex items-baseline justify-between text-caption text-muted">
              <span>Cost</span>
              <span className={cn("font-mono tabular-nums", short ? "text-accent" : "text-ink-soft")}>
                {credits} credits
                {typeof balance === "number" ? ` · ${balance} left` : ""}
              </span>
            </p>
          )}

          {busy ? (
            <div className="space-y-1.5" role="status">
              <p className="text-caption text-ink-soft">{busy.label}</p>
              <div className="h-1 overflow-hidden rounded-full bg-line">
                <div
                  className={cn("h-full rounded-full bg-brand transition-[width]", busy.progress === undefined && "w-1/3 animate-pulse")}
                  style={busy.progress !== undefined ? { width: `${Math.round(busy.progress * 100)}%` } : undefined}
                />
              </div>
            </div>
          ) : (
            <Button
              variant="accent"
              className="w-full"
              disabled={Boolean(missing) || planBlocked || short || !frame}
              onClick={() => void submit()}
              title={missing ?? undefined}
            >
              <Sparkles className="size-4" />
              Generate
            </Button>
          )}
          <p className="text-[10px] text-text-tertiary">
            {missing && !busy
              ? missing
              : "Runs in the background, usually a few minutes. The original stays in your gallery either way."}
          </p>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- range bar */

/**
 * The clip's trim as a track, with the stretch as a band on it: drag the band
 * to move it, its edges to change its length, always 2-10 seconds and always
 * inside the clip. The sliders beside it do the same for keyboard users.
 */
function RangeBar({
  clipIn,
  clipOut,
  start,
  length,
  playhead,
  disabled,
  onChange,
}: {
  clipIn: number;
  clipOut: number;
  start: number;
  length: number;
  playhead: number | null;
  disabled: boolean;
  onChange: (start: number, length: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const span = Math.max(0.001, clipOut - clipIn);
  const minLength = Math.min(AI_EDIT_MIN_SECONDS, span);
  const maxLength = Math.min(AI_EDIT_MAX_SECONDS, span);
  const pct = (t: number) => `${((t - clipIn) / span) * 100}%`;

  const begin = (event: React.PointerEvent, mode: "move" | "start" | "end") => {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    const track = trackRef.current;
    if (!track) return;
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    const width = track.getBoundingClientRect().width;
    const startX = event.clientX;
    const from = { start, end: start + length };

    const move = (e: PointerEvent) => {
      const delta = ((e.clientX - startX) / width) * span;
      if (mode === "move") {
        onChange(Math.max(clipIn, Math.min(clipOut - length, from.start + delta)), length);
      } else if (mode === "start") {
        const nextStart = Math.max(
          clipIn,
          Math.max(from.end - maxLength, Math.min(from.end - minLength, from.start + delta)),
        );
        onChange(nextStart, from.end - nextStart);
      } else {
        const nextEnd = Math.min(
          clipOut,
          Math.min(from.start + maxLength, Math.max(from.start + minLength, from.end + delta)),
        );
        onChange(from.start, nextEnd - from.start);
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

  return (
    <div
      ref={trackRef}
      className={cn("relative h-9 min-w-0 flex-1 touch-none rounded-lg bg-surface-3 select-none", disabled && "opacity-50")}
      aria-hidden="true"
    >
      <div
        className="absolute inset-y-0 cursor-grab rounded-lg border-2 border-brand-ink bg-brand/20 active:cursor-grabbing"
        style={{ left: pct(start), width: `${(length / span) * 100}%` }}
        onPointerDown={(e) => begin(e, "move")}
      >
        <div
          className="absolute inset-y-0 -left-1 w-3 cursor-ew-resize rounded-l-lg hover:bg-brand/60"
          onPointerDown={(e) => begin(e, "start")}
        />
        <div
          className="absolute inset-y-0 -right-1 w-3 cursor-ew-resize rounded-r-lg hover:bg-brand/60"
          onPointerDown={(e) => begin(e, "end")}
        />
      </div>
      {playhead !== null && (
        <div className="pointer-events-none absolute inset-y-0 w-px bg-accent-hot" style={{ left: pct(playhead) }} />
      )}
    </div>
  );
}

/* --------------------------------------------------------- region selector */

/**
 * Draw, move and resize one box over the footage. Coordinates are fractions
 * of the frame — the element sits exactly over the video, which fills it.
 */
function RegionSelector({
  value,
  onChange,
  disabled,
}: {
  value: CropRect | null;
  onChange: (rect: CropRect | null) => void;
  disabled: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  const pointAt = (e: { clientX: number; clientY: number }) => {
    const rect = rootRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  };

  /** Draws from a fixed corner to the pointer — a new box, or a resize, which
   *  is a draw anchored at the corner opposite the handle. */
  const draw = (event: React.PointerEvent, anchor: { x: number; y: number }, previous: CropRect | null) => {
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    let latest: CropRect | null = null;
    const move = (e: PointerEvent) => {
      const p = pointAt(e);
      latest = {
        x: Math.min(anchor.x, p.x),
        y: Math.min(anchor.y, p.y),
        width: Math.abs(p.x - anchor.x),
        height: Math.abs(p.y - anchor.y),
      };
      onChange(latest);
    };
    const up = () => {
      target.releasePointerCapture?.(event.pointerId);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      // A click, or a sliver: keep what was there before.
      const drawn = latest as CropRect | null;
      if (!drawn || drawn.width < MIN_REGION || drawn.height < MIN_REGION) onChange(previous);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const start = (event: React.PointerEvent) => {
    if (disabled) return;
    event.preventDefault();
    draw(event, pointAt(event), value);
  };

  const moveBox = (event: React.PointerEvent) => {
    if (disabled || !value) return;
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    const origin = pointAt(event);
    const from = value;
    const move = (e: PointerEvent) => {
      const p = pointAt(e);
      onChange({
        ...from,
        x: Math.max(0, Math.min(1 - from.width, from.x + p.x - origin.x)),
        y: Math.max(0, Math.min(1 - from.height, from.y + p.y - origin.y)),
      });
    };
    const up = () => {
      target.releasePointerCapture?.(event.pointerId);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const resize = (event: React.PointerEvent, corner: "nw" | "ne" | "sw" | "se") => {
    if (disabled || !value) return;
    event.preventDefault();
    event.stopPropagation();
    const anchor = {
      x: corner.endsWith("w") ? value.x + value.width : value.x,
      y: corner.startsWith("n") ? value.y + value.height : value.y,
    };
    draw(event, anchor, value);
  };

  return (
    <div
      ref={rootRef}
      className={cn("absolute inset-0 touch-none select-none", disabled ? "cursor-default" : "cursor-crosshair")}
      onPointerDown={start}
      role="application"
      aria-label="Draw the area to edit"
    >
      {!value && (
        <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-caption text-white/80 drop-shadow">
          Drag to select the area to change
        </p>
      )}
      {value && (
        <div
          className="absolute cursor-move border-2 border-brand shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
          style={{
            left: `${value.x * 100}%`,
            top: `${value.y * 100}%`,
            width: `${value.width * 100}%`,
            height: `${value.height * 100}%`,
          }}
          onPointerDown={moveBox}
        >
          {(["nw", "ne", "sw", "se"] as const).map((corner) => (
            <span
              key={corner}
              onPointerDown={(e) => resize(e, corner)}
              className={cn(
                "absolute size-3 rounded-full border-2 border-brand bg-surface-2",
                corner === "nw" && "-top-1.5 -left-1.5 cursor-nwse-resize",
                corner === "ne" && "-top-1.5 -right-1.5 cursor-nesw-resize",
                corner === "sw" && "-bottom-1.5 -left-1.5 cursor-nesw-resize",
                corner === "se" && "-right-1.5 -bottom-1.5 cursor-nwse-resize",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
