import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { faqPageJsonLd, HOME_FAQS } from "@/lib/faqs";
import { softwareApplicationJsonLd } from "@/lib/structured-data";

import { Hero } from "@/components/landing/hero";
import { PlansSection } from "@/components/landing/plans-section";
import { SeedancePromoBanner } from "@/components/landing/seedance-promo-banner";
import { Wan3UnlimitedBanner } from "@/components/landing/wan3-unlimited-banner";
import { Kling4LaunchBanner } from "@/components/landing/kling4-launch-banner";
import { FeatureLaunches } from "@/components/landing/feature-launches";
import { FeaturesShowcase } from "@/components/landing/features-showcase";
import { CapabilityConcepts } from "@/components/landing/capability-concepts";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LightBeam } from "@/components/marketing/light-beam";
import { ModelStrip } from "@/components/landing/model-strip";
import { ModelCarousel } from "@/components/landing/model-carousel";
import { ShowcaseTabs } from "@/components/landing/showcase-tabs";
import { Personas } from "@/components/landing/personas";
import { CreatorUseCases } from "@/components/landing/creator-use-cases";
import { TrustBar } from "@/components/landing/trust-bar";
import { Testimonials } from "@/components/landing/testimonials";
import { FaqAccordion } from "@/components/landing/faq-accordion";
import { CtaSection } from "@/components/landing/cta-section";
import { HOME_PROMO } from "@/lib/home-promo";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function LandingPage() {
  return (
    <>
      {/* Product and pricing, plus the FAQ block further down this page — all
          emitted from the same data the page renders (TIER_INFO, HOME_FAQS)
          rather than restated. Organization and WebSite come from the
          marketing layout. */}
      <JsonLd
        data={[
          softwareApplicationJsonLd,
          faqPageJsonLd(HOME_FAQS),
        ]}
      />
      {/* Product-first: what's new (the launch carousel) and what Vixlens
          does lead; the plans come once, near the end, for visitors who've
          seen enough to want them. */}
      <Hero />
      {HOME_PROMO === "kling4-launch" && <Kling4LaunchBanner />}
      {HOME_PROMO === "wan3-unlimited" && <Wan3UnlimitedBanner />}
      <FeatureLaunches />
      <TrustBar />
      {HOME_PROMO === "seedance" && <SeedancePromoBanner />}
      <FeaturesShowcase />
      {/*<CapabilityConcepts />*/}
      <HowItWorks />

      <LightBeam className="container-page" />
      <ModelStrip />

      <section id="showcase" className="container-page py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-heading font-bold text-ink">See it in action</h2>
          <p className="mt-4 text-body text-muted">
            Real output from the models behind Vixlens — no cherry-picked renders, just what
            the pipeline produces. Tap any card to try that exact model yourself.
          </p>
        </div>

        <div className="mt-12">
          <ModelCarousel />
        </div>

        <div className="mt-14">
          <ShowcaseTabs />
        </div>
      </section>

      <Personas />
      <CreatorUseCases />
      <Testimonials />
      <PlansSection />
      <FaqAccordion />
      <CtaSection />
    </>
  );
}
