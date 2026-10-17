import { metadata } from "./page";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og-card";

// This page's social card, drawn from the same title and description as its
// metadata so the two can't disagree.
const title = typeof metadata.title === "string" ? metadata.title : "Vixlens";

export const alt = title;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({ title, subtitle: metadata.description ?? undefined });
}
