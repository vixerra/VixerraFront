// Composites the studio's two assets — product and talent — into a single
// side-by-side image.
//
// Why this exists: a generation carries exactly ONE input image. The backend
// stores it as `inputImageUrl` and the runner puts it in the model's single
// image param (see generation-runner.ts), so "keep my product AND my model"
// has no second slot to travel in. Merging them into one reference sheet is
// the only way to hand both to a model through the API as it stands — and it
// works because the image models the studio offers (Seedream, Nano Banana
// Pro) read a multi-subject reference as identities to preserve, not as a
// layout to copy. The prompt says so explicitly; see referenceNote() in
// marketing-prompt.ts, which must stay paired with this.
//
// Composited from the local File objects rather than from the uploaded URLs
// on purpose: drawing a cross-origin image onto a canvas taints it, and a
// tainted canvas throws SecurityError on toBlob() — the upload round-trip
// would break the very step it feeds.

/** Each half is a square panel; the sheet is 2:1. Big enough that neither
 *  asset is the resolution bottleneck, small enough to upload quickly. */
const PANEL = 1024;

/** Flat white, matching the seamless-backdrop convention every product
 *  reference photo already uses — a colored or textured filler would read as
 *  part of the scene the model is being asked to preserve. */
const BACKGROUND = "#ffffff";

async function loadBitmap(file: File): Promise<ImageBitmap> {
  // from-image so a phone photo's EXIF rotation is baked in — an asset lying
  // on its side is a reference the model faithfully preserves, sideways.
  return createImageBitmap(file, { imageOrientation: "from-image" });
}

/** Contain-fit: the whole asset, centered, never cropped and never stretched
 *  — a cropped product is a different product. */
function containRect(bitmap: ImageBitmap, offsetX: number) {
  const scale = Math.min(PANEL / bitmap.width, PANEL / bitmap.height);
  const width = bitmap.width * scale;
  const height = bitmap.height * scale;
  return {
    x: offsetX + (PANEL - width) / 2,
    y: (PANEL - height) / 2,
    width,
    height,
  };
}

/**
 * Draws `product` on the left and `talent` on the right of one JPEG file,
 * ready to upload through the normal /api/upload path.
 *
 * Left/right is not arbitrary — the prompt tells the model which panel is
 * which, so the order here and the wording there are one contract.
 */
export async function composeReferenceSheet(product: File, talent: File): Promise<File> {
  const [left, right] = await Promise.all([loadBitmap(product), loadBitmap(talent)]);

  const canvas = document.createElement("canvas");
  canvas.width = PANEL * 2;
  canvas.height = PANEL;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare the reference sheet.");

  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const [bitmap, offsetX] of [
    [left, 0],
    [right, PANEL],
  ] as const) {
    const rect = containRect(bitmap, offsetX);
    ctx.drawImage(bitmap, rect.x, rect.y, rect.width, rect.height);
    bitmap.close();
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92),
  );
  if (!blob) throw new Error("Could not prepare the reference sheet.");

  return new File([blob], "reference-sheet.jpg", { type: "image/jpeg" });
}
