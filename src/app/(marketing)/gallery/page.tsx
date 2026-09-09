import type { Metadata } from "next";
import Link from "next/link";
import { PublicGalleryClient } from "@/components/gallery/public-gallery-client";
import { JsonLd } from "@/components/seo/json-ld";
import { modelCatalogEntry } from "@/lib/model-seo";
import { fetchPublicGenerations, generationTitle, isVideoGeneration } from "@/lib/public-content";
import { absoluteUrl, openGraph, SITE_NAME } from "@/lib/seo";

// The interactive grid stays a client component (lightbox, likes, lazy
// playback). What's added here is the crawlable half: the feed is also read
// server-side so every shared generation gets a real <a> to its own page and
// its prompt appears in the initial HTML. Without it the detail pages under
// /gallery/[id] would be reachable only from the sitemap, which is a hint
// rather than a link.
//
// Same hour of cache as the detail pages, and for the same reason — the feed
// moves, and its media links are signed and short-lived.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "AI video and image gallery",
  description:
    "A public showcase of AI video and image generations from the Vixerra community — every one with the prompt and the model that made it.",
  alternates: { canonical: "/gallery" },
  openGraph: openGraph({
    title: "AI video and image gallery",
    description:
      "A public showcase of AI video and image generations from the Vixerra community — every one with the prompt and the model that made it.",
    path: "/gallery",
  }),
};

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
                name: generationTitle(item, { modelLabel: modelCatalogEntry(item.model)?.label }),
                url: absoluteUrl(`/gallery/${item.id}`),
              })),
            },
          }}
        />
      )}

      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-heading font-bold tracking-tight text-ink sm:text-display">
          Community <span className="text-gradient">gallery</span>
        </h1>
        <p className="mt-4 text-body text-muted">
          A public showcase of generations from the Vixerra community — every one with the prompt
          that produced it and the model that ran it. Open any of them to read the full prompt, or{" "}
          <Link href="/models" className="text-brand underline-offset-4 hover:underline">
            browse the models
          </Link>{" "}
          behind them.
        </p>
      </div>

      <div className="mt-12">
        <PublicGalleryClient />
      </div>

      {items.length > 0 && (
        <section className="mt-20 border-t border-line pt-12">
          <h2 className="text-feature-title font-semibold text-ink">
            Every shared generation
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {items.map((item) => {
              const entry = modelCatalogEntry(item.model);
              return (
                <li key={item.id}>
                  <Link
                    href={`/gallery/${item.id}`}
                    className="group block rounded-xl border border-line bg-surface-2 p-4 transition-colors hover:border-border-strong hover:bg-surface-3"
                  >
                    <span className="text-caption text-muted">
                      {isVideoGeneration(item) ? "AI video" : "AI image"}
                      {entry ? ` · ${entry.label}` : ""}
                    </span>
                    <p className="mt-1 text-body-sm text-ink-soft group-hover:text-brand">
                      {generationTitle(item, { max: 110, modelLabel: entry?.label })}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
