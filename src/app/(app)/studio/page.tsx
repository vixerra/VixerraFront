import type { Metadata } from "next";
import { MarketingStudio } from "@/components/studio/marketing-studio";
import { CreatorSuiteGate } from "@/components/upgrade-gate";

export const metadata: Metadata = {
  title: "Marketing studio",
  description:
    "Ad-ready images and video from your own product and talent — pick a style, attach your assets, write a one-line brief.",
};

export default function MarketingStudioPage() {
  return (
    // The studio has no endpoint of its own to refuse — it submits through
    // the ordinary generation routes, which every plan may call — so this
    // route is where TIER_INFO.creatorSuite is enforced for it.
    <CreatorSuiteGate feature="marketing-studio">
      <MarketingStudio />
    </CreatorSuiteGate>
  );
}
