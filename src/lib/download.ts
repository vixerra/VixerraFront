import { apiFetch } from "@/lib/api-client";

/**
 * Saves a generation's result to the user's machine.
 *
 * `<a href={resultUrl} download>` can't do this. Results live in a private
 * R2 bucket and `resultUrl` is a pre-signed URL on r2.cloudflarestorage.com,
 * so it's cross-origin — and browsers ignore the `download` attribute on a
 * cross-origin href. Worse, that URL is deliberately signed with
 * `Content-Disposition: inline` so `<video>` can play it, which is what made
 * the button open the file in a bucket tab instead of downloading it.
 *
 * So the disposition has to come from the server: this asks the API for a
 * second, short-lived URL for the same object signed as an attachment, and
 * points a synthetic link at that. Fetching the bytes here instead (blob +
 * object URL) would need CORS on the bucket, which the signed URLs don't
 * carry.
 */
export async function downloadGenerationResult(id: string, fallbackUrl?: string | null) {
  let href = fallbackUrl ?? null;

  try {
    const res = await apiFetch(`/api/generations/${id}/download`);
    if (res.ok) {
      const data = (await res.json()) as { url?: string | null };
      if (data.url) href = data.url;
    }
  } catch {
    // Network hiccup, or a backend that predates the route. Falling back to
    // the playback URL still gets the user to their file — it just opens
    // rather than saves, which is what the button did before.
  }

  if (!href) throw new Error("This result isn't available to download yet.");

  const link = document.createElement("a");
  link.href = href;
  // Only honoured on the same-origin fallback path; the signed URL carries
  // its own filename in the Content-Disposition header.
  link.download = "";
  link.rel = "noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}
