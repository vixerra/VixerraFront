import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Check, Sparkles } from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { TIER_INFO } from "@/lib/constants";
import { SEEDANCE_MODEL_ID } from "@/lib/constants";
import { GPT_IMAGE_2_IMAGES } from "@/lib/gpt-image-2-showcase";
import { SEEDANCE25_SHOWCASE_VIDEOS } from "@/lib/showcase-media";
import {
  CATEGORY_LABEL,
  MODEL_PAGES,
  modelCatalogEntry,
  modelPageBySlug,
  modelSpecs,
  modelWorkspaceHref,
  relatedModelPages,
} from "@/lib/model-seo";
import { metaDescription, openGraph, SITE_NAME } from "@/lib/seo";

// A public, statically generated landing page per model.
//
// It deliberately sits in (marketing) and not in (app): every route under
// (app) is wrapped in AppShell, which bounces a signed-out visitor to /login
// before anything renders — so a crawler would only ever see a redirect. The
// workspace itself keeps /generate and /generate/image; the app router
// resolves those static segments before this dynamic one, and model-seo.ts
// fails the dev build if a slug ever collides with them.

export const dynamicParams = false;

export function generateStaticParams() {
  return MODEL_PAGES.map((page) => ({ model: page.slug }));
}

export async function generateMetadata(
  props: PageProps<"/generate/[model]">,
): Promise<Metadata> {
  const { model: slug } = await props.params;
  const page = modelPageBySlug(slug);
  const entry = page && modelCatalogEntry(page.id);
  if (!page || !entry) return {};

  const isVideo = entry.category !== "text-to-image";
  const title = `${entry.label} — AI ${isVideo ? "video" : "image"} generator`;
  const description = metaDescription(
    `${page.tagline} — ${entry.label} specs, example prompts and free credits on ${SITE_NAME}.`,
  );

  return {
    title,
    description,
    alternates: { canonical: `/generate/${page.slug}` },
    openGraph: openGraph({ title, description, path: `/generate/${page.slug}` }),
  };
}

/** Real, labelled output for the two models we actually have samples of.
 *  Everything else gets prompts as text only — borrowing another model's
 *  clip to decorate a page would be a claim about output we can't make. */
function modelShowcase(id: string) {
  if (id === SEEDANCE_MODEL_ID) {
    return {
      kind: "video" as const,
      items: SEEDANCE25_SHOWCASE_VIDEOS.slice(0, 3).map((v) => ({
        url: v.url,
        prompt: v.prompt,
      })),
    };
  }
  if (id === "openai/gpt-image-2") {
    return {
      kind: "image" as const,
      items: GPT_IMAGE_2_IMAGES.slice(0, 3).map((i) => ({ url: i.url, prompt: i.prompt })),
    };
  }
  return null;
}

export default async function ModelLandingPage(props: PageProps<"/generate/[model]">) {
  const { model: slug } = await props.params;
  const page = modelPageBySlug(slug);
  if (!page) notFound();

  const entry = modelCatalogEntry(page.id);
  if (!entry) notFound();

  const specs = modelSpecs(page.id);
  const related = relatedModelPages(page.id);
  const showcase = modelShowcase(page.id);
  const isVideo = entry.category !== "text-to-image";
  const kind = isVideo ? "video" : "image";

  const specValue = (label: string) => specs.find((s) => s.label === label)?.value;

  // Grounded in the spec table above, so these answers can't drift from what
  // the page itself shows.
  const faqs = [
    {
      question: `What is ${entry.label}?`,
      answer: `${entry.label} is ${
        isVideo ? "an AI video model" : "an AI image model"
      } from ${entry.provider}, available on ${SITE_NAME}. ${page.intro}`,
    },
    specValue("Duration") && {
      question: `How long can a ${entry.label} clip be?`,
      answer: `${entry.label} generates clips of ${specValue("Duration")}.`,
    },
    specValue("Resolution") && {
      question: `What resolution does ${entry.label} output?`,
      answer: `${entry.label} outputs at ${specValue("Resolution")} on ${SITE_NAME}.`,
    },
    specValue("Audio") && {
      question: `Does ${entry.label} generate audio?`,
      answer:
        specValue("Audio") === "Generated with the clip"
          ? `Yes — ${entry.label} generates the soundtrack together with the picture, so it stays in sync with the motion.`
          : `No — ${entry.label} generates picture only. Several other video models on ${SITE_NAME} do generate native audio.`,
    },
    {
      question: `Is there a free way to try ${entry.label}?`,
      answer: `Yes. The ${TIER_INFO.free.label} plan includes ${TIER_INFO.free.monthlyCredits} credits when you sign up, with no credit card required. Credits are spent per generation based on the model, resolution and duration, and the exact cost is shown before you generate.`,
    },
  ].filter((f): f is { question: string; answer: string } => Boolean(f));

  return (
    <div className="container-page py-14 sm:py-20">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
          })),
        }}
      />

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Models", href: "/models" },
          { label: entry.label },
        ]}
      />

      {/* ------------------------------------------------------------ hero */}
      <header className="mt-8 max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{entry.provider}</Badge>
          <Badge variant="brand">{CATEGORY_LABEL[entry.category]}</Badge>
        </div>
        <h1 className="mt-5 text-heading font-bold tracking-tight text-ink sm:text-display">
          <span className="text-gradient">{entry.label}</span> — AI {kind} generator
        </h1>
        <p className="mt-4 text-body-lg text-muted">{page.tagline}</p>
        <p className="mt-4 text-body text-ink-soft">{page.intro}</p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href={modelWorkspaceHref(page.id)} className={buttonVariants({ variant: "accent" })}>
            <Sparkles className="size-4" aria-hidden="true" />
            Generate with {entry.label}
          </Link>
          <Link href="/signup" className={buttonVariants({ variant: "secondary" })}>
            Start free — {TIER_INFO.free.monthlyCredits} credits
          </Link>
        </div>
      </header>

      {/* ------------------------------------------------------- real output */}
      {showcase && (
        <section className="mt-16">
          <h2 className="text-heading font-bold text-ink">Made with {entry.label}</h2>
          <p className="mt-3 max-w-2xl text-body text-muted">
            Real output from {entry.label}, with the prompt that produced it.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {showcase.items.map((item) => (
              <figure key={item.url + item.prompt} className="flex flex-col gap-3">
                <div className="overflow-hidden rounded-2xl border border-line bg-surface-2">
                  {showcase.kind === "video" ? (
                    // preload="metadata" + "#t=0.1": metadata alone often
                    // leaves the element blank, and the fragment asks the
                    // browser to seek just past the start, which is what
                    // actually paints a still frame. Same trick as the gallery
                    // tiles. Nothing is downloaded beyond that until play.
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
      )}

      {/* --------------------------------------------------------- strengths */}
      <section className="mt-16 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <h2 className="text-heading font-bold text-ink">
            What {entry.label} is good at
          </h2>
          <ul className="mt-6 space-y-3">
            {page.strengths.map((strength) => (
              <li key={strength} className="flex gap-3 text-body text-ink-soft">
                <Check className="mt-1 size-4 shrink-0 text-brand" aria-hidden="true" />
                <span>{strength}</span>
              </li>
            ))}
          </ul>

          <h3 className="mt-10 text-feature-title font-semibold text-ink">
            What people use it for
          </h3>
          <ul className="mt-4 space-y-3">
            {page.useCases.map((useCase) => (
              <li key={useCase} className="flex gap-3 text-body text-ink-soft">
                <Check className="mt-1 size-4 shrink-0 text-brand" aria-hidden="true" />
                <span>{useCase}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ------------------------------------------------------------ specs */}
        <Card variant="compact" className="h-fit">
          <h2 className="text-feature-title font-semibold text-ink">
            {entry.label} specifications
          </h2>
          <dl className="mt-5 divide-y divide-line">
            {specs.map((spec) => (
              <div key={spec.label} className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
                <dt className="text-body-sm text-muted">{spec.label}</dt>
                <dd className="text-body-sm font-medium text-ink">{spec.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-caption text-muted">
            Plan limits apply on top of these — see{" "}
            <Link href="/pricing" className="text-brand underline-offset-4 hover:underline">
              pricing
            </Link>
            .
          </p>
        </Card>
      </section>

      {/* ----------------------------------------------------- example prompts */}
      <section className="mt-16">
        <h2 className="text-heading font-bold text-ink">
          Example prompts for {entry.label}
        </h2>
        <p className="mt-3 max-w-2xl text-body text-muted">
          Written for this model in particular. Open one in the composer and edit it from there.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {page.prompts.map((prompt) => (
            <Card key={prompt} variant="compact" className="flex flex-col gap-4">
              <p className="text-body-sm text-ink-soft">&ldquo;{prompt}&rdquo;</p>
              <Link
                href={modelWorkspaceHref(page.id, prompt)}
                className="mt-auto inline-flex w-fit items-center gap-1.5 text-label font-semibold text-brand transition-transform hover:translate-x-0.5"
              >
                Try this prompt
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------------- faq */}
      <section className="mt-16 max-w-3xl">
        <h2 className="text-heading font-bold text-ink">{entry.label} FAQ</h2>
        <dl className="mt-8 space-y-6">
          {faqs.map((faq) => (
            <div key={faq.question}>
              <dt className="text-feature-title font-semibold text-ink">{faq.question}</dt>
              <dd className="mt-2 text-body text-muted">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ---------------------------------------------------------- related */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-heading font-bold text-ink">
            Other {kind} models on {SITE_NAME}
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((other) => {
              const otherEntry = modelCatalogEntry(other.id);
              if (!otherEntry) return null;
              return (
                <Link
                  key={other.slug}
                  href={`/generate/${other.slug}`}
                  className="group rounded-2xl border border-line bg-surface-2 p-5 transition-colors hover:border-border-strong hover:bg-surface-3"
                >
                  <span className="text-caption text-muted">{otherEntry.provider}</span>
                  <h3 className="mt-1 text-feature-title font-semibold text-ink group-hover:text-brand">
                    {otherEntry.label}
                  </h3>
                  <p className="mt-2 text-body-sm text-muted">{other.tagline}</p>
                </Link>
              );
            })}
          </div>
          <Link
            href="/models"
            className="mt-8 inline-flex items-center gap-1.5 text-label font-semibold text-brand hover:underline"
          >
            Browse every model
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </section>
      )}

      {/* --------------------------------------------------------------- cta */}
      <section className="mt-20 rounded-2xl border border-line bg-surface-2 px-6 py-12 text-center sm:px-12">
        <h2 className="text-heading font-bold text-ink">
          Start generating with {entry.label}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-body text-muted">
          {TIER_INFO.free.monthlyCredits} free credits on sign-up, no credit card required.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className={buttonVariants({ variant: "accent" })}>
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
