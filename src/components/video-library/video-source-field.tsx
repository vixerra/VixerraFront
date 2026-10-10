"use client";

import { useState } from "react";
import { Crop, History, RefreshCw } from "lucide-react";
import { PanelDropzone } from "@/components/generate/composer";
import { useToast } from "@/components/ui/toast";
import { markLibraryVideoUsed } from "@/hooks/use-video-library";
import { measureMediaDuration } from "@/lib/media-duration";
import { fetchLibraryVideo, fetchVideoFile, type PickedVideo } from "@/lib/video-library";
import { MediaPickerModal, type MediaPick } from "./media-picker-modal";
import { VideoEditModal } from "./video-edit-modal";

/**
 * A reference-video slot.
 *
 * A click opens the media picker (a new upload, the user's earlier uploads,
 * presets, their generations); whatever is picked then goes through the
 * reference editor (crop and trim) before the form gets it. A file dropped on
 * the slot skips the picker and goes straight to the editor.
 *
 * The form keeps its own state and does its own uploading, exactly as it did
 * with a bare PanelDropzone; this only decides which bytes it gets. `onPick`
 * always receives the File (forms resize clips, measure them and pull their
 * sound out) and, for a library clip used as it is, the `url` of the upload
 * that already holds those bytes, so the form can skip uploading it again.
 * Forms upload everything else through uploadVideoToLibrary, which is what
 * puts it in "Uploads" next time.
 */
export function VideoSourceField({
  label,
  sublabel,
  className,
  previewUrl,
  uploading,
  badge,
  disabled,
  compact,
  minSeconds,
  maxSeconds,
  onPick,
  onRemove,
}: {
  label: string;
  sublabel?: string;
  className?: string;
  previewUrl?: string | null;
  uploading?: boolean;
  badge?: string;
  disabled?: boolean;
  /** A small grid tile (a reference list's "Add"): no Change/Edit row,
   *  since the tile never stays filled. */
  compact?: boolean;
  minSeconds?: number;
  maxSeconds?: number;
  onPick: (video: PickedVideo) => void;
  onRemove: () => void;
}) {
  const { toast } = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // The clip as picked, before any edit, so editing again starts from the
  // whole thing rather than from the last cut.
  const [original, setOriginal] = useState<PickedVideo | null>(null);
  const [editing, setEditing] = useState<PickedVideo | null>(null);

  async function resolve(pick: MediaPick): Promise<PickedVideo> {
    if (pick.kind === "file") return { file: pick.file, seconds: await measureMediaDuration(pick.file) };
    if (pick.kind === "upload") {
      const file = await fetchLibraryVideo(pick.video);
      markLibraryVideoUsed(pick.video.id);
      // Measured again here rather than trusted from the list: this is the
      // number the form validates and prices on.
      const seconds = (await measureMediaDuration(file)) ?? pick.video.durationSeconds ?? undefined;
      return { file, url: pick.video.url, seconds };
    }
    const file = await fetchVideoFile(pick.url, pick.name);
    return { file, seconds: await measureMediaDuration(file) };
  }

  async function take(pick: MediaPick) {
    setPickerOpen(false);
    setLoading(true);
    try {
      const picked = await resolve(pick);
      if (picked.seconds !== undefined && minSeconds !== undefined && picked.seconds < minSeconds - 0.05) {
        toast({ title: "Clip too short", description: `Use a clip of at least ${minSeconds}s.`, variant: "error" });
        return;
      }
      setOriginal(picked);
      setEditing(picked);
    } catch (err) {
      toast({ title: "Couldn't load the video", description: (err as Error).message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  const busy = uploading || loading;
  const canEdit = Boolean(previewUrl && original && !busy && !disabled);

  return (
    <div className={compact ? undefined : "space-y-1.5"}>
      <PanelDropzone
        className={className}
        compact={compact}
        mediaKind="video"
        label={loading ? (compact ? "Loading…" : "Loading your video…") : label}
        sublabel={loading ? undefined : sublabel ?? "Or pick one you already uploaded"}
        previewUrl={loading ? null : previewUrl}
        uploading={busy}
        badge={badge}
        disabled={disabled}
        onBrowse={() => setPickerOpen(true)}
        onFile={(file) => void take({ kind: "file", file })}
        onRemove={() => {
          setOriginal(null);
          onRemove();
        }}
      />
      {!compact && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={disabled || busy}
            className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-caption font-medium text-brand-ink hover:underline disabled:pointer-events-none disabled:opacity-40"
          >
            {previewUrl ? <RefreshCw className="size-3.5" aria-hidden="true" /> : <History className="size-3.5" aria-hidden="true" />}
            {previewUrl ? "Change video" : "My videos"}
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => original && setEditing(original)}
              className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-caption font-medium text-ink-soft hover:text-ink hover:underline"
            >
              <Crop className="size-3.5" aria-hidden="true" />
              Crop &amp; trim
            </button>
          )}
        </div>
      )}

      <MediaPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(pick) => void take(pick)}
        minSeconds={minSeconds}
        maxSeconds={maxSeconds}
      />
      <VideoEditModal
        source={editing}
        minSeconds={minSeconds}
        maxSeconds={maxSeconds}
        onCancel={() => setEditing(null)}
        onSkip={() => {
          const source = editing;
          setEditing(null);
          if (source) onPick(source);
        }}
        onConfirm={(file, seconds) => {
          setEditing(null);
          onPick({ file, seconds });
        }}
      />
    </div>
  );
}
