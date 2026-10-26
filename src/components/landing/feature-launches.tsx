import { Reveal } from "@/components/marketing/reveal";
import { AiInfluencerSlide } from "@/components/landing/ai-influencer-banner";
import { GenjutsuSlide } from "@/components/landing/genjutsu-slide";
import { Kling4Slide } from "@/components/landing/kling4-slide";
import { LaunchCarousel } from "@/components/landing/launch-carousel";

/** The newest launches, newest first, as one carousel under the trust bar:
 *  a new model and new features read as one story of a product that ships,
 *  rather than as separate banners competing for the same scroll. */
export function FeatureLaunches() {
  return (
    <section className="container-page py-12 sm:py-16" aria-labelledby="feature-launches-title">
      <Reveal>
        <p className="eyebrow">Just shipped</p>
        <h2 id="feature-launches-title" className="mt-2 mb-6 text-heading font-bold text-ink">
          New on Vixlens
        </h2>
        <LaunchCarousel
          slides={[
            { id: "kling-4", label: "Kling 4.0", content: <Kling4Slide /> },
            { id: "genjutsu", label: "Genjutsu", content: <GenjutsuSlide /> },
            { id: "influencer", label: "AI Influencer", content: <AiInfluencerSlide /> },
          ]}
        />
      </Reveal>
    </section>
  );
}
