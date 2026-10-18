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
// first HTML. Its tiles open a lightbox rather than linking, so the detail
// pages under /gallery/[id] are found through the sitemap and the JSON-LD
// item list below.
//
// Same hour of cache as the detail pages, because the feed moves. Media in
// the HTML goes through /media/gallery/<id>, never the feed's signed links.
export const revalidate = 3600;

const TITLE = "AI video and image gallery";

const DESCRIPTION =
  "A public showcase of AI video and image generations from the Vixlens community — every one with the prompt and the model that made it.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/gallery" },
  openGraph: openGraph({ images: "file", title: TITLE, description: DESCRIPTION, path: "/gallery" }),
};

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

export default async function PublicGalleryPage() {
  const items = await fetchPublicGenerations();

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
              numberOfItems: items.length,
              itemListElement: items.map((item, index) => ({
                "@type": "ListItem",
                position: index + 1,
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

      <div className="mt-12">
        <PublicGalleryClient initialItems={items.length > 0 ? items.map(toGalleryItem) : undefined} />
      </div>
    </div>
  );
}
