import type { Metadata } from "next";
import Link from "next/link";
import { PresetsGallery } from "@/components/presets/presets-gallery";

export const metadata: Metadata = {
  title: "Viral presets",
  description:
    "One-tap video recipes — pick a look, upload one photo, generate. No prompt writing, no settings.",
};

export default function PresetsPage() {
  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <h1 className="font-display text-heading font-bold tracking-tight text-ink">
          Viral <span className="text-brand">presets</span>
        </h1>
        <p className="mt-3 text-body text-muted">
          Finished recipes — prompt, camera, length and audio already written. Pick a look, upload
          one photo, and generate. Want to change something? The{" "}
          <Link href="/generate" className="text-brand underline-offset-4 hover:underline">
            full composer
          </Link>{" "}
          is still there.
        </p>
      </div>

      <PresetsGallery />
    </div>
  );
}
