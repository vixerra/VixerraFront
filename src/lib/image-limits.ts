// Pixel checks for the composer's image uploads, against the bounds a
// provider documents (ImageLimits in cloudflare-models.ts). A pick that
// breaks them is refused on the spot; sent anyway, it would only be refused
// by the provider, after the job was queued and charged (then refunded).

import type { ImageLimits } from "@/lib/cloudflare-models";

export type ImageSize = { width: number; height: number };

/** The file's size in pixels, or undefined when the browser can't decode it
 *  (HEIC, in most browsers), which leaves the verdict to the provider. */
export async function readImageSize(file: File): Promise<ImageSize | undefined> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return undefined;
  }
}

/** Why an image of this size won't be accepted, every reason at once so a
 *  fix for the first doesn't run straight into the second, or undefined when
 *  it will be. */
export function imageLimitProblem({ width, height }: ImageSize, limits: ImageLimits): string | undefined {
  const problems: string[] = [];
  if (Math.min(width, height) < limits.minSide) {
    problems.push(`each side needs to be at least ${limits.minSide} px`);
  }
  if (Math.max(width, height) > limits.maxSide) {
    problems.push(`each side needs to be at most ${limits.maxSide} px`);
  }
  const aspect = width / height;
  if (aspect > limits.maxAspect) {
    problems.push(`it can be at most ${limits.maxAspect} times as wide as it is tall`);
  } else if (aspect < limits.minAspect) {
    problems.push(`it can be at most ${Number((1 / limits.minAspect).toFixed(2))} times as tall as it is wide`);
  }
  if (problems.length === 0) return undefined;
  return `This image is ${width}×${height} px: ${problems.join(", and ")}.`;
}
