import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { buttonVariants } from "@/components/ui/button";
import { getCloudflareModel, type DynamicField } from "@/lib/cloudflare-models";
import { TIER_INFO, type TierInfo } from "@/lib/constants";
import { estimateVideoCredits } from "@/lib/credit-estimate";
import { durationSeconds } from "@/lib/marketing-models";
import { bestAllowedDuration, bestAllowedResolution } from "@/lib/tier-limits";
import { faqPageJsonLd, type Faq } from "@/lib/faqs";
import { appHref } from "@/lib/hosts";
import { CATEGORY_LABEL, MODEL_PAGES, modelCatalogEntry } from "@/lib/model-seo";
import { SITE_NAME } from "@/lib/seo";

// The generic-keyword landing pages (/ai-video-generator, /ai-image-generator).
//
// The per-model pages rank for "Veo 3.1" or "GPT Image 2"; nothing on the site
// was written for the head term people actually type before they know a model
// name. These pages are that entry point, and then a hub: every model card
// links down to its /generate/[model] page. Copy lives in the page files; the
// model list and plan numbers are read from the catalog and TIER_INFO, so
// neither can go stale here.

export type GeneratorKind = "video" | "image";

export type GeneratorLandingContent = {
  kind: GeneratorKind;
  /** Visible H1 — the exact phrase the page targets. */
  heading: string;
  tagline: string;
  intro: string;
  steps: { title: string; detail: string }[];
  showcase: { label: string; kind: GeneratorKind; items: { url: string; prompt: string }[] };
  primaryCta: { label: string; href: string };
  faqs: Faq[];
  sibling: { href: string; label: string; blurb: string };
};

/** Landing-page models of one kind, with their catalog entry attached. */
export function generatorModels(kind: GeneratorKind) {
  return MODEL_PAGES.flatMap((page) => {
    const entry = modelCatalogEntry(page.id);
    if (!entry) return [];
    const isImage = entry.category === "text-to-image";
    return isImage === (kind === "image") ? [{ page, entry }] : [];
  });
}

/** One model per provider, so a short "X, Y and Z" list shows range rather
 *  than three versions of the same family. */
export function featuredModelLabels(models: ReturnType<typeof generatorModels>, count: number) {
  const seen = new Set<string>();
  return models
    .filter(({ entry }) => {
      if (seen.has(entry.provider)) return false;
      seen.add(entry.provider);
      return true;
    })
    .slice(0, count)
    .map(({ entry }) => entry.label);
}

/** The longest clip a plan can submit on this duration field, if any. */
function longestAllowedSeconds(field: DynamicField | undefined, tierInfo: TierInfo) {
  if (!field) return undefined;
  if (field.options) {
    const option = bestAllowedDuration(field.options, durationSeconds, tierInfo);
    return option === undefined ? undefined : durationSeconds(option);
  }
  if ((field.min ?? 0) > tierInfo.maxDurationSeconds) return undefined;
  return Math.min(tierInfo.maxDurationSeconds, field.max ?? tierInfo.maxDurationSeconds);
}

/**
 * What the Free grant buys in video, or undefined when it buys none: the
 * cheapest video model at the longest clip Free's resolution and duration
 * caps allow. Every model is open to every plan, so this is purely a question
 * of credits. Priced by the same estimate the composer charges, so the page
 * can't promise more clips than the credits cover.
 */
export function freeVideoOffer() {
  const { free } = TIER_INFO;
  const offers = generatorModels("video").flatMap(({ page, entry }) => {
    const config = getCloudflareModel(page.id);
    if (!config) return [];
    const resolutionOptions = config.fields.find((f) => f.key === "resolution")?.options ?? [];
    const resolution = bestAllowedResolution(resolutionOptions, free);
    const seconds = longestAllowedSeconds(config.fields.find((f) => f.key === "duration"), free);
    if (!resolution || seconds === undefined) return [];
    const credits = estimateVideoCredits(page.id, seconds, resolution);
    const clips = Math.floor(free.monthlyCredits / credits);
    return clips > 0 ? [{ label: entry.label, credits, clips, seconds, resolution }] : [];
  });
  return offers.sort((a, b) => a.credits - b.credits)[0];
}

/** "a", "a and b", "a, b and c". */
export function listPhrase(items: string[]) {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

export function GeneratorLanding({ content }: { content: GeneratorLandingContent }) {
  const models = generatorModels(content.kind);

  return (
    <div className="container-page py-14 sm:py-20">
      <JsonLd data={faqPageJsonLd(content.faqs)} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: content.heading }]} />

      {/* ------------------------------------------------------------ hero */}
      <header className="mt-8 max-w-3xl">
        <h1 className="text-heading font-bold tracking-tight text-ink sm:text-display">
          <span className="text-gradient">{content.heading}</span>
        </h1>
        <p className="mt-4 text-body-lg text-muted">{content.tagline}</p>
        <p className="mt-4 text-body text-ink-soft">{content.intro}</p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href={content.primaryCta.href}
            prefetch={false}
            className={buttonVariants({ variant: "accent" })}
          >
            <Sparkles className="size-4" aria-hidden="true" />
            {content.primaryCta.label}
          </Link>
          <Link href={appHref("/signup")} prefetch={false} className={buttonVariants({ variant: "secondary" })}>
            Start free — {TIER_INFO.free.monthlyCredits} credits
          </Link>
        </div>
      </header>

      {/* ------------------------------------------------------- real output */}
      <section className="mt-16">
        <h2 className="text-heading font-bold text-ink">Made with {content.showcase.label}</h2>
        <p className="mt-3 max-w-2xl text-body text-muted">
          Real output from {content.showcase.label} on {SITE_NAME}, with the prompt that produced it.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {content.showcase.items.map((item) => (
            <figure key={item.url + item.prompt} className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-2xl border border-line bg-surface-2">
                {content.showcase.kind === "video" ? (
                  // Same still-frame trick as /generate/[model]: "#t=0.1"
                  // makes the browser paint a frame without downloading more.
                  <video
                    className="aspect-square w-full object-cover"
                    src={`${item.url}#t=0.1`}
                    controls
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    aria-label={item.prompt}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- local asset from public/media
                  <img
                    src={item.url}
                    alt={item.prompt}
                    loading="lazy"
                    decoding="async"
                    className="aspect-square w-full object-cover"
                  />
                )}
              </div>
              <figcaption className="text-body-sm text-muted">{item.prompt}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ how it works */}
      <section className="mt-16">
        <h2 className="text-heading font-bold text-ink">How the AI {content.kind} generator works</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {content.steps.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface-2 p-6 shadow-card">
              <span className="text-caption font-semibold text-brand">Step {i + 1}</span>
              <h3 className="text-feature-title font-semibold text-ink">{step.title}</h3>
              <p className="text-body-sm text-muted">{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ----------------------------------------------------------- models */}
      <section className="mt-16">
        <h2 className="text-heading font-bold text-ink">
          {models.length} AI {content.kind} models in one place
        </h2>
        <p className="mt-3 max-w-2xl text-body text-muted">
          One account and one credit balance for all of them. Open a model for its specs and example prompts.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {models.map(({ page, entry }) => (
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
            </Link>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------------- faq */}
      <section className="mt-16 max-w-3xl">
        <h2 className="text-heading font-bold text-ink">{content.heading} FAQ</h2>
        <dl className="mt-8 space-y-6">
          {content.faqs.map((faq) => (
            <div key={faq.question}>
              <dt className="text-feature-title font-semibold text-ink">{faq.question}</dt>
              <dd className="mt-2 text-body text-muted">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ----------------------------------------------------------- sibling */}
      <Link
        href={content.sibling.href}
        className="group mt-16 flex flex-col gap-2 rounded-2xl border border-line bg-surface-2 p-6 transition-colors hover:border-border-strong hover:bg-surface-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 className="text-feature-title font-semibold text-ink group-hover:text-brand">
            {content.sibling.label}
          </h2>
          <p className="mt-1 text-body-sm text-muted">{content.sibling.blurb}</p>
        </div>
        <ArrowUpRight className="size-5 shrink-0 text-brand" aria-hidden="true" />
      </Link>

      {/* --------------------------------------------------------------- cta */}
      <section className="mt-20 rounded-2xl border border-line bg-surface-2 px-6 py-12 text-center sm:px-12">
        <h2 className="text-heading font-bold text-ink">Try the AI {content.kind} generator</h2>
        <p className="mx-auto mt-3 max-w-xl text-body text-muted">
          {TIER_INFO.free.monthlyCredits} free credits on sign-up, no credit card required.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={appHref("/signup")} prefetch={false} className={buttonVariants({ variant: "accent" })}>
            Create a free account
          </Link>
          <Link href="/pricing" className={buttonVariants({ variant: "secondary" })}>
            See pricing
          </Link>
        </div>
      </section>
    </div>
  );
}
