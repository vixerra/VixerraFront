import type { Metadata } from "next";
import { InfluencerStudio } from "@/components/influencer/influencer-studio";

export const metadata: Metadata = {
  title: "AI Influencer",
  description: "Build a virtual influencer from traits, then animate it with any motion clip.",
};

export default function InfluencerPage() {
  return <InfluencerStudio />;
}
