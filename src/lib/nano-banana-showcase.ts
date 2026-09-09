// DUPLIQUÉ dans aiVideo-backend/src/lib/nano-banana-showcase.ts — garder synchronisé.
// Sample images for the Nano Banana showcase sections. All media is served
// locally from public/media/images — no external CDN is referenced, and
// public/media/concepts is deliberately never pulled in here: those 4
// illustrations are capability-concepts.tsx's own dedicated set. Capped at
// exactly 4 entries, one per local image file — only "hillside-house-viz" is
// actually rendered anywhere on the site today (personas.tsx), the other 3
// are kept as a small honest catalog rather than padded out further.

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

export const NANO_BANANA_IMAGES: NanoBananaImage[] = [
  {
    id: "dog-pool-action",
    url: LOCAL_IMAGES.gptImage11,
    prompt:
      "An action shot of a black lab swimming in an inground suburban swimming pool. The camera is placed meticulously on the water line, dividing the image in half, revealing both the dog's head above water holding a tennis ball in its mouth, and its paws paddling underwater.",
  },
  {
    id: "vaporwave-poster",
    url: LOCAL_IMAGES.gptImage09,
    prompt:
      "A vaporwave poster, 'AESTHETIC' in full-width glitched characters, a Roman bust statue, a pink-and-cyan grid, palm trees, and a Windows-95-window motif, dreamy nostalgia. Pastel pink, cyan, and purple, glossy digital print, surreal melancholy, internet aesthetic.",
  },
  {
    id: "hillside-house-viz",
    url: LOCAL_IMAGES.gptImage06,
    prompt:
      "A detailed architectural visualization of a modern hillside house with floor-to-ceiling glass walls, infinity pool merging with the ocean horizon, warm interior lighting at dusk, tropical vegetation, rendered in photorealistic style with accurate reflections and volumetric light",
  },
  {
    id: "coffee-mug-product",
    url: LOCAL_IMAGES.gptImage16,
    prompt:
      "A hyperrealistic product photo of a matte ceramic coffee mug on a wooden table, morning light streaming through a window casting soft shadows, steam rising from the cup with the text 'GOOD MORNING' embossed on the side in a clean serif font, shallow depth of field, 85mm lens",
  },
];

export function getNanoBananaImage(id: string): NanoBananaImage {
  const image = NANO_BANANA_IMAGES.find((img) => img.id === id);
  if (!image) throw new Error(`Unknown Nano Banana showcase image id: ${id}`);
  return image;
}
