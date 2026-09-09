"use client";

import { useRef, useState, type ReactNode } from "react";
import { AudioLines, FileVideo, ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Building blocks for the studio's left-hand composer panel — the media.io-
 * style vertical form (model → upload → prompt → settings → generate) that
 * replaced the old bottom-docked composer bar. Everything here is layout
 * chrome only; forms keep owning their own state, validation and uploads.
 */

/** One labeled block of the panel — section title on its own line, optional
 * control (e.g. a mode switcher) right-aligned beside it, optional helper
 * text under the content. */
export function PanelSection({
  label,
  action,
  hint,
  children,
}: {
  label: string;
  action?: ReactNode;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-label font-medium text-ink-soft">{label}</span>
        {action}
      </div>
      {children}
      {hint && <p className="text-caption text-muted">{hint}</p>}
    </section>
  );
}

/** How the upload slot is being used: one image guiding the whole
 * generation, a first/last keyframe pair the video interpolates between, or
 * a clip whose motion the generation is conditioned on. The caller owns the
 * actual upload state for every slot and is responsible for clearing
 * whichever fields don't apply to the newly selected mode.
 *
 * Not every model offers all three — a form passes SegmentedTabs only the
 * modes its model actually accepts (only Seedance 2.0 takes "video" — 2.5's
 * reference videos are a separate list, not a mode). */
export type ReferenceMode = "reference" | "keyframe" | "video";

/** Compact segmented control — the panel's equivalent of the reference
 * design's sub-tabs ("Image à Vidéo / Texte à Vidéo"), used here to switch
 * the upload slot between its reference/keyframe modes. */
export function SegmentedTabs<T extends string>({
  value,
  options,
  onChange,
  renderLabel,
}: {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  renderLabel?: (value: T) => string;
}) {
  return (
    <div className="flex shrink-0 rounded-lg border border-line bg-surface-dark p-0.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "rounded-md px-2.5 py-1 text-caption font-medium transition-colors",
            opt === value ? "bg-surface-3 text-ink shadow-raised" : "text-muted hover:text-ink-soft",
          )}
        >
          {renderLabel ? renderLabel(opt) : opt}
        </button>
      ))}
    </div>
  );
}

/** The panel's prompt box — a bordered multi-line field with the character
 * count and the ⌘Enter affordance inside its own frame, rather than the
 * bar composer's borderless inline textarea. */
export function PanelPromptField({
  value,
  onChange,
  onSubmit,
  placeholder,
  maxLength,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-dark transition-colors duration-200 focus-within:border-border-strong">
      <textarea
        rows={4}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            onSubmit?.();
          }
        }}
        className="w-full resize-none bg-transparent px-3.5 pt-3 text-body-sm text-ink-soft placeholder:text-muted focus:outline-none"
      />
      <div className="flex items-center justify-between gap-2 px-3.5 pb-2.5">
        <kbd className="hidden items-center gap-1 rounded-md border border-line bg-surface-3 px-1.5 py-0.5 font-mono text-caption text-muted sm:flex">
          ⌘ Enter
        </kbd>
        {maxLength !== undefined && (
          <span className="ml-auto text-caption text-muted">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}

/** Wraps a stack of FieldRow rows in the panel's input-surface frame so the
 * settings list reads as one grouped control, not floating rows. */
export function PanelFieldList({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-line bg-surface-dark px-3.5">{children}</div>;
}

/**
 * Full-width click-or-drag image drop zone — the panel-scale version of the
 * old composer bar's 64px upload tile. Same contract (caller owns upload
 * state and the uploaded URL; this only picks the file), plus real
 * drag-and-drop, which a tile too small to drop onto never needed.
 */
export function PanelDropzone({
  label,
  sublabel,
  previewUrl,
  uploading,
  onFile,
  onRemove,
  disabled,
  disabledHint,
  compact,
  mediaKind = "image",
  badge,
  previewMode = "cover",
  className,
}: {
  label: string;
  sublabel?: string;
  previewUrl?: string | null;
  uploading?: boolean;
  onFile: (file: File) => void;
  onRemove: () => void;
  disabled?: boolean;
  disabledHint?: string;
  /** What this slot takes. Drives the file picker's filter, the resting
   * icon, and whether the preview renders as an <img>, a muted looping
   * <video>, or (for audio, which has nothing to show) the resting icon on
   * the filled surface — /api/upload accepts MP4/MOV video and MP3/WAV/M4A/
   * AAC/OGG audio alongside the image types. */
  mediaKind?: "image" | "video" | "audio";
  /** Small overlay on a filled tile — used for a reference clip's measured
   * duration, since the two timed lists share a 30s budget and a tile with
   * no number on it can't tell you which clip is eating it. */
  badge?: string;
  /** Keyframe pair tiles — shorter box, no sublabel, smaller icon. */
  compact?: boolean;
  /**
   * How an uploaded file is presented once it's there.
   *
   * `cover` (default) crops to fill — right for the composer's small tiles,
   * where a clean crop reads as a tidier grid.
   *
   * `showcase` is for surfaces where the upload IS the input (the preset
   * studio): the whole frame is shown uncropped so you can check what you're
   * about to hand the model, sitting on a blurred, dimmed copy of itself
   * instead of dead letterbox bars — a portrait photo in a landscape slot
   * otherwise leaves two black voids that read as a broken image rather than
   * a deliberate fit.
   */
  previewMode?: "cover" | "showcase";
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const hasFile = Boolean(previewUrl);
  const clickable = !disabled && !hasFile;

  return (
    <div
      className={cn(
        "group relative flex flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border-2 text-center transition-[background-color,border-color,box-shadow] duration-200",
        compact ? "h-28 px-2" : "h-36 px-4",
        hasFile
          ? "border-solid border-line bg-surface-2 shadow-glow-sm"
          : "border-dashed border-brand/25 bg-surface-2/40",
        clickable && "cursor-pointer hover:border-brand/50 hover:bg-brand/5 hover:shadow-glow-sm",
        clickable && dragOver && "border-brand/60 bg-brand/10 shadow-glow-sm",
        disabled && "cursor-not-allowed opacity-35",
        className,
      )}
      onClick={() => {
        if (clickable) inputRef.current?.click();
      }}
      onDragOver={(e) => {
        if (!clickable) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!clickable) return;
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      title={disabled ? disabledHint : undefined}
    >
      <input
        ref={inputRef}
        type="file"
        accept={
          mediaKind === "video"
            ? "video/mp4,video/quicktime"
            : mediaKind === "audio"
              ? "audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/ogg,audio/webm"
              : "image/jpeg,image/png,image/webp"
        }
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />

      {previewUrl ? (
        // Local blob: URL or already-uploaded remote URL filling a fixed
        // slot, so a plain <img> is the right tool — next/image would
        // force/crop dimensions we don't know here.
        mediaKind === "audio" ? (
          // Audio has no frame to show, so a filled slot keeps the resting
          // icon and label and just changes its own styling (solid border,
          // remove button) to read as "attached". No <audio controls>: the
          // slot is an input rather than a player, same call as video's
          // controls-off preview.
          //
          // The badge becomes a second line here rather than the corner
          // overlay it is on a picture: there is nothing to overlay, and on
          // an 80px tile a floating pill lands on top of the label.
          <>
            <span
              className={cn(
                "flex items-center justify-center rounded-full border border-brand/40 bg-brand/15 text-brand",
                compact ? "size-8" : "size-10",
              )}
            >
              <AudioLines className={compact ? "size-4" : "size-5"} aria-hidden="true" />
            </span>
            <span className="text-caption font-medium text-ink-soft">{label}</span>
            {badge && <span className="text-caption text-muted">{badge}</span>}
          </>
        ) : mediaKind === "video" ? (
          // Muted + looping so the tile reads as "this is the clip you
          // attached" at a glance; controls stay off because the slot is an
          // input, not a player. showcase's blurred backdrop isn't worth a
          // second decode of the same file, so video always covers.
          <video
            src={previewUrl}
            className="absolute inset-0 h-full w-full object-cover"
            muted
            loop
            playsInline
            autoPlay
          />
        ) : previewMode === "showcase" ? (
          <>
            {/* Blurred, dimmed copy of the same file behind the real one, so
                whatever shape it is fills the slot instead of leaving voids.
                scale-110 hides the soft edges the blur pulls in from the
                border. aria-hidden — it's the same picture twice. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-xl"
            />
            <div className="absolute inset-0 bg-surface-dark/50" aria-hidden="true" />
            {/* The framed copy sits in its own absolute layer rather than in
                the flex flow. max-h-full needs a parent with a definite
                height to resolve against — in the stacked layout the slot's
                height comes from its content, so an in-flow image resolved
                max-h to none and grew the whole card to its natural size.
                Absolute inset-0 always has the slot's height, so the image
                letterboxes to fit instead of driving the layout. */}
            <span className="absolute inset-0 flex items-center justify-center p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt=""
                className="max-h-full max-w-full rounded-lg object-contain shadow-floating ring-1 ring-white/15"
              />
            </span>
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )
      ) : (
        <>
          <span
            className={cn(
              "flex items-center justify-center rounded-full border border-brand/30 bg-brand/10 text-brand transition-colors duration-200 group-hover:border-brand/60 group-hover:bg-brand/20",
              compact ? "size-8" : "size-10",
            )}
          >
            {uploading ? (
              <span className="size-3.5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
            ) : mediaKind === "video" ? (
              <FileVideo className={compact ? "size-4" : "size-5"} aria-hidden="true" />
            ) : mediaKind === "audio" ? (
              <AudioLines className={compact ? "size-4" : "size-5"} aria-hidden="true" />
            ) : (
              <ImagePlus className={compact ? "size-4" : "size-5"} aria-hidden="true" />
            )}
          </span>
          <span className="text-caption font-medium text-ink-soft">{label}</span>
          {!compact && sublabel && <span className="text-caption text-muted">{sublabel}</span>}
        </>
      )}

      {/* Audio renders its badge inline above, so the corner pill is for the
          two kinds that actually have a frame to overlay. */}
      {hasFile && badge && mediaKind !== "audio" && (
        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/70 px-1.5 py-0.5 text-caption font-medium text-white backdrop-blur-sm">
          {badge}
        </span>
      )}

      {hasFile && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${label.toLowerCase()}`}
          // Hover-to-reveal is fine with a mouse but leaves this button
          // permanently unreachable on touch — there is no hover there, so
          // an uploaded image could never be removed on a phone. It stays
          // hidden-until-hover on pointer devices (no change to the
          // composer's look) and is always shown where hover doesn't exist.
          // focus-within covers keyboard users for the same reason.
          className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}
