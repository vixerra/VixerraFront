import Image from "next/image";
import { Reveal } from "@/components/marketing/reveal";
import sceneEditing from "../../../public/media/concepts/scene-editing.webp";
import highResolution from "../../../public/media/concepts/high-resolution.webp";
import portraitRestyle from "../../../public/media/concepts/portrait-restyle.webp";
import videoQuality from "../../../public/media/concepts/video-quality.webp";

// Local, licensed illustrative images (not Vixerra pipeline output — see
// public/media/concepts/) used to give the capabilities described in
// features-showcase.tsx some visual life. Deliberately kept separate from
// ShowcaseTabs, which is explicitly "real output, not mockups" — mixing
// licensed concept art into it would contradict that claim. Framed here as
// illustrative, never captioned with a Vixerra model name (they weren't
// made by one).
const CONCEPTS = [
  {
    title: "Reframe any scene",
    body: "Describe a new setting in plain language and Vixerra places the subject there — no masks, no manual compositing.",
    image: sceneEditing,
  },
  {
    title: "Up to 4K detail",
    body: "GPT Image 2 and Nano Banana Pro generate at up to 4K, so fine detail holds up at full size.",
    image: highResolution,
  },
  {
    title: "Restyle a portrait",
    body: "Turn a casual photo into a polished, on-brand look with a single plain-language edit.",
    image: portraitRestyle,
  },
  {
    title: "Broadcast-ready motion",
    body: "Seedance renders sharp, stable motion — footage that holds up cut into a real timeline.",
    image: videoQuality,
  },
] as const;

export function CapabilityConcepts() {
  return (
    <section className="container-page py-20 sm:py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-heading font-bold text-ink">What you can create</h2>
        <p className="mt-4 text-body text-muted">
          Illustrative examples of what&apos;s possible — try it yourself in the generator.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {CONCEPTS.map((concept) => (
          <div key={concept.title} className="overflow-hidden rounded-2xl border border-line bg-surface-2">
            <div className="relative aspect-video w-full">
              <Image
                src={concept.image}
                alt=""
                aria-hidden="true"
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="p-6">
              <h3 className="text-feature-title font-semibold text-ink">{concept.title}</h3>
              <p className="mt-2 text-body-sm text-muted">{concept.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
