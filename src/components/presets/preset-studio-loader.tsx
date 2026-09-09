"use client";

import Link from "next/link";
import { PresetStudio } from "@/components/presets/preset-studio";
import { usePreset } from "@/hooks/use-presets";
import { Spinner } from "@/components/ui/spinner";

/**
 * Fetches one preset by slug and hands it to the studio.
 *
 * The route used to be statically generated from a module constant, which
 * only worked while the catalogue shipped inside the bundle. Now that an
 * operator can publish a recipe from the admin panel, the page has to read
 * it at request time — so the server component above stays for the metadata
 * and this client component does the fetch.
 *
 * A missing slug is a plain in-page state rather than notFound(): the row
 * may exist but be unpublished, and "we couldn't find that preset, here are
 * the others" is more useful than the app's 404 shell.
 */
export function PresetStudioLoader({ slug }: { slug: string }) {
  const { data: preset, isLoading, error } = usePreset(slug);

  if (isLoading) {
    return (
      <div className="flex min-h-[24rem] items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (error || !preset) {
    return (
      <div className="flex min-h-[24rem] flex-col items-center justify-center gap-3 py-16 text-center">
        <h1 className="font-display text-subheading font-bold text-ink">Preset not found</h1>
        <p className="max-w-md text-body-sm text-muted">
          This preset doesn&apos;t exist, or it isn&apos;t published right now.
        </p>
        <Link
          href="/presets"
          className="text-body-sm text-brand underline-offset-4 hover:underline"
        >
          Browse all presets
        </Link>
      </div>
    );
  }

  return <PresetStudio preset={preset} />;
}
