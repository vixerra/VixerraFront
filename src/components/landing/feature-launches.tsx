import { Reveal } from "@/components/marketing/reveal";
import { AiInfluencerSlide } from "@/components/landing/ai-influencer-banner";
import { GenjutsuSlide } from "@/components/landing/genjutsu-slide";
import { LaunchCarousel } from "@/components/landing/launch-carousel";

/** The newest launches, newest first, as one carousel under the hero. */
export function FeatureLaunches() {
  return (
    <section className="container-page py-8 sm:py-12" aria-labelledby="feature-launches-title">
      <h2 id="feature-launches-title" className="sr-only">
        New on Vixlens
      </h2>
      <Reveal>
        <LaunchCarousel
          slides={[
            { id: "genjutsu", label: "Genjutsu", content: <GenjutsuSlide /> },
            { id: "influencer", label: "AI Influencer", content: <AiInfluencerSlide /> },
          ]}
        />
      </Reveal>
    </section>
  );
}
