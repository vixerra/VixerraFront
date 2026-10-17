import { guideBySlug } from "@/lib/guides";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og-card";

export const alt = "Vixlens guide";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) return ogCard({ title: "Vixlens guides" });
  return ogCard({ eyebrow: "Guide", title: guide.title, subtitle: guide.description });
}
