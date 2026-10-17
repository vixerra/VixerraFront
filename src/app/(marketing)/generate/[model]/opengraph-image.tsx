import { CATEGORY_LABEL, modelCatalogEntry, modelPageBySlug } from "@/lib/model-seo";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og-card";
import { SITE_NAME } from "@/lib/seo";

// One card per model page: its name, maker and tagline. The alt text names
// the model too (og:image:alt), which a static `alt` export can't.

type Params = { model: string };

function lookup(slug: string) {
  const page = modelPageBySlug(slug);
  const entry = page && modelCatalogEntry(page.id);
  return page && entry ? { page, entry } : null;
}

export async function generateImageMetadata({ params }: { params: Params | Promise<Params> }) {
  const { model } = await params;
  const found = lookup(model);
  const alt = found
    ? `${found.entry.label} — AI ${found.entry.category === "text-to-image" ? "image" : "video"} generator · ${SITE_NAME}`
    : `AI models on ${SITE_NAME}`;
  return [{ id: "card", alt, size: OG_SIZE, contentType: OG_CONTENT_TYPE }];
}

export default async function Image({ params }: { params: Params | Promise<Params> }) {
  const { model } = await params;
  const found = lookup(model);
  if (!found) return ogCard({ title: `AI models on ${SITE_NAME}` });
  return ogCard({
    eyebrow: `${CATEGORY_LABEL[found.entry.category]} · ${found.entry.provider}`,
    title: found.entry.label,
    subtitle: found.page.tagline,
  });
}
