import { influencerModelLabel } from "@/lib/influencer";
import { modelCatalogEntry } from "@/lib/model-seo";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og-card";
import { fetchPublicGeneration, generationTitle, isVideoGeneration } from "@/lib/public-content";

// Fallback card for a gallery item with no still of its own (a video the
// provider returned without a poster frame). Items that have one use it as
// og:image instead — see generateMetadata in page.tsx, whose explicit image
// takes precedence over this file.
export const alt = "Shared generation on Vixlens";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await fetchPublicGeneration(id);
  if (!item) return ogCard({ title: "Vixlens community gallery" });
  const label = influencerModelLabel(item.model, item.parameters) ?? modelCatalogEntry(item.model)?.label;
  return ogCard({
    eyebrow: `${isVideoGeneration(item) ? "AI video" : "AI image"}${label ? ` · ${label}` : ""}`,
    title: generationTitle(item, { max: 70, modelLabel: label }),
  });
}
