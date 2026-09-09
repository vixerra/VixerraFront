import { IMAGE_STYLE_PRESETS } from "@/lib/constants";

export type ImageStylePreset = (typeof IMAGE_STYLE_PRESETS)[number];

/**
 * What each style preset actually appends to the prompt.
 *
 * Style is deliberately NOT a model parameter. The backend builds a
 * generation's parameters strictly from the model registry, and every key
 * there maps to a real Cloudflare field verified against the provider — so an
 * invented `style` param would either be dropped or rejected, and it would
 * mean something different on each of the nine image models anyway. Appending
 * to the prompt is the one form of style that every model understands
 * identically.
 *
 * The fragments are written to stack after a user's own wording rather than
 * fight it: they describe medium and treatment, never subject matter.
 */
export const IMAGE_STYLE_PROMPTS: Record<ImageStylePreset, string> = {
  Photorealistic: "photorealistic, sharp focus, natural lighting, high detail",
  Cinematic: "cinematic still, anamorphic lens, dramatic key light, shallow depth of field, film grain",
  "Product Photo": "studio product photography, seamless backdrop, soft box lighting, crisp reflections",
  "Oil Painting": "oil painting, visible brushwork, rich impasto texture, canvas grain",
  Watercolor: "watercolor painting, soft washes, bleeding pigment, textured paper",
  Anime: "anime illustration, clean cel shading, expressive linework, vibrant palette",
  "Comic Book": "comic book art, bold ink outlines, halftone shading, saturated flats",
  Cartoon: "cartoon illustration, simplified shapes, thick outlines, bright flat colors",
  "3D Render": "3D render, physically based materials, global illumination, soft shadows",
  Isometric: "isometric illustration, 45-degree view, clean geometry, soft ambient occlusion",
  "Pixel Art": "pixel art, limited palette, crisp pixel edges, retro game sprite",
  "Line Art": "line art, clean monoline strokes, no shading, white background",
  Sketch: "pencil sketch, graphite shading, loose construction lines, paper texture",
  "Concept Art": "concept art, painterly rendering, strong silhouette, moody atmosphere",
};

/**
 * Folds the selected style into the prompt that gets submitted. The composer's
 * textarea keeps showing only what the user typed — the style is a separate
 * control, so writing its wording back into the field would make it look like
 * their own text and survive switching the style off.
 */
export function applyImageStyle(prompt: string, style: ImageStylePreset | null): string {
  if (!style) return prompt;
  const fragment = IMAGE_STYLE_PROMPTS[style];
  const trimmed = prompt.trim();
  if (!trimmed) return fragment;
  return `${trimmed.replace(/[.,;\s]+$/, "")}, ${fragment}`;
}
