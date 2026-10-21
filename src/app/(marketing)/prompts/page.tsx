import type { Metadata } from "next";
import Link from "next/link";
import { PresetsGallery } from "@/components/presets/presets-gallery";
import { modelCatalogEntry, modelPageHref } from "@/lib/model-seo";
import { fetchPublicPresets } from "@/lib/public-content";
import { openGraph } from "@/lib/seo";
import { appHref } from "@/lib/hosts";

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
    images: "file",
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
        <h1 className="text-heading font-light text-ink sm:text-display">
          Viral <span className="text-gradient">video presets</span>
        </h1>
        <p className="mt-4 text-body text-muted">
          Finished recipes — prompt, camera, length and audio already written. Pick a look, upload
          one photo, and generate. Nothing to configure and no prompt to write; if you&apos;d
          rather write your own,{" "}
          <Link href={appHref("/generate")} prefetch={false} className="text-brand-ink underline-offset-4 hover:underline">
            the full composer
          </Link>{" "}
          is one click away.
        </p>
      </div>

      <div className="mt-14">
        <PresetsGallery />
      </div>

      
    </div>
  );
}
