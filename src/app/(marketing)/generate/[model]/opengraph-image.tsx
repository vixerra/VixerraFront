import { CATEGORY_LABEL, modelCatalogEntry, modelPageBySlug } from "@/lib/model-seo";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og-card";

// One card per model page: its name, maker and tagline.
export const alt = "AI model on Vixlens";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ model: string }> }) {
  const { model } = await params;
  const page = modelPageBySlug(model);
  const entry = page && modelCatalogEntry(page.id);
  if (!page || !entry) return ogCard({ title: "AI models on Vixlens" });
  return ogCard({
    eyebrow: `${CATEGORY_LABEL[entry.category]} · ${entry.provider}`,
    title: entry.label,
    subtitle: page.tagline,
  });
}
