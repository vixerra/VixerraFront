import type { Metadata } from "next";
import { GenjutsuStudio } from "@/components/genjutsu/genjutsu-studio";
import { GENJUTSU_NAME } from "@/lib/genjutsu";

export const metadata: Metadata = {
  title: GENJUTSU_NAME,
  description: "Recast any clip with your own characters, products, outfits and places, keeping its motion and camera.",
};

export default function GenjutsuPage() {
  return <GenjutsuStudio />;
}
