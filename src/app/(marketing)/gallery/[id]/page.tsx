import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { TIER_INFO } from "@/lib/constants";
import { modelCatalogEntry, modelPageHref, modelWorkspaceHref } from "@/lib/model-seo";
import {
  fetchPublicGeneration,
  fetchPublicGenerations,
  generationTitle,
  hasDisplayablePrompt,
  isVideoGeneration,
  type PublicGeneration,
} from "@/lib/public-content";
import { absoluteUrl, metaDescription, openGraph, SITE_NAME } from "@/lib/seo";

// One indexable page per shared generation, with the prompt as real text
// rather than something only encoded into a media URL.
//
// Rendered on demand and revalidated hourly, not statically generated: the
// feed changes whenever someone shares something, and `resultUrl` is a
// pre-signed R2 link that expires six hours after it is minted. An hour of
// cache keeps every served page's link comfortably inside that window; raising
// this past six hours would start serving dead media.
export const revalidate = 3600;

export async function generateStaticParams() {
  const items = await fetchPublicGenerations();
  return items.map((item) => ({ id: item.id }));
}

export async function generateMetadata(props: PageProps<"/gallery/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const item = await fetchPublicGeneration(id);
  if (!item) return {};

  const entry = modelCatalogEntry(item.model);
  const title = generationTitle(item, { max: 50, modelLabel: entry?.label });
  const kind = isVideoGeneration(item) ? "AI video" : "AI image";
  // The prompt only goes in the description when it reads as prose — a preset's
  // is never published, and a JSON brief truncated to 158 characters is noise.
  const description = metaDescription(
    hasDisplayablePrompt(item)
      ? `${kind} generated${entry ? ` with ${entry.label}` : ""} on ${SITE_NAME}. Prompt: ${item.prompt}`
      : `${kind} generated${entry ? ` with ${entry.label}` : ""} on ${SITE_NAME}. See the settings it used and recreate it with your own prompt.`,
  );

  return {
    title,
    description,
    alternates: { canonical: `/gallery/${item.id}` },
    // Only the stored thumbnail is ever used as the card image, never
    // `resultUrl`: that one is a signed link that dies in six hours, and a
    // social card pointing at a 403 is worse than the site-wide default.
    openGraph: openGraph({
      title,
      description,
      path: `/gallery/${item.id}`,
      type: "article",
      images: item.thumbnailUrl ? [item.thumbnailUrl] : undefined,
    }),
  };
}

function ParameterRows({ item }: { item: PublicGeneration }) {
  const rows: { label: string; value: string }[] = [];
  const params = item.parameters ?? {};
  const push = (label: string, value: unknown) => {
    if (value === undefined || value === null || value === "") return;
    rows.push({ label, value: String(value) });
  };
  push("Duration", params.duration ? `${params.duration}s` : undefined);
  push("Resolution", params.resolution);
  push("Aspect ratio", params.aspectRatio);
  push("Size", params.size);
  push("Seed", item.seed);
  if (rows.length === 0) return null;

  return (
    <dl className="mt-5 divide-y divide-line">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
          <dt className="text-body-sm text-muted">{row.label}</dt>
          <dd className="text-body-sm font-medium text-ink">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function GalleryItemPage(props: PageProps<"/gallery/[id]">) {
  const { id } = await props.params;
  const item = await fetchPublicGeneration(id);
  if (!item) notFound();

  const entry = modelCatalogEntry(item.model);
  const modelHref = modelPageHref(item.model);
  const title = generationTitle(item, { modelLabel: entry?.label });
  const isVideo = isVideoGeneration(item);
  // Alt text is a description, not a data dump — a preset's prompt is private
  // and a JSON brief describes nothing, so both fall back to the page's title.
  const alt = hasDisplayablePrompt(item) ? item.prompt : title;

  return (
    <div className="container-page py-14 sm:py-20">
      {/* Media URLs are deliberately absent from the structured data: R2 signs
          them for six hours, and a VideoObject whose contentUrl 403s is a
          markup error rather than a richer result. */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: title,
          ...(item.fromPreset ? {} : { text: item.prompt }),
          url: absoluteUrl(`/gallery/${item.id}`),
          ...(item.createdAt ? { dateCreated: item.createdAt } : {}),
          ...(item.author?.name ? { creator: { "@type": "Person", name: item.author.name } } : {}),
          isPartOf: { "@type": "CollectionPage", name: `${SITE_NAME} community gallery`, url: absoluteUrl("/gallery") },
        }}
      />

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Gallery", href: "/gallery" },
          { label: title },
        ]}
      />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="overflow-hidden rounded-2xl border border-line bg-surface-2">
            {item.resultUrl ? (
              isVideo ? (
                <video
                  className="w-full"
                  src={`${item.resultUrl}#t=0.1`}
                  poster={item.thumbnailUrl ?? undefined}
                  controls
                  loop
                  playsInline
                  preload="metadata"
                  aria-label={alt}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- signed R2 URL, not a Next-optimizable asset
                <img
                  src={item.resultUrl}
                  alt={alt}
                  loading="lazy"
                  decoding="async"
                  className="w-full"
                />
              )
            ) : (
              <div className="p-12 text-center text-body-sm text-muted">
                This generation is no longer available.
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="brand">{isVideo ? "AI video" : "AI image"}</Badge>
            {entry && <Badge variant="outline">{entry.provider}</Badge>}
          </div>

          <h1 className="mt-5 text-heading font-bold tracking-tight text-ink">{title}</h1>

          {item.author?.name && (
            <p className="mt-3 text-body-sm text-muted">Shared by {item.author.name}</p>
          )}

          {item.fromPreset ? (
            <p className="mt-6 text-body text-muted">
              Made from one of the{" "}
              <Link href="/prompts" className="text-brand underline-offset-4 hover:underline">
                Vixerra video presets
              </Link>
              . A preset writes the prompt for you — upload one photo and generate.
            </p>
          ) : (
            <div className="mt-6">
              <h2 className="text-feature-title font-semibold text-ink">Prompt</h2>
              <p className="mt-2 whitespace-pre-wrap text-body-sm text-ink-soft">{item.prompt}</p>
              {item.negativePrompt && (
                <>
                  <h3 className="mt-5 text-label font-semibold text-ink">Negative prompt</h3>
                  <p className="mt-1 text-body-sm text-muted">{item.negativePrompt}</p>
                </>
              )}
            </div>
          )}

          <Card variant="compact" className="mt-8">
            <h2 className="text-feature-title font-semibold text-ink">How it was made</h2>
            <dl className="mt-5 divide-y divide-line">
              <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
                <dt className="text-body-sm text-muted">Model</dt>
                <dd className="text-body-sm font-medium text-ink">
                  {modelHref ? (
                    <Link href={modelHref} className="text-brand underline-offset-4 hover:underline">
                      {entry?.label ?? item.model}
                    </Link>
                  ) : (
                    (entry?.label ?? item.model)
                  )}
                </dd>
              </div>
            </dl>
            <ParameterRows item={item} />
          </Card>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={modelWorkspaceHref(item.model, item.fromPreset ? undefined : item.prompt)}
              className={buttonVariants({ variant: "accent" })}
            >
              <Sparkles className="size-4" aria-hidden="true" />
              Recreate this
            </Link>
            <Link href="/gallery" className={buttonVariants({ variant: "secondary" })}>
              Back to the gallery
            </Link>
          </div>

          <p className="mt-4 text-caption text-muted">
            {TIER_INFO.free.monthlyCredits} free credits on sign-up, no credit card required.
          </p>
        </div>
      </div>

      {entry && modelHref && (
        <section className="mt-20 rounded-2xl border border-line bg-surface-2 px-6 py-10 sm:px-12">
          <h2 className="text-feature-title font-semibold text-ink">
            More about {entry.label}
          </h2>
          <p className="mt-2 max-w-2xl text-body-sm text-muted">{entry.description}</p>
          <Link
            href={modelHref}
            className="mt-5 inline-flex items-center gap-1.5 text-label font-semibold text-brand hover:underline"
          >
            {entry.label} specs and example prompts
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </section>
      )}
    </div>
  );
}
