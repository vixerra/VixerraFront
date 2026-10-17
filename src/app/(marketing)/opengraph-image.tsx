import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og-card";

export const alt = "Vixlens — AI video generator and AI image generator";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({
    eyebrow: "AI video & image studio",
    title: "Recast any video. Create AI influencers.",
    subtitle: "Every top AI video and image model in one studio.",
  });
}
