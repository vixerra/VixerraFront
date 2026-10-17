import type { Metadata } from "next";
import Link from "next/link";
import { PublicGalleryClient } from "@/components/gallery/public-gallery-client";
import type { GalleryItem } from "@/components/gallery/generation-card";
import { JsonLd } from "@/components/seo/json-ld";
import { modelCatalogEntry } from "@/lib/model-seo";
import { influencerModelLabel } from "@/lib/influencer";
import {
  fetchPublicGenerations,
  galleryStillPath,
  generationTitle,
  isVideoGeneration,
  type PublicGeneration,
} from "@/lib/public-content";
import { absoluteUrl, openGraph, SITE_NAME } from "@/lib/seo";

// The interactive grid stays a client component (lightbox, likes, lazy
// playback), seeded with the feed read here so its thumbnails are in the
// first HTML. Its tiles are buttons that open a lightbox, though, not links —
// so the crawlable half is the index below it: a real <a> to every shared
// generation's own page, with its model and prompt as text, paginated with
// plain ?page= links. Without it the detail pages under /gallery/[id] were
// reachable only from the sitemap, which is a hint rather than a link.
//
// Same hour of cache as the detail pages, because the feed moves. Media in
// the HTML goes through /media/gallery/<id>, never the feed's signed links.
export const revalidate = 3600;

const PAGE_SIZE = 24;

const DESCRIPTION =
  "A public showcase of AI video and image generations from the Vixlens community — every one with the prompt and the model that made it.";

function pageFromParams(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(n) && n > 1 ? n : 1;
}

export async function generateMetadata(props: PageProps<"/gallery">): Promise<Metadata> {
  const page = pageFromParams((await props.searchParams).page);
  const title = page > 1 ? `AI video and image gallery — page ${page}` : "AI video and image gallery";
  const path = page > 1 ? `/gallery?page=${page}` : "/gallery";
  return {
    title,
    description: DESCRIPTION,
    alternates: { canonical: path },
    openGraph: openGraph({ images: "file", title, description: DESCRIPTION, path }),
  };
}

function modelLabel(item: PublicGeneration) {
  return influencerModelLabel(item.model, item.parameters) ?? modelCatalogEntry(item.model)?.label;
}

/**
 * The feed as the interactive grid wants it. Everything here was shared and
 * finished, which is all the server read keeps.
 *
 * Stills are swapped for their stable /media/gallery URLs, because this
 * becomes server-rendered HTML that crawlers keep: the feed's own links are
 * pre-signed for six hours and change on every request. A video keeps its
 * signed resultUrl — the tile only loads it client-side, once in view.
 */
function toGalleryItem(item: PublicGeneration): GalleryItem {
  const isVideo = isVideoGeneration(item);
  return {
    ...item,
    thumbnailUrl: galleryStillPath(item),
    resultUrl: isVideo ? item.resultUrl : (galleryStillPath(item, { full: true }) ?? item.resultUrl),
    progressPercent: 100,
    isPublic: true,
  };
}

export default async function PublicGalleryPage(props: PageProps<"/gallery">) {
  const all = await fetchPublicGenerations();
  const pageCount = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const page = Math.min(pageFromParams((await props.searchParams).page), pageCount);
  const items = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="container-page py-20 sm:py-28">
      {items.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `${SITE_NAME} community gallery`,
            url: absoluteUrl("/gallery"),
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: all.length,
              itemListElement: items.map((item, index) => ({
                "@type": "ListItem",
                position: (page - 1) * PAGE_SIZE + index + 1,
                name: generationTitle(item, { modelLabel: modelLabel(item) }),
                url: absoluteUrl(`/gallery/${item.id}`),
              })),
            },
          }}
        />
      )}

      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-heading font-light text-ink sm:text-display">
          Community <span className="text-gradient">gallery</span>
        </h1>
        <p className="mt-4 text-body text-muted">
          A public showcase of generations from the Vixlens community — every one with the prompt
          that produced it and the model that ran it. Open any of them to read the full prompt, or{" "}
          <Link href="/models" className="text-brand-ink underline-offset-4 hover:underline">
            browse the models
          </Link>{" "}
          behind them.
        </p>
      </div>

      {page === 1 && (
        <div className="mt-12">
          <PublicGalleryClient initialItems={all.length > 0 ? all.map(toGalleryItem) : undefined} />
        </div>
      )}

      {items.length > 0 && (
        <section className="mt-16" aria-labelledby="gallery-index">
          <h2 id="gallery-index" className="text-feature-title font-semibold text-ink">
            Every shared generation{pageCount > 1 ? ` · page ${page} of ${pageCount}` : ""}
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const label = modelLabel(item);
              return (
                <li key={item.id}>
                  <Link
                    href={`/gallery/${item.id}`}
                    className="flex h-full gap-3 rounded-xl border border-line bg-surface-2 p-3 transition-colors hover:border-border-strong hover:bg-surface-3"
                  >
                    {galleryStillPath(item) ? (
                      // eslint-disable-next-line @next/next/no-img-element -- streamed from R2 by /media/gallery, not a Next-optimizable asset
                      <img
                        src={galleryStillPath(item)!}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="size-16 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="size-16 shrink-0 rounded-lg bg-surface-3" aria-hidden="true" />
                    )}
                    <span className="min-w-0">
                      <span className="block text-caption text-muted">
                        {isVideoGeneration(item) ? "AI video" : "AI image"}
                        {label ? ` · ${label}` : ""}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-body-sm text-ink">
                        {generationTitle(item, { max: 90, modelLabel: label })}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {pageCount > 1 && (
            <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Gallery pages">
              {page > 1 && (
                <Link
                  href={page === 2 ? "/gallery" : `/gallery?page=${page - 1}`}
                  rel="prev"
                  className="rounded-lg border border-line px-3 py-1.5 text-body-sm text-muted hover:text-ink"
                >
                  Previous
                </Link>
              )}
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={n === 1 ? "/gallery" : `/gallery?page=${n}`}
                  aria-current={n === page ? "page" : undefined}
                  className={
                    n === page
                      ? "rounded-lg border border-brand px-3 py-1.5 text-body-sm text-ink"
                      : "rounded-lg border border-line px-3 py-1.5 text-body-sm text-muted hover:text-ink"
                  }
                >
                  {n}
                </Link>
              ))}
              {page < pageCount && (
                <Link
                  href={`/gallery?page=${page + 1}`}
                  rel="next"
                  className="rounded-lg border border-line px-3 py-1.5 text-body-sm text-muted hover:text-ink"
                >
                  Next
                </Link>
              )}
            </nav>
          )}
        </section>
      )}
    </div>
  );
}
