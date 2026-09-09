/**
 * Preparing a user-supplied logo for use as a watermark.
 *
 * Two things have to happen before the file is usable, and both are the
 * reason this isn't just `FileReader.readAsDataURL`:
 *
 *  - **Size.** The watermark rides inside the project JSON in localStorage,
 *    which has a ~5MB quota shared with every other project. A 4000px PNG
 *    straight off a designer's machine is several megabytes as base64 and
 *    would take the whole store down with it. Nothing larger than
 *    WATERMARK_MAX_PX is ever visible in a 1080p frame anyway.
 *  - **Transparency.** Logos are PNGs with alpha, and re-encoding to JPEG to
 *    save bytes would fill that alpha with black — a black box round the
 *    mark on every frame. So the output stays PNG, and the size cap is what
 *    does the saving instead.
 */

import { WATERMARK_MAX_PX } from "./types";

export const ACCEPTED_LOGO_TYPES = "image/png,image/jpeg,image/webp,image/svg+xml";

/** Refuses obviously wrong input before decoding it — a 20MB file will
 *  decode fine and then produce a data URI nothing can store. */
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;

export async function readLogoFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Pick an image file for your watermark.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("That image is too large — use one under 8MB.");
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("That image could not be read."));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("That image could not be decoded."));
    element.src = dataUrl;
  });

  // An SVG has no meaningful natural size to scale against and stays sharp
  // at any size, so it is passed through as-is.
  if (file.type === "image/svg+xml") return dataUrl;

  const scale = Math.min(1, WATERMARK_MAX_PX / Math.max(image.naturalWidth, image.naturalHeight));
  if (scale >= 1) return dataUrl;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/png");
}
