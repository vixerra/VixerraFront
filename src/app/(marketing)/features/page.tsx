import type { Metadata } from "next";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ModelStrip } from "@/components/landing/model-strip";
import { openGraph } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Features — AI video, image and ad creative",
  description:
    "Text-to-video, image-to-video and text-to-image across every major model, plus a marketing studio, an editing studio and one-click publishing to social.",
  alternates: { canonical: "/features" },
  openGraph: openGraph({
    title: "Features — AI video, image and ad creative",
    description:
      "Text-to-video, image-to-video and text-to-image across every major model, plus a marketing studio, an editing studio and one-click publishing.",
    path: "/features",
  }),
};

export default function FeaturesPage() {
  return (
    <div>
      <div className="container-page py-20 text-center sm:py-28">
        <h1 className="text-heading font-bold tracking-tight text-ink sm:text-display">
          Built for every kind of <span className="text-gradient">creator</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-body text-muted">
          From product teasers to full campaigns — generate, iterate, and ship without a
          production crew.
        </p>
      </div>
      <ModelStrip />
      <FeaturesGrid />
      <HowItWorks />
    </div>
  );
}
