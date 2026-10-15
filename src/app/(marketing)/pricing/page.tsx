import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  PAID_TIERS,
  TIER_INFO,
  CREDIT_VALUE_USD,
  ANNUAL_PRICE,
  LAUNCH_OFFER,
  UNLIMITED_PROMO,
  WAN3_CREDITS_PER_SECOND_FROM,
} from "@/lib/constants";
import { formatListPrice } from "@/lib/competitor-pricing";
import {
  LaunchOfferPlanCta,
  LaunchOfferPlanFlag,
  LaunchOfferStrip,
} from "@/components/landing/launch-offer";
import { ModelCarousel } from "@/components/landing/model-carousel";
import { PlanCta } from "@/components/pricing/plan-cta";
import { PlanFeatureList } from "@/components/pricing/plan-feature-list";
import {
  BillingIntervalProvider,
  BillingIntervalToggle,
  PlanCardPrice,
} from "@/components/pricing/billing-interval";
import {
  PricingPromoBadge,
  PricingPromoField,
  PricingPromoProvider,
} from "@/components/pricing/pricing-promo";
import { JsonLd } from "@/components/seo/json-ld";
import { faqPageJsonLd } from "@/lib/faqs";
import { pricingProductJsonLd } from "@/lib/structured-data";
import { keywords, openGraph } from "@/lib/seo";

const DESCRIPTION =
  "Credit-based pricing for AI video and image generation, from Starter at " +
  `${formatListPrice(LAUNCH_OFFER.priceMonthly)}/month. Watermark-free export, a commercial licence, ` +
  "and up to two months free on annual Creator and Studio plans.";

export const metadata: Metadata = {
  title: "AI video generator pricing",
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: openGraph({
    title: "AI video generator pricing",
    description: DESCRIPTION,
    path: "/pricing",
  }),
  keywords: keywords(
    "AI video generator pricing",
    "AI image generator pricing",
    "AI video credits",
    "Wan 3.0 unlimited",
  ),
};

const STARTER = TIER_INFO[LAUNCH_OFFER.tier];

// Plan names come from TIER_INFO rather than being written out here: this
// list still said "Découverte"/"Créateur" after the cards had been renamed,
// because the labels only lived in one of the two places.
const FAQS = [
  {
    q: "What's a credit?",
    a: `Credits are consumed per generation based on model, resolution, and duration — video costs scale with the underlying compute, so a longer or higher-resolution clip costs more than a quick 480p one. A credit pack sells them at $${CREDIT_VALUE_USD} each, and the plans for less. The exact cost is always shown before you generate.`,
  },
  {
    q: "What is Wan 3.0 Unlimited?",
    a: `For your first ${UNLIMITED_PROMO.days} days on ${TIER_INFO.creator.label} or ${TIER_INFO.studio.label}, Wan 3.0 videos are unlimited in Relax mode: ${TIER_INFO.creator.label} at 480p (720p on annual), ${TIER_INFO.studio.label} at 720p, one job at a time (two on ${TIER_INFO.studio.label} annual). Relax runs share a queue whose speed varies with demand; your credits still buy instant runs in the priority queue at any time. It is available once per account, on vixlens.com only (not through the API). Afterwards Wan 3.0 costs credits, from ${WAN3_CREDITS_PER_SECOND_FROM} credits a second.`,
  },
  {
    q: "Which plans include the marketing studio, editing studio, and social publishing?",
    a: `${TIER_INFO.creator.label} and ${TIER_INFO.studio.label}. Both unlock the marketing studio (ad-ready images and video built from your own product and talent shots), the editing studio (trim, caption, add music, and export a finished MP4), and one-click publishing to TikTok, Instagram, YouTube, and Facebook. ${STARTER.label} covers generation and your gallery.`,
  },
  {
    q: "Do unused credits roll over?",
    a: `On ${TIER_INFO.creator.label} and ${TIER_INFO.studio.label}, unused monthly credits roll over for 1 extra month. ${STARTER.label} credits reset each month. Annual plans are billed once a year and still receive their credits every month.`,
  },
  {
    q: "How does annual billing work?",
    a: `${TIER_INFO.creator.label} and ${TIER_INFO.studio.label} can be paid yearly: ${formatListPrice(ANNUAL_PRICE.creator ?? 0)} a year for ${TIER_INFO.creator.label} (two months free) and ${formatListPrice(ANNUAL_PRICE.studio ?? 0)} for ${TIER_INFO.studio.label}. You're charged once a year and receive the same credits every month. ${STARTER.label} is monthly only.`,
  },
  {
    q: "Can I change plans anytime?",
    a: "Yes — upgrades and downgrades apply immediately from your billing settings.",
  },
  {
    q: "Is there a free plan?",
    a: `Not any more: ${STARTER.label} is the way in. Its launch offer is ${formatListPrice(LAUNCH_OFFER.priceMonthly)} a month for ${STARTER.monthlyCredits.toLocaleString("en-US")} credits, kept for as long as you stay subscribed by the first ${LAUNCH_OFFER.places} subscribers; after that ${STARTER.label} is ${formatListPrice(STARTER.priceMonthly)} a month. The gallery is open without an account. If you already had free credits, they stay valid until you use them.`,
  },
];

export default function PricingPage() {
  return (
    <div className="container-page py-20 sm:py-28">
      {/* Offers come from TIER_INFO, the FAQ payload from the same FAQS array
          rendered below — structured data that disagrees with the visible page
          is a markup violation rather than a bonus. */}
      <JsonLd
        data={[
          pricingProductJsonLd,
          faqPageJsonLd(FAQS.map((faq) => ({ question: faq.q, answer: faq.a }))),
        ]}
      />
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-heading font-light text-ink sm:text-display">
          <span className="text-gradient">Pricing</span>
        </h1>
        <p className="mt-4 text-body text-muted">
          Simple credit-based pricing. Pay for what you generate, cancel anytime.
        </p>
      </div>

      {/* Starter's launch offer (see launch-offer.tsx). Both it and the
          card flag below remove themselves once the offer sells out. */}
      <LaunchOfferStrip className="mx-auto mt-12 max-w-5xl" />

      {/* A promo code entered here shows its bonus on the cards it covers and
          rides along with their buttons to checkout (pricing-promo.tsx). */}
      <PricingPromoProvider>
        <PricingPromoField className="mx-auto mt-12 max-w-md" />

        {/* Annual by default; the cards and their buttons follow the toggle
            (billing-interval.tsx). */}
        <BillingIntervalProvider initial="annual">
          <div className="mt-12 flex justify-center">
            <BillingIntervalToggle />
          </div>

          <div id="plans" className="mt-10 grid scroll-mt-24 gap-6 lg:grid-cols-3">
            {PAID_TIERS.map((tier) => {
              const info = TIER_INFO[tier];
              const isPopular = tier === "creator";
              const isOffer = tier === LAUNCH_OFFER.tier;
              return (
                <Card
                  key={tier}
                  variant="standard"
                  className={cn(
                    "flex flex-col",
                    isPopular && "relative border-brand-ink/40 shadow-glow-sm",
                    isOffer && "relative",
                  )}
                >
                  {isOffer && <LaunchOfferPlanFlag />}
                  {isPopular && (
                    <Badge
                      variant="brand"
                      className="absolute -top-3 left-1/2 -translate-x-1/2 shadow-glow-sm"
                    >
                      Most popular
                    </Badge>
                  )}
                  <h2 className="text-subheading font-semibold text-ink">{info.label}</h2>
                  <PlanCardPrice
                    tier={tier}
                    className="mt-4"
                    priceClassName="text-heading font-bold text-ink"
                    suffixClassName="text-body-sm text-muted"
                  />
                  <PricingPromoBadge tier={tier} />
                  <PlanFeatureList
                    features={info.features}
                    note={info.featuresNote}
                    className="mt-6 flex-1"
                  />
                  {/* One primary on the grid, Creator's: Starter is the
                      launch badge's violet outline, Studio the plain grey. */}
                  {isOffer ? (
                    <LaunchOfferPlanCta className="mt-8 w-full" />
                  ) : (
                    <PlanCta
                      tier={tier}
                      variant={isPopular ? "primary" : "secondary"}
                      className="mt-8 w-full"
                    >
                      {/* One label per destination — identical "Get started"
                          links to different plans fail the a11y
                          identical-links-same-purpose check. */}
                      Get {info.label}
                    </PlanCta>
                  )}
                </Card>
              );
            })}
          </div>
        </BillingIntervalProvider>
      </PricingPromoProvider>

      <div className="mx-auto mt-6 max-w-2xl space-y-3 text-center text-caption text-muted">
        <p>
          Model quantities are estimates assuming 100% of that month&apos;s credits are spent on a
          single format — mix and match images and video freely, and the exact cost is always shown
          before you generate.
        </p>
        <p>
          Wan 3.0 Unlimited is available for {UNLIMITED_PROMO.days} days from your first{" "}
          {TIER_INFO.creator.label} or {TIER_INFO.studio.label} subscription, once per account.
          Unlimited generations run in Relax mode on vixlens.com only and are not available via the
          API. Relax mode speed may vary during high-traffic periods. Prices exclude VAT and local
          taxes where applicable.
        </p>
      </div>

      {/* No free trial any more, so the work itself makes the case: real
          output from the models every plan opens. */}
      <section className="mt-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-heading font-bold text-ink">What every plan can make</h2>
          <p className="mt-4 text-body text-muted">
            Real results from the models behind Vixlens. There&apos;s more in the{" "}
            <Link href="/gallery" className="text-ink underline underline-offset-4">
              gallery
            </Link>
            , no account needed.
          </p>
        </div>
        <div className="mt-12">
          <ModelCarousel />
        </div>
      </section>

      <div className="mx-auto mt-24 max-w-2xl">
        <h2 className="text-center text-heading font-bold text-ink">
          Frequently asked questions
        </h2>
        <dl className="mt-10 space-y-6">
          {FAQS.map((faq) => (
            <div key={faq.q} className="border-b border-line pb-6">
              <dt className="text-label font-medium text-ink">{faq.q}</dt>
              <dd className="mt-2 text-body-sm text-muted">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
