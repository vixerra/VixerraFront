/**
 * Getting a finished export out of the tab.
 *
 * Two destinations, and they are genuinely different features rather than
 * one with a flag: a download is a file on a disk, while saving to the
 * gallery files the edit as a Generation — which is what makes it
 * shareable, collectable, publishable to TikTok/YouTube, and re-downloadable
 * later. Everything downstream of an edit already knows how to handle a
 * Generation, so the export becomes one instead of a special case.
 */

import { apiFetch } from "@/lib/api-client";
import { timelineLayout } from "./project";
import { MAX_EXPORT_BYTES, canvasSize, type Project } from "./types";

type UploadResponse = { url: string; ref: string; playbackUrl: string };

/**
 * Puts one rendered file into the bucket.
 *
 * Reuses the API's existing /api/upload route rather than adding a second
 * one: it already writes to R2, already enforces the size ceiling, and
 * already refuses MP4s carrying a codec browsers cannot play — a check worth
 * keeping even on our own output, since it is the difference between finding
 * out here and finding out from a black tile in the gallery.
 */
async function uploadFile(blob: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append("file", new File([blob], filename, { type: blob.type }));

  const res = await apiFetch("/api/upload", { method: "POST", body: form });
  const data = (await res.json().catch(() => ({}))) as Partial<UploadResponse> & {
    error?: string;
  };
  if (!res.ok || !data.ref) {
    throw new Error(data.error ?? "That render could not be uploaded.");
  }
  return data.ref;
}

export type SavedEdit = { id: string };

export async function saveEditToGallery(options: {
  project: Project;
  video: Blob;
  poster: Blob | null;
  onStage?: (stage: "uploading" | "saving") => void;
}): Promise<SavedEdit> {
  const { project, video, poster, onStage } = options;

  if (video.size > MAX_EXPORT_BYTES) {
    throw new Error(
      "That render is too large to save (the limit is 50MB). Try a lower quality or a shorter edit.",
    );
  }

  onStage?.("uploading");
  const slug = project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40) || "edit";
  const resultRef = await uploadFile(video, `${slug}.mp4`);
  // A missing poster is survivable — the gallery falls back to the first
  // frame of the video — so it never fails the save.
  const thumbnailRef = poster
    ? await uploadFile(poster, `${slug}-poster.png`).catch(() => null)
    : null;

  onStage?.("saving");
  const layout = timelineLayout(project);
  const { width, height } = canvasSize(project.aspect, project.quality);

  const res = await apiFetch("/api/generations/edited", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resultRef,
      thumbnailRef,
      name: project.name,
      // Recorded so the gallery can show what an edit was built from, and so
      // a future "reopen this edit" can find the sources again.
      sourceIds: [...new Set(project.clips.map((c) => c.sourceId))],
      parameters: {
        aspect: project.aspect,
        quality: project.quality,
        fps: project.fps,
        clips: project.clips.length,
        overlays: project.overlays.length,
        watermark: project.watermark.enabled,
        music: Boolean(project.music),
        duration: Number(layout.duration.toFixed(2)),
        width,
        height,
        sizeBytes: video.size,
      },
    }),
  });

  const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
  if (!res.ok || !data.id) {
    throw new Error(data.error ?? "That edit could not be saved to your gallery.");
  }
  return { id: data.id };
}

/** Saves the rendered blob straight to disk. Same-origin object URL, so
 *  unlike a gallery download (see src/lib/download.ts) the `download`
 *  attribute is honoured and no signed URL is needed. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next tick — revoking synchronously can race the browser's
  // own read of the URL and produce an empty file.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
