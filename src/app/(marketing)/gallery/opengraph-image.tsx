import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og-card";

export const alt = "Vixlens community gallery";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({
    eyebrow: "Community gallery",
    title: "AI video and image gallery",
    subtitle: "Every generation shared with the prompt and the model that made it.",
  });
}
