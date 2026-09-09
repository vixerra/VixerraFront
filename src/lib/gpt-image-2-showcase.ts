// Sample images for the GPT Image 2 showcase sections. All media is served
// locally from public/media/images — no external CDN is referenced, and
// public/media/concepts is deliberately never pulled in here: those 4
// illustrations are capability-concepts.tsx's own dedicated set. Capped at
// exactly 4 entries, one per local image file, so showcase-tabs.tsx's GPT
// Image 2 gallery never repeats a file across its own tiles.

export type GptImage2Image = {
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

export const GPT_IMAGE_2_IMAGES: GptImage2Image[] = [
  {
    id: "hero",
    url: LOCAL_IMAGES.gptImage11,
    prompt: "GPT Image 2 — state-of-the-art image generation",
  },
  {
    id: "text-rendering",
    url: LOCAL_IMAGES.gptImage09,
    prompt: "Production-ready text rendering — dense paragraphs, small lettering, and complex multilingual layouts",
  },
  {
    id: "product-photography",
    url: LOCAL_IMAGES.gptImage06,
    prompt: "State-of-the-art realism — lighting, materials, skin textures, and environmental detail",
  },
  {
    id: "photorealism",
    url: LOCAL_IMAGES.gptImage16,
    prompt: "Brand-consistent product photography — readable ingredient lists, correct colour palettes, precise logo reproduction",
  },
];
