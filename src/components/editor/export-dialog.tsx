"use client";

import { type MediaEl } from "@/lib/editor/media";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Download, Film, Library, Send, VolumeX } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { PublishButton } from "@/components/social/publish-button";
import { useToast } from "@/components/ui/toast";
import {
  ExportCancelledError,
  ExportUnsupportedError,
  exportProject,
  isExportSupported,
  renderPoster,
  type ExportProgress,
} from "@/lib/editor/export";
import { downloadBlob, saveEditToGallery } from "@/lib/editor/save";
import { estimateBytes, formatBytes, formatTimecode } from "@/lib/editor/project";
import {
  EXPORT_QUALITIES,
  MAX_EXPORT_BYTES,
  canvasSize,
  type Project,
} from "@/lib/editor/types";
import { cn } from "@/lib/utils";

type Stage =
  | { kind: "idle" }
  | { kind: "rendering"; progress: ExportProgress }
  | { kind: "saving"; label: string }
  | { kind: "done"; blob: Blob; hasAudio: boolean; savedId: string | null }
  | { kind: "error"; message: string };

const PHASE_LABEL: Record<ExportProgress["phase"], string> = {
  preparing: "Getting the clips ready",
  audio: "Mixing the audio",
  video: "Rendering frames",
  packaging: "Packaging the MP4",
};

/**
 * Renders the project and then decides what to do with the result.
 *
 * Render and save are two separate steps on purpose, and the dialog stays
 * open in between. A render is the expensive part — a minute of someone's
 * machine — and collapsing it into a single "Save" button means any failure
 * downstream (a dropped connection, a full account) throws that minute away.
 * Once the blob exists it stays in hand, and both destinations stay
 * available: download it, file it in the gallery, or both.
 */
export function ExportDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  duration: number;
  videoFor: (clipId: string) => MediaEl | null;
  objectUrlFor: (clipId: string) => string | null;
  /** Stops preview playback — the export seeks the very same decoders, and a
   *  running preview would fight it for every one of them. */
  onBeforeRender: () => void;
}) {
  const { open, onOpenChange, project, duration } = props;
  const { width, height } = canvasSize(project.aspect, project.quality);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Export"
      description={`${width}×${height} · ${project.fps} fps · ${formatTimecode(duration)}`}
    >
      {/* Mounted only while open, which is what resets it: reopening after a
          finished export must offer a fresh render rather than the previous
          result, and unmounting also aborts a render still in flight through
          the body's own cleanup. */}
      {open && <ExportBody {...props} />}
    </Modal>
  );
}

function ExportBody({
  project,
  duration,
  videoFor,
  objectUrlFor,
  onBeforeRender,
}: {
  project: Project;
  duration: number;
  videoFor: (clipId: string) => MediaEl | null;
  objectUrlFor: (clipId: string) => string | null;
  onBeforeRender: () => void;
}) {
  const { toast } = useToast();
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  const quality = EXPORT_QUALITIES.find((q) => q.id === project.quality) ?? EXPORT_QUALITIES[1];
  const { width, height } = canvasSize(project.aspect, project.quality);
  const estimate = estimateBytes(duration, quality.bitrate);
  const overLimit = estimate > MAX_EXPORT_BYTES;
  const supported = isExportSupported();

  useEffect(() => () => abortRef.current?.abort(), []);

  const render = useCallback(async () => {
    onBeforeRender();
    const controller = new AbortController();
    abortRef.current = controller;
    setStage({ kind: "rendering", progress: { phase: "preparing", percent: 0 } });

    try {
      const result = await exportProject({
        project,
        videoFor,
        objectUrlFor,
        signal: controller.signal,
        onProgress: (progress) => setStage({ kind: "rendering", progress }),
      });
      setStage({ kind: "done", blob: result.blob, hasAudio: result.hasAudio, savedId: null });
    } catch (error) {
      if (error instanceof ExportCancelledError) {
        setStage({ kind: "idle" });
        return;
      }
      setStage({
        kind: "error",
        message:
          error instanceof ExportUnsupportedError || error instanceof Error
            ? error.message
            : "Something went wrong while rendering.",
      });
    } finally {
      abortRef.current = null;
    }
  }, [objectUrlFor, onBeforeRender, project, videoFor]);

  // Owned here, not inside PublishButton, so a save that was started by
  // "Publish" can open the composer as soon as it has an id to hand it.
  const [publishOpen, setPublishOpen] = useState(false);

  const save = useCallback(
    async (blob: Blob, hasAudio: boolean, publishAfter = false) => {
      setStage({ kind: "saving", label: "Uploading your video" });
      try {
        // The poster is drawn from the same decoders the render just used, so
        // it costs one seek rather than a second pass over the timeline.
        const poster = await renderPoster({ project, videoFor }).catch(() => null);
        const saved = await saveEditToGallery({
          project,
          video: blob,
          poster,
          onStage: (s) =>
            setStage({
              kind: "saving",
              label: s === "uploading" ? "Uploading your video" : "Adding it to your gallery",
            }),
        });
        // hasAudio is carried through rather than assumed: hard-coding true
        // here made the "no audio track" warning vanish the moment you saved,
        // on exactly the renders that needed it.
        setStage({ kind: "done", blob, hasAudio, savedId: saved.id });
        toast({ title: "Saved to your gallery", variant: "success" });
        // "Publish" saves first because the composer needs a real generation
        // to attach to — opening it here is what makes that one press.
        if (publishAfter) setPublishOpen(true);
      } catch (error) {
        // The render survives a failed save — back to the done state so the
        // user can download it or try again rather than losing it.
        setStage({ kind: "done", blob, hasAudio, savedId: null });
        toast({
          title: "Couldn't save that",
          description: error instanceof Error ? error.message : undefined,
          variant: "error",
        });
      }
    },
    [project, toast, videoFor],
  );

  const busy = stage.kind === "rendering" || stage.kind === "saving";

  return (
    <>
      {!supported ? (
        <Notice tone="error">
          Exporting needs the WebCodecs API to encode video in your browser. Chrome, Edge and
          Safari 17+ support it — this browser doesn&apos;t yet, so the edit can be built here but
          not rendered.
        </Notice>
      ) : stage.kind === "rendering" ? (
        <Rendering progress={stage.progress} onCancel={() => abortRef.current?.abort()} />
      ) : stage.kind === "saving" ? (
        <div className="py-6 text-center">
          <p className="text-body-sm text-ink-soft">{stage.label}…</p>
        </div>
      ) : stage.kind === "done" ? (
        <Done
          blob={stage.blob}
          hasAudio={stage.hasAudio}
          savedId={stage.savedId}
          name={project.name}
          onSave={() => void save(stage.blob, stage.hasAudio)}
          onPublish={() =>
            stage.savedId ? setPublishOpen(true) : void save(stage.blob, stage.hasAudio, true)
          }
          publishOpen={publishOpen}
          onPublishOpenChange={setPublishOpen}
          onRerender={() => void render()}
        />
      ) : (
        <div className="space-y-4">
          {stage.kind === "error" && <Notice tone="error">{stage.message}</Notice>}

          <dl className="space-y-1.5 rounded-xl border border-line bg-surface-dark p-3">
            <Row label="Frame" value={`${width} × ${height}`} />
            <Row label="Length" value={formatTimecode(duration)} />
            <Row label="Clips" value={String(project.clips.length)} />
            <Row
              label="Estimated size"
              value={formatBytes(estimate)}
              tone={overLimit ? "warn" : undefined}
            />
          </dl>

          {overLimit && (
            <Notice tone="warn">
              That is likely over the 50MB the gallery accepts. Rendering will still work — you can
              download it — but saving it back may be refused. A lower quality or a shorter edit
              will fit.
            </Notice>
          )}

          <p className="text-caption text-muted">
            Rendering happens on this machine, so keep the tab open. It usually takes a little
            longer than the video itself.
          </p>

          <Button
            variant="accent"
            className="w-full"
            disabled={duration <= 0 || busy}
            onClick={() => void render()}
          >
            <Film className="size-4" />
            Render {formatTimecode(duration)}
          </Button>
        </div>
      )}
    </>
  );
}

function Rendering({
  progress,
  onCancel,
}: {
  progress: ExportProgress;
  onCancel: () => void;
}) {
  const percent = Math.round(progress.percent * 100);
  return (
    <div className="space-y-4 py-2">
      <div>
        <div className="mb-2 flex items-center justify-between text-caption">
          <span className="text-ink-soft">{PHASE_LABEL[progress.phase]}</span>
          <span className="font-mono text-muted tabular-nums">{percent}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-200"
            style={{ width: `${percent}%` }}
          />
        </div>
        {progress.frame !== undefined && progress.totalFrames !== undefined && (
          <p className="mt-2 font-mono text-[10px] text-text-tertiary tabular-nums">
            frame {progress.frame} / {progress.totalFrames}
          </p>
        )}
      </div>
      <Button variant="secondary" size="sm" className="w-full" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

function Done({
  blob,
  hasAudio,
  savedId,
  name,
  onSave,
  onPublish,
  publishOpen,
  onPublishOpenChange,
  onRerender,
}: {
  blob: Blob;
  hasAudio: boolean;
  savedId: string | null;
  name: string;
  onSave: () => void;
  /** Saves first when needed, then opens the creator composer. */
  onPublish: () => void;
  publishOpen: boolean;
  onPublishOpenChange: (open: boolean) => void;
  onRerender: () => void;
}) {
  const filename = `${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "edit"}.mp4`;
  const tooBig = blob.size > MAX_EXPORT_BYTES;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 p-3">
        <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
        <p className="text-body-sm text-ink-soft">
          Rendered · <span className="font-mono">{formatBytes(blob.size)}</span>
        </p>
      </div>

      {!hasAudio && (
        <Notice tone="warn" icon={VolumeX}>
          This render has no audio track — either nothing in the edit had sound, or this browser
          has no AAC encoder. The picture is unaffected.
        </Notice>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => downloadBlob(blob, filename)}>
          <Download className="size-4" />
          Download
        </Button>
        {savedId ? (
          // Button has no `asChild`, so a link that should look like one
          // takes the shared class factory instead — same pattern as the
          // gallery preview modal.
          <Link href="/my-gallery" className={buttonVariants({ variant: "secondary" })}>
            <Library className="size-4" />
            In your gallery
          </Link>
        ) : (
          <Button variant="secondary" disabled={tooBig} onClick={onSave}>
            <Library className="size-4" />
            Save to gallery
          </Button>
        )}
      </div>

      {/* Straight to the creator tools. It takes the accent because posting
          is the point of most edits, and Download/Save are the ways of
          keeping it rather than doing something with it.

          Publishing needs a real generation to attach the media to, so this
          saves to the gallery first when it hasn't been saved yet — which is
          why it carries the same 50MB ceiling as Save. The button is
          rendered whether or not there's an id: PublishButton is only
          mounted with one once savedId exists, and until then this is a
          plain Button that kicks off the save. */}
      {savedId ? (
        <PublishButton
          generationId={savedId}
          isVideo
          variant="labelled"
          buttonVariant="accent"
          label="Post to your channels"
          className="w-full"
          open={publishOpen}
          onOpenChange={onPublishOpenChange}
        />
      ) : (
        <Button variant="accent" className="w-full" disabled={tooBig} onClick={onPublish}>
          <Send className="size-4" aria-hidden="true" />
          Post to your channels
        </Button>
      )}

      {tooBig && !savedId && (
        <Notice tone="warn">
          At {formatBytes(blob.size)} this is over the 50MB the gallery accepts. Download it, or
          render again at a lower quality to save it back.
        </Notice>
      )}

      {savedId && (
        <p className="text-caption text-muted">
          It behaves like any other generation now — share it, collect it, or post it again later
          from your gallery.
        </p>
      )}

      <button
        type="button"
        onClick={onRerender}
        className="w-full text-center text-caption text-muted transition-colors hover:text-ink-soft"
      >
        Render again
      </button>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <div className="flex items-center justify-between text-caption">
      <dt className="text-muted">{label}</dt>
      <dd className={cn("font-mono tabular-nums", tone === "warn" ? "text-warning" : "text-ink-soft")}>
        {value}
      </dd>
    </div>
  );
}

function Notice({
  tone,
  icon: Icon = AlertCircle,
  children,
}: {
  tone: "warn" | "error";
  icon?: typeof AlertCircle;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border p-3 text-caption",
        tone === "error"
          ? "border-accent/30 bg-accent/10 text-ink-soft"
          : "border-warning/30 bg-warning/10 text-ink-soft",
      )}
    >
      <Icon
        className={cn("mt-0.5 size-3.5 shrink-0", tone === "error" ? "text-accent" : "text-warning")}
        aria-hidden="true"
      />
      <p>{children}</p>
    </div>
  );
}
