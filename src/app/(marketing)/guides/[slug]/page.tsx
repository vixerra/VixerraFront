import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { GuideBody } from "@/components/marketing/guide-body";
import { JsonLd } from "@/components/seo/json-ld";
import { buttonVariants } from "@/components/ui/button";
import { TIER_INFO } from "@/lib/constants";
import { GUIDE_POSTS, guideBySlug, sortedGuides } from "@/lib/guides";
import { modelCatalogEntry, modelPageBySlug } from "@/lib/model-seo";
import { absoluteUrl, DEFAULT_OG_IMAGE, openGraph, SITE_NAME } from "@/lib/seo";
import { appHref } from "@/lib/hosts";

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDE_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata(props: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const guide = guideBySlug(slug);
  if (!guide) return {};

  return {
    title: guide.metaTitle,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: openGraph({
      title: guide.metaTitle,
      description: guide.description,
      path: `/guides/${guide.slug}`,
      type: "article",
      publishedTime: guide.published,
      modifiedTime: guide.updated ?? guide.published,
    }),
  };
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function GuidePage(props: PageProps<"/guides/[slug]">) {
  const { slug } = await props.params;
  const guide = guideBySlug(slug);
  if (!guide) notFound();

  const relatedModels = guide.relatedModelSlugs
    .map((modelSlug) => {
      const page = modelPageBySlug(modelSlug);
      const entry = page && modelCatalogEntry(page.id);
      return page && entry ? { page, entry } : null;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const otherGuides = sortedGuides()
    .filter((other) => other.slug !== guide.slug)
    .slice(0, 3);

  return (
    <article className="container-page py-14 sm:py-20">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: guide.title,
          description: guide.description,
          datePublished: guide.published,
          dateModified: guide.updated ?? guide.published,
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": absoluteUrl(`/guides/${guide.slug}`),
          },
          author: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
          publisher: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
          image: absoluteUrl(DEFAULT_OG_IMAGE),
        }}
      />

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Guides", href: "/guides" },
          { label: guide.title },
        ]}
      />

      <header className="mt-8 max-w-3xl">
        <p className="text-caption text-muted">
          <time dateTime={guide.published}>{DATE_FORMAT.format(new Date(guide.published))}</time> ·{" "}
          {guide.readingMinutes} min read
        </p>
        <h1 className="mt-4 text-heading font-bold tracking-tight text-ink sm:text-display">
          {guide.title}
        </h1>
        <p className="mt-5 text-body-lg text-muted">{guide.excerpt}</p>
      </header>

      <div className="max-w-3xl">
        <GuideBody blocks={guide.body} />
      </div>

      {relatedModels.length > 0 && (
        <section className="mt-16 max-w-3xl">
          <h2 className="text-feature-title font-semibold text-ink">Models mentioned here</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {relatedModels.map(({ page, entry }) => (
              <Link
                key={page.slug}
                href={`/generate/${page.slug}`}
                className="group rounded-xl border border-line bg-surface-2 p-4 transition-colors hover:border-border-strong hover:bg-surface-3"
              >
                <span className="text-caption text-muted">{entry.provider}</span>
                <p className="mt-1 text-label font-semibold text-ink group-hover:text-brand">
                  {entry.label}
                </p>
                <p className="mt-1 text-body-sm text-muted">{page.tagline}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-16 max-w-3xl rounded-2xl border border-line bg-surface-2 px-6 py-10 text-center">
        <h2 className="text-feature-title font-semibold text-ink">
          Put this into practice
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-body-sm text-muted">
          {TIER_INFO.free.monthlyCredits} free credits on sign-up, no credit card required.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={appHref("/signup")} prefetch={false} className={buttonVariants({ variant: "accent" })}>
            Start generating
          </Link>
          <Link href="/pricing" className={buttonVariants({ variant: "secondary" })}>
            See pricing
          </Link>
        </div>
      </section>

      {otherGuides.length > 0 && (
        <section className="mt-16 max-w-3xl">
          <h2 className="text-feature-title font-semibold text-ink">Keep reading</h2>
          <ul className="mt-5 space-y-3">
            {otherGuides.map((other) => (
              <li key={other.slug}>
                <Link
                  href={`/guides/${other.slug}`}
                  className="group flex items-start gap-2 text-body text-ink-soft hover:text-brand"
                >
                  <ArrowUpRight
                    className="mt-1 size-4 shrink-0 text-brand"
                    aria-hidden="true"
                  />
                  {other.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
