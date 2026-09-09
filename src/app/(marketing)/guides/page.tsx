import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { buttonVariants } from "@/components/ui/button";
import { TIER_INFO } from "@/lib/constants";
import { sortedGuides } from "@/lib/guides";
import { absoluteUrl, openGraph, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "AI video and image generation guides",
  description:
    "Practical guides to AI video and image generation — turning a photo into video, choosing between models, writing prompts that work, and producing ad creative.",
  alternates: { canonical: "/guides" },
  openGraph: openGraph({
    title: "AI video and image generation guides",
    description:
      "Practical guides to AI video and image generation — choosing a model, writing prompts that work, and the parameters that decide the result.",
    path: "/guides",
  }),
};

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default function GuidesIndexPage() {
  const guides = sortedGuides();

  return (
    <div className="container-page py-14 sm:py-20">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: `${SITE_NAME} guides`,
          url: absoluteUrl("/guides"),
          blogPost: guides.map((guide) => ({
            "@type": "BlogPosting",
            headline: guide.title,
            description: guide.description,
            datePublished: guide.published,
            dateModified: guide.updated ?? guide.published,
            url: absoluteUrl(`/guides/${guide.slug}`),
          })),
        }}
      />

      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Guides" }]} />

      <header className="mt-8 max-w-2xl">
        <h1 className="text-heading font-bold tracking-tight text-ink sm:text-display">
          AI video and image <span className="text-gradient">guides</span>
        </h1>
        <p className="mt-4 text-body-lg text-muted">
          How to get what you actually wanted out of a generation — choosing a model, writing a
          prompt that works, and the parameters that quietly decide the result.
        </p>
      </header>

      <div className="mt-14 grid gap-5 lg:grid-cols-2">
        {guides.map((guide) => (
          <article
            key={guide.slug}
            className="group flex flex-col rounded-2xl border border-line bg-surface-2 p-7 transition-colors hover:border-border-strong hover:bg-surface-3"
          >
            <p className="text-caption text-muted">
              <time dateTime={guide.published}>
                {DATE_FORMAT.format(new Date(guide.published))}
              </time>{" "}
              · {guide.readingMinutes} min read
            </p>
            <h2 className="mt-3 text-feature-title font-semibold text-ink group-hover:text-brand">
              <Link href={`/guides/${guide.slug}`}>{guide.title}</Link>
            </h2>
            <p className="mt-3 text-body-sm text-muted">{guide.excerpt}</p>
            <Link
              href={`/guides/${guide.slug}`}
              className="mt-6 inline-flex w-fit items-center gap-1.5 text-label font-semibold text-brand"
            >
              Read the guide
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>

      <section className="mt-20 rounded-2xl border border-line bg-surface-2 px-6 py-12 text-center sm:px-12">
        <h2 className="text-heading font-bold text-ink">Try it rather than read about it</h2>
        <p className="mx-auto mt-3 max-w-xl text-body text-muted">
          {TIER_INFO.free.monthlyCredits} free credits on sign-up, no credit card required, and
          every model on one balance.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className={buttonVariants({ variant: "accent" })}>
            Create a free account
          </Link>
          <Link href="/models" className={buttonVariants({ variant: "secondary" })}>
            Browse the models
          </Link>
        </div>
      </section>
    </div>
  );
}
