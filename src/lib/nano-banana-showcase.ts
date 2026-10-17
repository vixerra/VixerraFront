// DUPLIQUÉ dans aiVideo-backend/src/lib/nano-banana-showcase.ts — garder synchronisé.
// Sample images for the Nano Banana showcase sections. All media is served
// locally from public/media/images — no external CDN is referenced, and
// public/media/concepts is deliberately never pulled in here: those 4
// illustrations are capability-concepts.tsx's own dedicated set. Capped at
// exactly 4 entries, one per local image file — only "record-store-poster" and "fashion-studio-portrait" are
// rendered on the site today (personas.tsx, model-carousel.tsx); the others
// are kept as a small honest catalog rather than padded out further.

import { SHOWCASE_IMAGE_PROMPTS } from "@/lib/gpt-image-2-showcase";

export type NanoBananaImage = {
  id: string;
  url: string;
  prompt: string;
};

const LOCAL_IMAGES = {
  gptImage11: "/media/images/gpt-image-11.webp",
  gptImage09: "/media/images/gpt-image-09.webp",
  gptImage06: "/media/images/gpt-image-06.webp",
  gptImage16: "/media/images/gpt-image-16.webp",
} as const;

// Same four files as the GPT Image 2 showcase, so the prompts come from the
// one per-file map there. These entries used to carry prompts for pictures
// these files don't show (a dog in a pool, a coffee mug), so "Try it" opened
// a prompt unrelated to the image above it.
export const NANO_BANANA_IMAGES: NanoBananaImage[] = [
  { id: "tuxedo-cat-closeup", url: LOCAL_IMAGES.gptImage11, prompt: SHOWCASE_IMAGE_PROMPTS[LOCAL_IMAGES.gptImage11] },
  { id: "balcony-portrait", url: LOCAL_IMAGES.gptImage09, prompt: SHOWCASE_IMAGE_PROMPTS[LOCAL_IMAGES.gptImage09] },
  { id: "record-store-poster", url: LOCAL_IMAGES.gptImage06, prompt: SHOWCASE_IMAGE_PROMPTS[LOCAL_IMAGES.gptImage06] },
  { id: "fashion-studio-portrait", url: LOCAL_IMAGES.gptImage16, prompt: SHOWCASE_IMAGE_PROMPTS[LOCAL_IMAGES.gptImage16] },
];

export function getNanoBananaImage(id: string): NanoBananaImage {
  const image = NANO_BANANA_IMAGES.find((img) => img.id === id);
  if (!image) throw new Error(`Unknown Nano Banana showcase image id: ${id}`);
  return image;
}
