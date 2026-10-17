import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PAID_TIERS, TIER_INFO } from "@/lib/constants";
import { MARKETING_CATEGORIES, MARKETING_STYLES } from "@/lib/marketing-styles";
import { PRIMARY_CTA } from "@/lib/hosts";
import { openGraph } from "@/lib/seo";

// The ad-creative landing page. Every capability named here is one the app
// actually ships, and every number is read off the code: the style catalogue
// (marketing-styles.ts) and the plan ladder (TIER_INFO). No client logos, no
// "x% more conversions" — there are no case studies to back one yet.

const DESCRIPTION =
  "AI ad creative for brands: turn one product photo into product shots, ads, marketplace images, UGC-style clips and motion spots — then publish them from the same studio.";

export const metadata: Metadata = {
  title: "AI ad creative studio for brands",
  description: DESCRIPTION,
  alternates: { canonical: "/for-brands" },
  openGraph: openGraph({
    images: "file",
    title: "AI ad creative studio for brands",
    description: DESCRIPTION,
    path: "/for-brands",
  }),
};

const SUITE_TIER = PAID_TIERS.find((tier) => TIER_INFO[tier].creatorSuite);
const TEAM_TIER = PAID_TIERS.find((tier) => TIER_INFO[tier].seats > 1);
const API_TIER = PAID_TIERS.find((tier) => TIER_INFO[tier].apiAccess);

function stylesIn(categoryId: string) {
  return MARKETING_STYLES.filter((style) => style.category === categoryId).length;
}

export default function ForBrandsPage() {
  const steps = [
    {
      title: "Upload one product photo",
      body: "Start from the shot you already have. The marketing studio works from your real product and builds the scene around it.",
    },
    {
      title: "Pick the formats you need",
      body: `${MARKETING_STYLES.length} ready-made styles across ${MARKETING_CATEGORIES.length} formats, from clean packshots to UGC-style clips. Try a few and keep the ones that work.`,
    },
    {
      title: "Edit and publish",
      body: "Trim, caption and add music in the editing studio, then publish straight to TikTok, Instagram, YouTube and Facebook.",
    },
  ];

  const blocks = [
    {
      title: "AI influencers for UGC-style ads",
      body: "Design a presenter once — face, body and style stay locked across every video — and use them in UGC-style clips. No casting, no shoot, the same face in every campaign.",
      href: "/features",
      link: "See AI Influencer",
    },
    {
      title: "Recast footage you already own",
      body: "Genjutsu swaps a product, an outfit or a person in an existing clip and keeps every move, so one shoot becomes many variations.",
      href: "/features",
      link: "See Genjutsu",
    },
    {
      title: "Every top model, one bill",
      body: "Seedance, Kling, Veo, GPT Image, Nano Banana and more on one credit balance. Switch model when a result isn't right, without another subscription.",
      href: "/models",
      link: "Browse the models",
    },
  ];

  const team = [
    SUITE_TIER && `Marketing studio, editing studio and publishing from the ${TIER_INFO[SUITE_TIER].label} plan`,
    TEAM_TIER &&
      `${TIER_INFO[TEAM_TIER].label}: ${TIER_INFO[TEAM_TIER].seats} seats in a shared workspace, one credit pool`,
    API_TIER && `API access on ${TIER_INFO[API_TIER].label}, to generate creative from your own pipeline`,
    "Commercial licence on every paid plan",
  ].filter((line): line is string => Boolean(line));

  return (
    <div className="container-page py-14 sm:py-20">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "For brands" }]} />

      <header className="mt-8 max-w-3xl">
        <h1 className="text-heading font-light text-ink sm:text-display">
          One product photo. <span className="text-gradient">Every ad you need.</span>
        </h1>
        <p className="mt-4 text-body-lg text-muted">
          Vixlens turns the product shots you already have into ad creative — studio stills,
          headline ads, marketplace images, UGC-style clips and motion spots — and publishes them
          from the same place.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={PRIMARY_CTA.href} className={buttonVariants({ variant: "accent" })}>
            {PRIMARY_CTA.label}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link href="/contact" className={buttonVariants({ variant: "secondary" })}>
            Talk to us
          </Link>
        </div>
      </header>

      <section className="mt-16">
        <h2 className="text-heading font-bold text-ink">How it works</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title}>
              <Card variant="compact" className="h-full">
                <p className="font-mono text-caption text-brand-ink">0{i + 1}</p>
                <h3 className="mt-2 text-feature-title font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-body-sm text-muted">{step.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16">
        <h2 className="text-heading font-bold text-ink">Formats</h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {MARKETING_CATEGORIES.map((category) => (
            <li key={category.id} className="rounded-2xl border border-line bg-surface-2 p-5">
              <p className="text-caption text-muted uppercase">
                {category.kind} · {stylesIn(category.id)} styles
              </p>
              <h3 className="mt-2 text-feature-title font-semibold text-ink">{category.label}</h3>
              <p className="mt-2 text-body-sm text-muted">{category.blurb}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-3">
        {blocks.map((block) => (
          <Card key={block.title} variant="compact" className="flex flex-col">
            <h2 className="text-feature-title font-semibold text-ink">{block.title}</h2>
            <p className="mt-2 text-body-sm text-muted">{block.body}</p>
            <Link href={block.href} className="mt-auto pt-4 text-label font-semibold text-brand-ink hover:underline">
              {block.link}
            </Link>
          </Card>
        ))}
      </section>

      <section className="mt-16 max-w-3xl">
        <h2 className="text-heading font-bold text-ink">For teams</h2>
        <ul className="mt-6 space-y-3">
          {team.map((line) => (
            <li key={line} className="flex gap-3 text-body text-ink-soft">
              <Check className="mt-1 size-4 shrink-0 text-brand-ink" aria-hidden="true" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-body-sm text-muted">
          Building creative at volume?{" "}
          <Link href="/developers" className="text-brand-ink underline-offset-4 hover:underline">
            See the API
          </Link>
          .
        </p>
      </section>

      <section className="mt-20 rounded-2xl border border-line bg-surface-2 px-6 py-12 text-center sm:px-12">
        <h2 className="text-heading font-bold text-ink">Want a walkthrough for your brand?</h2>
        <p className="mx-auto mt-3 max-w-xl text-body text-muted">
          Tell us what you sell and the channels you run, and we&apos;ll show you how Vixlens fits.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/contact" className={buttonVariants({ variant: "accent" })}>
            Contact us
          </Link>
          <Link href="/pricing" className={buttonVariants({ variant: "secondary" })}>
            See pricing
          </Link>
        </div>
      </section>
    </div>
  );
}
