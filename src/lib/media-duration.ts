/**
 * How long a picked video or audio file runs, in seconds.
 *
 * Seedance 2.5 caps the *total* duration of each reference list at
 * SEEDANCE_REFERENCE_MEDIA_MAX_SECONDS, and nothing server-side can check
 * that — the API has no video toolchain (see aiVideo-backend/AGENTS.md). So
 * the budget is kept here, where the file is still in hand: measure it before
 * uploading, refuse the one that would overflow, and show the running total.
 * The provider stays the backstop; this is what keeps hitting it from costing
 * a billed, failed generation.
 *
 * Measured with a detached media element rather than by parsing the
 * container: the browser already has a demuxer for every format the picker
 * accepts, and metadata alone is enough (`preload="metadata"`), so nothing is
 * decoded and no bytes leave the page.
 */
export async function measureMediaDuration(file: File): Promise<number | undefined> {
  const url = URL.createObjectURL(file);
  const el = document.createElement(file.type.startsWith("audio/") ? "audio" : "video");
  el.preload = "metadata";
  try {
    const duration = await new Promise<number | undefined>((resolve) => {
      // A file the browser can't demux fires `error` and never reports a
      // duration; a stream with no declared length reports Infinity. Both
      // resolve as "unknown" so the caller lets the upload through and leaves
      // the ceiling to the provider — a file we can't measure is not the same
      // thing as a file that's too long.
      const done = (value: number | undefined) => {
        el.removeAttribute("src");
        el.load();
        resolve(value);
      };
      el.addEventListener("loadedmetadata", () =>
        done(Number.isFinite(el.duration) ? el.duration : undefined),
      );
      el.addEventListener("error", () => done(undefined));
      el.src = url;
    });
    return duration;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** "6s" / "12.4s" — a measured duration at the precision a 30s budget needs,
 *  with no trailing ".0" on the whole numbers that make up most of them. */
export function formatMediaDuration(seconds: number): string {
  return `${seconds >= 10 ? Math.round(seconds) : Math.round(seconds * 10) / 10}s`;
}
