// Cuts the full-body panel out of an influencer's character sheet, so the
// Motion tab hands Kling one figure rather than two.
//
// The portrait is a two-panel sheet on white (close-up left, full body right,
// see aiVideo-backend's lib/influencer-traits.ts). Kling Motion Control
// animates whatever figures it finds, and the sheet holds the same person
// twice, so only the right panel may go.
//
// Done here because the browser can decode and re-encode an image and the
// API can't (no image library, and an Edge Function's CPU budget is no place
// for one). The bytes come through the same-origin media proxy: R2's signed
// URLs carry no CORS headers, and a canvas that draws a cross-origin image
// refuses to hand its pixels back. See src/lib/editor/media.ts.
import { studioMediaUrl } from "@/lib/editor/media";

/** Width the gutter search runs at. Plenty to find a gap of a few percent,
 *  and cheap whatever the portrait's real size. */
const ANALYSIS_WIDTH = 400;
/** A column counts as background when this share of it is near-white. */
const WHITE_COLUMN_SHARE = 0.9;
const NEAR_WHITE = 232;

/**
 * Where the left panel ends, as a fraction of the width.
 *
 * The gap between the panels is a run of white columns near the middle. The
 * left panel is a close-up whose shoulders reach the bottom edge, so its
 * columns are never all white; the run therefore starts at the gap. It may
 * carry on into the right panel's own white margin, so the cut goes through
 * the run's middle, which is white either way. A thin grey divider, which
 * the model sometimes draws, sits inside the run and is skipped with it.
 * With no run at all (the model ignored the layout) it falls back to the
 * middle.
 */
function findSplit(pixels: Uint8ClampedArray, width: number, height: number): number {
  const whiteShare = (x: number) => {
    let white = 0;
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 4;
      if (pixels[i] >= NEAR_WHITE && pixels[i + 1] >= NEAR_WHITE && pixels[i + 2] >= NEAR_WHITE) white++;
    }
    return white / height;
  };

  const from = Math.floor(width * 0.3);
  const to = Math.ceil(width * 0.7);
  let start = -1;
  for (let x = from; x < to; x++) {
    if (whiteShare(x) >= WHITE_COLUMN_SHARE) {
      start = x;
      break;
    }
  }
  if (start < 0) return 0.5;
  let end = start;
  // A divider line is a column or two of grey: tolerated inside the run.
  let misses = 0;
  for (let x = start + 1; x < width && misses <= 2; x++) {
    if (whiteShare(x) >= WHITE_COLUMN_SHARE) {
      end = x;
      misses = 0;
    } else {
      misses++;
    }
  }
  return (start + end) / 2 / width;
}

/**
 * Loads the sheet at `signedUrl` and returns its right panel as a JPEG file
 * ready for /api/upload.
 */
export async function cropFullBodyPanel(signedUrl: string): Promise<File> {
  const res = await fetch(studioMediaUrl(signedUrl));
  if (!res.ok) throw new Error("Couldn't load the influencer's portrait.");
  const bitmap = await createImageBitmap(await res.blob());

  try {
    const scale = ANALYSIS_WIDTH / bitmap.width;
    const probe = document.createElement("canvas");
    probe.width = ANALYSIS_WIDTH;
    probe.height = Math.max(1, Math.round(bitmap.height * scale));
    const probeCtx = probe.getContext("2d", { willReadFrequently: true });
    if (!probeCtx) throw new Error("This browser can't prepare the image.");
    probeCtx.drawImage(bitmap, 0, 0, probe.width, probe.height);
    const { data } = probeCtx.getImageData(0, 0, probe.width, probe.height);

    const left = Math.round(findSplit(data, probe.width, probe.height) * bitmap.width);
    const out = document.createElement("canvas");
    out.width = bitmap.width - left;
    out.height = bitmap.height;
    const ctx = out.getContext("2d");
    if (!ctx) throw new Error("This browser can't prepare the image.");
    ctx.drawImage(bitmap, left, 0, out.width, out.height, 0, 0, out.width, out.height);

    const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) throw new Error("This browser can't prepare the image.");
    return new File([blob], "influencer-full-body.jpg", { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}
