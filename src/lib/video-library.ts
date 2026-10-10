/**
 * The user's video library: reference clips they uploaded before, kept by
 * the API (aiVideo-backend's routes/upload.ts, `UserUpload` rows) so the next
 * run can pick one instead of uploading the same file again.
 *
 * A clip lands in the library when it goes up through uploadVideoToLibrary
 * (`library=1`). The API hashes the bytes, so uploading a file that is
 * already there moves it back to the top instead of storing a copy.
 */

import { apiFetch } from "@/lib/api-client";
import { studioMediaUrl } from "@/lib/editor/media";

export type LibraryVideo = {
  id: string;
  name: string;
  contentType: string;
  bytes: number;
  /** As measured by the browser that uploaded it; null when it couldn't. */
  durationSeconds: number | null;
  createdAt: string;
  lastUsedAt: string;
  /** What a generation route takes as `video`. */
  url: string;
  /** Signed for a <video> to preview, valid for a day. */
  playbackUrl: string;
};

/** A clip handed to a form by the reference-video slot: the bytes, always
 *  (forms resize, measure and extract sound from them), and the upload of
 *  exactly those bytes when one already exists. */
export type PickedVideo = {
  file: File;
  url?: string;
  seconds?: number;
};

/** Uploads a reference clip and files it in the library. Returns the url a
 *  generation route takes. `name` is what the list shows, for a copy that was
 *  re-encoded under a name of its own. */
export async function uploadVideoToLibrary(
  file: File,
  { name, seconds }: { name?: string; seconds?: number } = {},
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("library", "1");
  formData.append("name", name ?? file.name);
  if (seconds !== undefined) formData.append("duration", String(seconds));
  const res = await apiFetch("/api/upload", { method: "POST", body: formData });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Upload failed.");
  return json.url as string;
}

/**
 * A library clip's bytes, as a File the forms can treat exactly like one
 * picked from disk. Downloaded through the app's same-origin media proxy:
 * R2's signed links carry no CORS headers, and trimming draws the frames onto
 * a canvas, which a cross-origin source would taint.
 */
export async function fetchLibraryVideo(video: LibraryVideo): Promise<File> {
  return fetchVideoFile(video.playbackUrl, video.name, video.contentType);
}

/** Any playable clip the page was handed (a generation's signed result, a
 *  preset's preview) as a File. A path on this app's own origin, like a
 *  bundled preset clip, is fetched as it is; anything else goes through the
 *  media proxy for the reason above. */
export async function fetchVideoFile(url: string, name: string, contentType?: string): Promise<File> {
  const res = await fetch(url.startsWith("/") ? url : studioMediaUrl(url));
  if (!res.ok) throw new Error("Couldn't load this video. Try again.");
  const blob = await res.blob();
  return new File([blob], name, { type: contentType || blob.type || "video/mp4" });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
