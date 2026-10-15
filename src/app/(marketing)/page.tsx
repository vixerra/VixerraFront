import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { faqPageJsonLd, HOME_FAQS } from "@/lib/faqs";
import {
  organizationJsonLd,
  softwareApplicationJsonLd,
  webSiteJsonLd,
} from "@/lib/structured-data";
import { keywords } from "@/lib/seo";
import { Hero } from "@/components/landing/hero";
import { PlansSection } from "@/components/landing/plans-section";
import { SeedancePromoBanner } from "@/components/landing/seedance-promo-banner";
import { Wan3UnlimitedBanner } from "@/components/landing/wan3-unlimited-banner";
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
import { Reviews } from "@/components/landing/reviews";
import { FaqAccordion } from "@/components/landing/faq-accordion";
import { CtaSection } from "@/components/landing/cta-section";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  keywords: keywords(
    "free AI video generator",
    "free AI image generator",
    "AI video and image generator",
    "Seedance",
    "Veo 3.1",
    "GPT Image 2",
  ),
};

export default function LandingPage() {
  return (
    <>
      {/* Identity, product and pricing for the site as a whole, plus the FAQ
          block further down this page — all emitted from the same data the
          page renders (TIER_INFO, HOME_FAQS) rather than restated. */}
      <JsonLd
        data={[
          organizationJsonLd,
          webSiteJsonLd,
          softwareApplicationJsonLd,
          faqPageJsonLd(HOME_FAQS),
        ]}
      />
      {/* Product-first: what's new (the launch carousel) and what Vixlens
          does lead; the plans come once, near the end, for visitors who've
          seen enough to want them. */}
      <Hero />
      <Wan3UnlimitedBanner />
      <FeatureLaunches />
      <TrustBar />
      <SeedancePromoBanner />
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
      <PlansSection />
      <FaqAccordion />
      <CtaSection />
    </>
  );
}
