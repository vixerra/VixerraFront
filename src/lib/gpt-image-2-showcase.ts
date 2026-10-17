// Sample images for the GPT Image 2 showcase sections. All media is served
// locally from public/media/images — no external CDN is referenced, and
// public/media/concepts is deliberately never pulled in here: those 4
// illustrations are capability-concepts.tsx's own dedicated set. Capped at
// exactly 4 entries, one per local image file, so showcase-tabs.tsx's GPT
// Image 2 gallery never repeats a file across its own tiles.
//
// `prompt` is what "Try it" opens in the composer, so it has to be a prompt —
// these used to be marketing taglines ("GPT Image 2 — state-of-the-art image
// generation"), which landed in the composer as nonsense. `caption` keeps the
// tagline for display.
//
// TODO(owner): the original prompts behind these four files weren't kept in
// the repo. The prompts below are written from what each image shows, so a
// "Try it" run produces something close. Replace them with the real prompts
// if you have them. Also confirm which model made each file: gpt-image-16
// carries a Gemini sparkle in its bottom-right corner, which suggests Nano
// Banana rather than GPT Image 2, and gpt-image-06 reproduces a real album
// cover.

export type GptImage2Image = {
  id: string;
  url: string;
  /** A usable prompt for the composer, and the image's alt text. */
  prompt: string;
  /** Marketing line shown under the tile, never sent to the composer. */
  caption: string;
};

const LOCAL_IMAGES = {
  gptImage11: "/media/images/gpt-image-11.webp",
  gptImage09: "/media/images/gpt-image-09.webp",
  gptImage06: "/media/images/gpt-image-06.webp",
  gptImage16: "/media/images/gpt-image-16.webp",
} as const;

/** One prompt per file, shared with nano-banana-showcase.ts, which shows the
 *  same four files — so a file can never be described two different ways. */
export const SHOWCASE_IMAGE_PROMPTS: Record<string, string> = {
  [LOCAL_IMAGES.gptImage11]:
    "A playful wide-angle close-up of a black-and-white tuxedo cat leaning into the lens with big green eyes, a smiling young woman in a cream sweater and light-wash jeans crouching behind it, seamless pastel pink studio backdrop, soft even light, fisheye perspective",
  [LOCAL_IMAGES.gptImage09]:
    "A candid smartphone-style portrait of a young woman with dark hair in a loose bun, rosy blush and soft makeup, wearing a white puff-sleeve blouse under a pink plaid pinafore dress, standing on an apartment balcony at blue hour, warm lit windows in the buildings behind her",
  [LOCAL_IMAGES.gptImage06]:
    "An editorial magazine-style poster: a young man in a brown corduroy jacket and white tee sits in a vintage record store holding a soul LP, shelves of album covers behind him, moody warm light, a huge bold white sans-serif headline \"LISTEN.\" across the top",
  [LOCAL_IMAGES.gptImage16]:
    "A full-length fashion studio portrait of a woman with long dark hair and black rectangular glasses, cropped white button-up shirt, belted beige mini skirt and sheer black stockings, posed against a plain warm-white wall, hard side light casting a crisp shadow",
};

export const GPT_IMAGE_2_IMAGES: GptImage2Image[] = [
  {
    id: "hero",
    url: LOCAL_IMAGES.gptImage11,
    prompt: SHOWCASE_IMAGE_PROMPTS[LOCAL_IMAGES.gptImage11],
    caption: "GPT Image 2 — state-of-the-art image generation",
  },
  {
    id: "text-rendering",
    url: LOCAL_IMAGES.gptImage09,
    prompt: SHOWCASE_IMAGE_PROMPTS[LOCAL_IMAGES.gptImage09],
    caption: "Natural, phone-camera realism — skin, fabric and low evening light",
  },
  {
    id: "product-photography",
    url: LOCAL_IMAGES.gptImage06,
    prompt: SHOWCASE_IMAGE_PROMPTS[LOCAL_IMAGES.gptImage06],
    caption: "Poster-ready typography over a photoreal scene",
  },
  {
    id: "photorealism",
    url: LOCAL_IMAGES.gptImage16,
    prompt: SHOWCASE_IMAGE_PROMPTS[LOCAL_IMAGES.gptImage16],
    caption: "Studio fashion photography — wardrobe, materials and hard light",
  },
];
