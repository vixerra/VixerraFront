import type { Metadata } from "next";
import Link from "next/link";
import { PresetsGallery } from "@/components/presets/presets-gallery";
import { modelCatalogEntry, modelPageHref } from "@/lib/model-seo";
import { fetchPublicPresets } from "@/lib/public-content";
import { openGraph } from "@/lib/seo";

// The public face of the preset catalogue. It keeps the /prompts URL the
// site has always linked to (the in-app studio owns /presets, and two routes
// can't share a path), but what it shows is the catalogue itself rather than
// the old hand-written Seedance prompt templates: a finished recipe is what
// a visitor can actually act on, and it's the same list signed-in users get.
//
// Browsing is open — GET /api/presets is deliberately unauthenticated, and
// the recipe's prompt never leaves the server. Running one is not: see
// presetHref in presets-gallery.tsx.
//
// The gallery below stays a client component (filters, hover playback, an
// auth-aware destination per card), so the catalogue used to reach a crawler
// as an empty div — the page carried about a hundred words, none of them the
// preset names. The list is therefore also read server-side and rendered as
// text under the gallery. Hourly, because an operator can publish a preset
// from the admin panel at any time.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Video presets",
  description:
    "One-tap video recipes — pick a look, upload one photo, generate. No prompt writing, no settings. Browse them all; sign in to run one.",
  alternates: { canonical: "/prompts" },
  openGraph: openGraph({
    title: "Video presets",
    description:
      "One-tap video recipes — pick a look, upload one photo, generate. No prompt writing, no settings.",
    path: "/prompts",
  }),
};

export default async function PromptsPage() {
  const presets = await fetchPublicPresets();

  return (
    <div className="container-page py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-heading font-bold tracking-tight text-ink sm:text-display">
          Viral <span className="text-gradient">video presets</span>
        </h1>
        <p className="mt-4 text-body text-muted">
          Finished recipes — prompt, camera, length and audio already written. Pick a look, upload
          one photo, and generate. Nothing to configure and no prompt to write; if you&apos;d
          rather write your own,{" "}
          <Link href="/generate" className="text-brand underline-offset-4 hover:underline">
            the full composer
          </Link>{" "}
          is one click away.
        </p>
      </div>

      <div className="mt-14">
        <PresetsGallery />
      </div>

      {presets.length > 0 && (
        <section className="mt-20 border-t border-line pt-12">
          <h2 className="text-feature-title font-semibold text-ink">
            Every preset in the catalogue
          </h2>
          <p className="mt-2 max-w-2xl text-body-sm text-muted">
            {presets.length} finished recipes, each pinned to the model it was tuned for.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {presets.map((preset) => {
              const entry = modelCatalogEntry(preset.model);
              const modelHref = modelPageHref(preset.model);
              return (
                <li
                  key={preset.slug}
                  className="rounded-xl border border-line bg-surface-2 p-5"
                >
                  <span className="text-caption text-muted">{preset.category}</span>
                  <h3 className="mt-1 text-label font-semibold text-ink">{preset.title}</h3>
                  <p className="mt-1 text-body-sm text-muted">{preset.tagline}</p>
                  <p className="mt-3 text-caption text-muted">
                    Runs on{" "}
                    {modelHref ? (
                      <Link
                        href={modelHref}
                        className="text-brand underline-offset-4 hover:underline"
                      >
                        {entry?.label ?? preset.model}
                      </Link>
                    ) : (
                      (entry?.label ?? preset.model)
                    )}
                    {preset.requiresImage ? " · needs one photo" : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
