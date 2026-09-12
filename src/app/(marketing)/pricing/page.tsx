import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TIERS, TIER_INFO, CREDIT_VALUE_USD } from "@/lib/constants";
import { PlanFeatureList } from "@/components/pricing/plan-feature-list";
import { PlanPrice } from "@/components/pricing/plan-price";
import { JsonLd } from "@/components/seo/json-ld";
import { faqPageJsonLd } from "@/lib/faqs";
import { pricingProductJsonLd } from "@/lib/structured-data";
import { openGraph } from "@/lib/seo";
import { appHref } from "@/lib/hosts";

export const metadata: Metadata = {
  title: "AI video generator pricing",
  description:
    "Credit-based pricing for AI video and image generation. Start free with no credit card — watermark-free export and a commercial licence from Starter up.",
  alternates: { canonical: "/pricing" },
  openGraph: openGraph({
    title: "AI video generator pricing",
    description:
      "Credit-based pricing for AI video and image generation. Start free with no credit card — watermark-free export and a commercial licence from Starter up.",
    path: "/pricing",
  }),
};

// Plan names come from TIER_INFO rather than being written out here: this
// list still said "Découverte"/"Créateur" after the cards had been renamed,
// because the labels only lived in one of the two places.
const FAQS = [
  {
    q: "What's a credit?",
    a: `Credits are consumed per generation based on model, resolution, and duration — video costs scale with the underlying compute, so a longer or higher-resolution clip costs more than a quick 480p one. Each credit is worth $${CREDIT_VALUE_USD}, and the exact cost is always shown before you generate.`,
  },
  {
    q: "Which plans include the marketing studio, editing studio, and social publishing?",
    a: `${TIER_INFO.creator.label} and ${TIER_INFO.studio.label}. Both unlock the marketing studio (ad-ready images and video built from your own product and talent shots), the editing studio (trim, caption, add music, and export a finished MP4), and one-click publishing to TikTok, Instagram, YouTube, and Facebook. ${TIER_INFO.free.label} and ${TIER_INFO.starter.label} cover generation and your gallery.`,
  },
  {
    q: "Do unused credits roll over?",
    a: `On ${TIER_INFO.creator.label} and ${TIER_INFO.studio.label}, unused monthly credits roll over for 1 extra month. ${TIER_INFO.starter.label} credits reset each month. ${TIER_INFO.free.label} works differently: its ${TIER_INFO.free.monthlyCredits} credits are granted once and never expire, so there is nothing to reset — but nothing to renew either.`,
  },
  {
    q: "Can I change plans anytime?",
    a: "Yes — upgrades and downgrades apply immediately from your billing settings.",
  },
  {
    q: "Is there a free trial?",
    a: `The ${TIER_INFO.free.label} plan gives you ${TIER_INFO.free.monthlyCredits} credits when you sign up — no credit card required. They're a one-time grant rather than a monthly allowance, and they never expire, so you can spend them whenever you like. After that, top up with a credit pack or move to a paid plan for a monthly refill.`,
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
        <h1 className="text-heading font-bold tracking-tight text-ink sm:text-display">
          <span className="text-gradient">Pricing</span>
        </h1>
        <p className="mt-4 text-body text-muted">
          Simple credit-based pricing. Pay for what you generate, cancel anytime.
        </p>
      </div>

      <div className="mt-16 grid gap-6 lg:grid-cols-4">
        {TIERS.map((tier) => {
          const info = TIER_INFO[tier];
          const isPopular = tier === "creator";
          return (
            <Card
              key={tier}
              variant="standard"
              className={cn(
                "flex flex-col",
                isPopular && "relative border-brand/40 shadow-glow-sm",
              )}
            >
              {isPopular && (
                <Badge
                  variant="brand"
                  className="absolute -top-3 left-1/2 -translate-x-1/2 shadow-glow-sm"
                >
                  Most popular
                </Badge>
              )}
              <h2 className="text-subheading font-semibold text-ink">{info.label}</h2>
              <p className="mt-4 flex items-baseline gap-1">
                <PlanPrice
                  priceMonthly={info.priceMonthly}
                  className="text-heading font-bold text-ink"
                  suffixClassName="text-body-sm text-muted"
                />
              </p>
              <PlanFeatureList
                features={info.features}
                note={info.featuresNote}
                className="mt-6 flex-1"
              />
              <Link
                href={appHref("/signup")} prefetch={false}
                className={buttonVariants({
                  variant: isPopular ? "primary" : "secondary",
                  className: "mt-8 w-full",
                })}
              >
                Get started
              </Link>
            </Card>
          );
        })}
      </div>

      <p className="mx-auto mt-6 max-w-2xl text-center text-caption text-muted">
        Model quantities are estimates assuming 100% of that month&apos;s credits are spent on a
        single format — mix and match images and video freely, and the exact cost is always shown
        before you generate.
      </p>

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
