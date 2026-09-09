import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { buttonVariants } from "@/components/ui/button";
import { TIER_INFO } from "@/lib/constants";
import { CATEGORY_LABEL, MODEL_PAGES, modelCatalogEntry } from "@/lib/model-seo";
import { openGraph, SITE_NAME } from "@/lib/seo";

// The hub every /generate/[model] page links back to, and the reason those
// pages aren't orphans: without it they'd be reachable only from the sitemap,
// which is a discovery hint rather than a link.

export const metadata: Metadata = {
  title: "All AI video and image models",
  description:
    "Every AI video and image model on Vixerra — Seedance, Veo 3.1, Flux, Grok Imagine, GPT Image 2, Nano Banana, Recraft and more, with specs and prompts.",
  alternates: { canonical: "/models" },
  openGraph: openGraph({
    title: "All AI video and image models",
    description:
      "Every AI video and image model available on Vixerra, with specs and example prompts for each.",
    path: "/models",
  }),
};

const GROUPS = [
  {
    id: "text-to-video" as const,
    heading: "AI video models",
    blurb:
      "Text-to-video models — describe a shot and get a finished clip back, most of them with a soundtrack generated alongside the picture.",
  },
  {
    id: "image-to-video" as const,
    heading: "Image-to-video models",
    blurb:
      "Upload a still and describe the motion. These models need an image; the prompt directs what happens to it.",
  },
  {
    id: "text-to-image" as const,
    heading: "AI image models",
    blurb:
      "Text-to-image models, from fast draft tiers through to 4K finals and production-ready SVG.",
  },
];

export default function ModelsIndexPage() {
  const entries = MODEL_PAGES.map((page) => ({ page, entry: modelCatalogEntry(page.id) })).filter(
    (row): row is { page: (typeof MODEL_PAGES)[number]; entry: NonNullable<typeof row.entry> } =>
      Boolean(row.entry),
  );

  return (
    <div className="container-page py-14 sm:py-20">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Models" }]} />

      <header className="mt-8 max-w-2xl">
        <h1 className="text-heading font-bold tracking-tight text-ink sm:text-display">
          Every model on <span className="text-gradient">{SITE_NAME}</span>
        </h1>
        <p className="mt-4 text-body-lg text-muted">
          {entries.length} AI video and image models from ByteDance, Google, OpenAI, xAI, Black
          Forest Labs, MiniMax, Alibaba, Vidu, Recraft, Leonardo and Pruna — one account, one
          credit balance, no per-provider subscriptions.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className={buttonVariants({ variant: "accent" })}>
            Start free — {TIER_INFO.free.monthlyCredits} credits
          </Link>
          <Link href="/pricing" className={buttonVariants({ variant: "secondary" })}>
            See pricing
          </Link>
        </div>
      </header>

      {GROUPS.map((group) => {
        const rows = entries.filter((row) => row.entry.category === group.id);
        if (rows.length === 0) return null;
        return (
          <section key={group.id} className="mt-16">
            <h2 className="text-heading font-bold text-ink">{group.heading}</h2>
            <p className="mt-3 max-w-2xl text-body text-muted">{group.blurb}</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map(({ page, entry }) => (
                <Link
                  key={page.slug}
                  href={`/generate/${page.slug}`}
                  className="group flex flex-col rounded-2xl border border-line bg-surface-2 p-6 transition-colors hover:border-border-strong hover:bg-surface-3"
                >
                  <span className="text-caption text-muted">
                    {entry.provider} · {CATEGORY_LABEL[entry.category]}
                  </span>
                  <h3 className="mt-2 text-feature-title font-semibold text-ink group-hover:text-brand">
                    {entry.label}
                  </h3>
                  <p className="mt-2 text-body-sm text-muted">{page.tagline}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-label font-semibold text-brand">
                    Specs and prompts
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
