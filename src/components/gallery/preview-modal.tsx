"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FolderMinus,
  FolderPlus,
  Globe,
  Image as ImageIcon,
  Info,
  Lock,
  RefreshCw,
  Scissors,
  Share2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { cn, formatDate } from "@/lib/utils";
import { downloadGenerationResult } from "@/lib/download";
import { PublishButton } from "@/components/social/publish-button";
import { IMAGE_MODELS, SEEDANCE_DURATION_AUTO, VIDEO_MODELS } from "@/lib/constants";
import { EDIT_GENERATION_MODEL } from "@/lib/editor/types";
import { itemLabel, type GalleryItem } from "./generation-card";
import { appHref } from "@/lib/hosts";

export type PreviewAuthor = { name: string; avatarUrl: string | null };

function Avatar({ author, fallback }: { author?: PreviewAuthor; fallback: string }) {
  // Avatar URLs are arbitrary user-supplied hosts (see the profile form),
  // which next/image's remotePatterns allowlist can't cover — plain <img> is
  // the only option that works.
  return author?.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={author.avatarUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-3 text-label font-semibold text-ink-soft">
      {fallback}
    </span>
  );
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  completed: "success",
  processing: "brand",
  queued: "neutral",
  pending: "neutral",
  failed: "accent",
};

function modelLabel(id: string) {
  // A studio edit has no model behind it, so it is not in either catalogue —
  // without this the details panel would show the raw internal id.
  if (id === EDIT_GENERATION_MODEL) return "Editing studio";
  const match = [...VIDEO_MODELS, ...IMAGE_MODELS].find((m) => m.id === id);
  return match?.label ?? id;
}

function prettyType(type: string) {
  return type.replace(/-/g, " ");
}

// Parameters that are URLs to uploaded inputs, or that the panel already
// shows in its own row — a raw signed URL in a details table is noise.
const HIDDEN_PARAM_KEYS = new Set([
  "prompt",
  "negativePrompt",
  "seed",
  "image",
  "images",
  "lastFrameImage",
  "referenceImages",
  "video",
  "audio",
  "maskImage",
]);

const PARAM_LABELS: Record<string, string> = {
  duration: "Duration",
  resolution: "Quality",
  size: "Size",
  imageSize: "Resolution",
  aspectRatio: "Aspect ratio",
  outputFormat: "Format",
  generateAudio: "Audio",
  watermark: "Watermark",
  cameraFixed: "Fixed camera",
  useVirtualAvatar: "Virtual avatar",
  numOutputs: "Outputs",
};

function paramLabel(key: string) {
  return (
    PARAM_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())
  );
}

function paramValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "On" : "Off";
  if (typeof value === "object") return null;
  if (key === "duration") {
    const seconds = Number(value);
    if (Number.isFinite(seconds)) {
      return seconds === SEEDANCE_DURATION_AUTO ? "Auto" : `${seconds}s`;
    }
  }
  return String(value);
}

/** Deep-link back into the generator with this item's settings pre-filled —
 *  the same ?model=&prompt=&duration=&resolution=&aspectRatio= contract the
 *  landing-page "try this prompt" links use (see generate-workspace.tsx). */
function recreateHref(item: GalleryItem) {
  const params = new URLSearchParams({ model: item.model });
  if (item.prompt) params.set("prompt", item.prompt);
  const source = item.parameters ?? {};
  for (const key of ["duration", "resolution", "aspectRatio"] as const) {
    const value = source[key];
    if (value !== null && value !== undefined && typeof value !== "object") {
      params.set(key, String(value));
    }
  }
  return `/generate?${params.toString()}`;
}

export function PreviewModal({
  items,
  index,
  author,
  viewerIsOwner = false,
  onClose,
  onNavigate,
  onDelete,
  onDuplicate,
  onAddToCollection,
  onRemoveFromCollection,
  onTogglePublic,
}: {
  items: GalleryItem[];
  index: number | null;
  author?: PreviewAuthor;
  /** True when the signed-in viewer made these — see the header note in
   *  PreviewBody for why the creator gets a different identity block. */
  viewerIsOwner?: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  /** Resolves false when the user declined the confirmation, so the panel
   *  knows to stay open. */
  onDelete?: () => void | Promise<boolean | void>;
  onDuplicate?: () => void;
  onAddToCollection?: () => void;
  onRemoveFromCollection?: () => void;
  onTogglePublic?: () => void;
}) {
  if (index === null) return null;
  const item = items[index];
  if (!item) return null;

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay/95 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-0 z-[60] flex flex-col gap-3 overflow-y-auto p-3 outline-none lg:inset-6 lg:flex-row lg:gap-6 lg:overflow-hidden lg:p-0">
          <PreviewBody
            key={item.id}
            item={item}
            index={index}
            total={items.length}
            author={author}
            viewerIsOwner={viewerIsOwner}
            onClose={onClose}
            onNavigate={onNavigate}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onAddToCollection={onAddToCollection}
            onRemoveFromCollection={onRemoveFromCollection}
            onTogglePublic={onTogglePublic}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PreviewBody({
  item,
  index,
  total,
  author,
  viewerIsOwner,
  onClose,
  onNavigate,
  onDelete,
  onDuplicate,
  onAddToCollection,
  onRemoveFromCollection,
  onTogglePublic,
}: {
  item: GalleryItem;
  index: number;
  total: number;
  author?: PreviewAuthor;
  viewerIsOwner?: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  /** Resolves false when the user declined the confirmation, so the panel
   *  knows to stay open. */
  onDelete?: () => void | Promise<boolean | void>;
  onDuplicate?: () => void;
  onAddToCollection?: () => void;
  onRemoveFromCollection?: () => void;
  onTogglePublic?: () => void;
}) {
  const { toast } = useToast();
  const [promptOpen, setPromptOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  // A signed link expires (six hours, see toViewableInputUrl), and a panel
  // left open outlives that — so the source thumbnail takes itself out
  // rather than leaving a broken frame behind. Reset per item by the key on
  // this component.
  const [sourceImageBroken, setSourceImageBroken] = useState(false);
  const isVideo = item.type !== "text-to-image";
  // The creator's own reference upload, not the piece they published, so
  // the API only signs it into a loadable link on their own surfaces — on
  // the community feed it stays a reference an <img> would break on. Gated
  // on the same flag rather than on presence for exactly that reason.
  const sourceImageUrl = viewerIsOwner ? (item.inputImageUrl ?? null) : null;
  // Whether /editor can actually open this one — owner, finished, and with
  // a file behind it. Stills count: the timeline holds image clips as well
  // as video (ClipKind in lib/editor/types.ts), they just take a chosen
  // length instead of one the decoder reports.
  const canEditInStudio =
    viewerIsOwner && item.status === "completed" && Boolean(item.resultUrl);
  const hasPrev = index > 0;
  const hasNext = index < total - 1;

  // Arrow keys walk the gallery without reaching for the on-screen chevrons.
  // Escape is already handled by Radix.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft" && hasPrev) onNavigate(index - 1);
      if (event.key === "ArrowRight" && hasNext) onNavigate(index + 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, hasPrev, hasNext, onNavigate]);

  const details: { label: string; value: string }[] = [
    { label: "Model", value: modelLabel(item.model) },
    { label: "Type", value: prettyType(item.type) },
  ];
  for (const [key, value] of Object.entries(item.parameters ?? {})) {
    if (HIDDEN_PARAM_KEYS.has(key)) continue;
    const formatted = paramValue(key, value);
    if (formatted !== null) details.push({ label: paramLabel(key), value: formatted });
  }
  if (item.seed !== null && item.seed !== undefined) {
    details.push({ label: "Seed", value: String(item.seed) });
  }
  if (item.costCredits !== undefined) {
    details.push({ label: "Cost", value: `${item.costCredits} credits` });
  }
  if (item.processingTimeSeconds) {
    details.push({ label: "Render time", value: `${item.processingTimeSeconds}s` });
  }
  if (item.createdAt) {
    details.push({ label: "Created", value: formatDate(item.createdAt) });
  }

  const isLongPrompt = item.prompt.length > 220;
  // "Recreate" carries the prompt into the composer through the URL, which
  // is exactly what a preset's recipe must not do. Re-running the same row
  // server-side does the same job without the prompt ever passing through
  // the client, so that takes its place; with no re-run on offer (someone
  // else's piece, on the public feed) the way back in is the catalogue.
  const canRerun = Boolean(onDuplicate);

  return (
    <>
      {/* Media pane — clicking the empty space around the media closes, the
          way every other lightbox on the web does. */}
      {/* Stacked layout gives the media a fixed 45vh band rather than a
          min-height: as a flex item in a scrolling column it would otherwise
          keep its intrinsic size and paint over the panel below it. Both
          heights are definite, so the media's own max-h-full resolves. */}
      <div
        className="relative flex h-[45vh] shrink-0 items-center justify-center overflow-hidden lg:h-full lg:min-h-0 lg:flex-1"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <Dialog.Title className="sr-only">{itemLabel(item) || "Generation preview"}</Dialog.Title>

        {hasPrev && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate(index - 1)}
            className="absolute top-1/2 left-0 z-10 -translate-y-1/2 bg-surface/60 backdrop-blur"
            aria-label="Previous"
          >
            <ChevronLeft className="size-5" />
          </Button>
        )}
        {hasNext && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate(index + 1)}
            className="absolute top-1/2 right-0 z-10 -translate-y-1/2 bg-surface/60 backdrop-blur"
            aria-label="Next"
          >
            <ChevronRight className="size-5" />
          </Button>
        )}

        {item.status === "completed" && item.resultUrl ? (
          isVideo ? (
            <video
              src={item.resultUrl}
              controls
              autoPlay
              loop
              className="max-h-full max-w-full rounded-xl border border-line"
            />
          ) : (
            // Intentionally plain <img>: shown at natural aspect ratio capped
            // by the pane, which next/image's fixed-box (fill) or
            // explicit-dimension model doesn't fit here.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.resultUrl}
              alt={itemLabel(item)}
              className="max-h-full max-w-full rounded-xl border border-line object-contain"
            />
          )
        ) : item.status === "failed" ? (
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <AlertCircle className="size-8 text-accent" aria-hidden="true" />
            <p className="text-body text-ink-soft">Generation failed</p>
            {item.errorMessage && (
              <p className="max-w-sm text-body-sm text-muted">{item.errorMessage}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Spinner size={28} />
            <p className="font-mono text-caption text-muted">{item.progressPercent}%</p>
          </div>
        )}
      </div>

      {/* Info panel */}
      <div className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-modal lg:h-full lg:w-[380px]">
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle p-4">
          {/* Three headers, because the panel answers a different question
            * depending on who is looking:
            *   - the creator already knows who made it, so crediting them to
            *     themselves ("yassine qadmar / Author") is noise. What they
            *     can't see anywhere else on this screen is whether the piece
            *     is public, so that's what goes here.
            *   - another viewer needs the credit, so they get the byline.
            *   - with no author data at all (the public feed today), fall
            *     back to what made it rather than who. */}
          {viewerIsOwner ? (
            <div className="flex min-w-0 items-center gap-3">
              <Avatar author={author} fallback="Y" />
              <div className="min-w-0">
                <p className="truncate text-label font-semibold text-ink">Your creation</p>
                <p className="flex items-center gap-1.5 text-caption text-text-tertiary">
                  {item.isPublic ? (
                    <>
                      <Globe className="size-3" aria-hidden="true" /> Shared in the community
                      gallery
                    </>
                  ) : (
                    <>
                      <Lock className="size-3" aria-hidden="true" /> Private to you
                    </>
                  )}
                </p>
              </div>
            </div>
          ) : author ? (
            <div className="flex min-w-0 items-center gap-3">
              <Avatar author={author} fallback={author.name.charAt(0).toUpperCase()} />
              <div className="min-w-0">
                <p className="truncate text-label font-semibold text-ink">{author.name}</p>
                <p className="text-caption text-text-tertiary">Author</p>
              </div>
            </div>
          ) : (
            <div className="min-w-0">
              <p className="truncate text-label font-semibold text-ink">{modelLabel(item.model)}</p>
              <p className="text-caption text-text-tertiary">{prettyType(item.type)}</p>
            </div>
          )}
          <div className="flex shrink-0 items-center gap-2">
            {item.status !== "completed" && (
              <Badge variant={STATUS_VARIANT[item.status] ?? "neutral"}>{item.status}</Badge>
            )}
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close preview">
                <X className="size-5" />
              </Button>
            </Dialog.Close>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Prompt — or, for a preset, the fact that there is one and that
              it stays put. A preset is a recipe we wrote and the studio that
              runs it never shows it (see PresetStudio), so this panel would
              be the one place it leaked. */}
          <section className="border-b border-border-subtle p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-caption font-semibold tracking-wide text-text-tertiary uppercase">
                <Sparkles className="size-3.5" aria-hidden="true" />{" "}
                {item.fromPreset ? "Recipe" : "Prompt"}
              </span>
              {/* Copy would hand over the exact text the panel is holding
                  back, so a preset doesn't get the button. */}
              {!item.fromPreset && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(item.prompt);
                    toast({ title: "Prompt copied", variant: "success" });
                  }}
                >
                  <Copy className="size-3.5" /> Copy
                </Button>
              )}
            </div>
            {item.fromPreset ? (
              <p className="mt-3 text-body-sm text-muted">
                Made from a preset — its prompt, camera move and settings are part of the recipe
                and stay locked.
              </p>
            ) : (
              <>
                <p
                  className={cn(
                    "mt-3 whitespace-pre-wrap text-body-sm text-ink-soft",
                    !promptOpen && "line-clamp-5",
                  )}
                >
                  {item.prompt || "No prompt recorded."}
                </p>
                {isLongPrompt && (
                  <button
                    type="button"
                    onClick={() => setPromptOpen((v) => !v)}
                    className="mt-2 flex items-center gap-1 text-body-sm text-muted transition-colors hover:text-ink"
                  >
                    {promptOpen ? "See less" : "See all"}
                    <ChevronDown
                      className={cn("size-4 transition-transform", promptOpen && "rotate-180")}
                      aria-hidden="true"
                    />
                  </button>
                )}
                {item.negativePrompt && (
                  <p className="mt-3 text-body-sm text-muted">
                    <span className="text-text-tertiary">Negative:</span> {item.negativePrompt}
                  </p>
                )}
              </>
            )}
          </section>

          {/* Source image — what an image-to-video (or an image edit) was
              made from. Set by the API for exactly those input-driven
              types, so nothing here has to test item.type. */}
          {sourceImageUrl && !sourceImageBroken && (
            <section className="border-b border-border-subtle p-4">
              <span className="flex items-center gap-2 text-caption font-semibold tracking-wide text-text-tertiary uppercase">
                <ImageIcon className="size-3.5" aria-hidden="true" /> Source image
              </span>
              <a
                href={sourceImageUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block overflow-hidden rounded-xl border border-line bg-surface-3 transition-colors hover:border-border-strong"
                title="Open the original at full size"
              >
                {/* Plain <img> for the same reason as the media pane above:
                    R2's signed URLs aren't in next/image's remotePatterns
                    allowlist, and its optimizer can't fetch them anyway. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sourceImageUrl}
                  alt="The image this generation started from"
                  loading="lazy"
                  onError={() => setSourceImageBroken(true)}
                  className="max-h-52 w-full object-contain"
                />
              </a>
            </section>
          )}

          {/* Details */}
          <section className="p-4">
            <button
              type="button"
              onClick={() => setDetailsOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2"
              aria-expanded={detailsOpen}
            >
              <span className="flex items-center gap-2 text-caption font-semibold tracking-wide text-text-tertiary uppercase">
                <Info className="size-3.5" aria-hidden="true" /> Details
              </span>
              <ChevronDown
                className={cn("size-4 text-muted transition-transform", detailsOpen && "rotate-180")}
                aria-hidden="true"
              />
            </button>
            {detailsOpen && (
              <dl className="mt-3 space-y-2">
                {details.map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-4">
                    <dt className="text-body-sm text-muted">{row.label}</dt>
                    <dd className="text-right text-body-sm text-ink-soft">{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 border-t border-border-subtle p-4">
          {/* "Edit" takes the second slot whenever the studio can actually
              open this result, and Re-run only falls back to it when it
              can't — someone else's piece, or one that never finished.
              Opening a finished piece in the studio is the more useful next
              step than rolling the dice again, so it gets the slot. */}
          <div className="flex gap-2">
            {item.fromPreset ? (
              canRerun ? (
                <Button variant="accent" size="sm" className="flex-1" onClick={onDuplicate}>
                  <RefreshCw className="size-4" aria-hidden="true" /> Re-run
                </Button>
              ) : (
                <Link
                  href={appHref("/presets")} prefetch={false}
                  className={buttonVariants({ variant: "accent", size: "sm", className: "flex-1" })}
                >
                  <Sparkles className="size-4" aria-hidden="true" /> Try a preset
                </Link>
              )
            ) : (
              <Link
                href={recreateHref(item)}
                className={buttonVariants({ variant: "accent", size: "sm", className: "flex-1" })}
              >
                <Sparkles className="size-4" aria-hidden="true" /> Recreate
              </Link>
            )}
            {canEditInStudio ? (
              <Link
                href={appHref(`/editor?add=${item.id}`)} prefetch={false}
                className={buttonVariants({
                  variant: "secondary",
                  size: "sm",
                  className: "flex-1",
                })}
              >
                <Scissors className="size-4" aria-hidden="true" /> Edit
              </Link>
            ) : (
              // Not for a preset when the slot above is already Re-run —
              // that's the same button twice.
              onDuplicate &&
              !item.fromPreset && (
                <Button variant="secondary" size="sm" className="flex-1" onClick={onDuplicate}>
                  <RefreshCw className="size-4" aria-hidden="true" /> Re-run
                </Button>
              )
            )}
          </div>
          <div className="flex gap-2">
            {item.resultUrl && (
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    await downloadGenerationResult(item.id, item.resultUrl);
                  } catch (error) {
                    toast({ title: (error as Error).message, variant: "error" });
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <Download className="size-4" aria-hidden="true" />{" "}
                {saving ? "Preparing…" : "Download"}
              </Button>
            )}
            {/* Publishing to the creator's own channels — distinct from
                Share2 below, which posts to the community gallery. Owner
                only, and only once there's a finished file to send. */}
            {viewerIsOwner && item.status === "completed" && item.resultUrl && (
              <PublishButton
                generationId={item.id}
                isVideo={isVideo}
              />
            )}
            {onTogglePublic && (
              <Button
                variant="secondary"
                size="icon"
                onClick={onTogglePublic}
                aria-label={item.isPublic ? "Make private" : "Share publicly"}
                title={item.isPublic ? "Make private" : "Share publicly"}
              >
                <Share2 className={cn("size-4", item.isPublic && "text-brand")} />
              </Button>
            )}
            {onAddToCollection && (
              <Button
                variant="secondary"
                size="icon"
                onClick={onAddToCollection}
                aria-label="Add to collection"
                title="Add to collection"
              >
                <FolderPlus className="size-4" />
              </Button>
            )}
            {onRemoveFromCollection && (
              <Button
                variant="secondary"
                size="icon"
                onClick={onRemoveFromCollection}
                aria-label="Remove from collection"
                title="Remove from collection"
              >
                <FolderMinus className="size-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="secondary"
                size="icon"
                onClick={async () => {
                  // Awaited, because the handler now raises a confirmation
                  // prompt. Closing straight away left that question
                  // floating over the grid with the details it was asking
                  // about already gone; `false` means the user backed out,
                  // so the panel stays exactly where they left it.
                  const deleted = await onDelete();
                  if (deleted !== false) onClose();
                }}
                className="text-accent hover:text-accent"
                aria-label="Delete"
                title="Delete"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
