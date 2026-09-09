"use client";

import { motion } from "framer-motion";
import { Reveal } from "@/components/marketing/reveal";
import { useLazyVideo } from "@/hooks/use-lazy-video";
import { SEEDANCE25_SHOWCASE_VIDEOS, SHOWCASE_VIDEOS } from "@/lib/showcase-media";
import { NANO_BANANA_IMAGES } from "@/lib/nano-banana-showcase";
import { gridContainerVariants, gridItemVariants } from "@/lib/animations";

// Generic, honest role descriptions — no invented quotes or testimonials
// attributed to real people (the migration brief's persona cards imply
// customer voices; this app has no real customer quotes to draw on, so
// these stay descriptive, matching the honesty rule used everywhere else
// on this page, e.g. HeroDemoWidget's "Interactive preview" disclaimer).
const PERSONAS = [
  {
    title: "Content creators",
    body: "Turn a script or a rough idea into a finished clip without booking a crew or a studio.",
    media: { kind: "video" as const, ...SEEDANCE25_SHOWCASE_VIDEOS.find((v) => v.id === "leather-boots-commercial")! },
  },
  {
    title: "Social creators",
    // Sourced from SHOWCASE_VIDEOS (not SEEDANCE25_SHOWCASE_VIDEOS, capped at
    // 4 entries for its own gallery) so this card doesn't repeat a clip
    // already spotlighted by hero.tsx/features-showcase.tsx/model-carousel.tsx.
    body: "Fast-turnaround edits and clips built for a feed, not a festival — vertical, punchy, done in minutes.",
    media: { kind: "video" as const, ...SHOWCASE_VIDEOS.find((v) => v.id === "cinematic-scene")! },
  },
  {
    title: "Marketers & brands",
    body: "Consistent product and brand imagery — accurate colors, logos, and packaging text every time.",
    media: { kind: "image" as const, ...NANO_BANANA_IMAGES.find((i) => i.id === "hillside-house-viz")! },
  },
  {
    title: "Video editors",
    body: "Generate reference plates, establishing shots, or full scenes to drop straight into a timeline.",
    media: { kind: "video" as const, ...SHOWCASE_VIDEOS.find((v) => v.id === "friends-sofa")! },
  },
] as const;

function PersonaMedia({ media }: { media: (typeof PERSONAS)[number]["media"] }) {
  const { containerRef, videoRef, hasLoadedOnce } = useLazyVideo<HTMLDivElement>();

  return (
    <div ref={containerRef} className="absolute inset-0">
      {media.kind === "video" ? (
        hasLoadedOnce && (
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            muted
            loop
            playsInline
            preload="none"
            aria-hidden="true"
          >
            <source src={media.url} type="video/mp4" />
          </video>
        )
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- local asset from public/media
        <img src={media.url} alt="" aria-hidden="true" className="h-full w-full object-cover" />
      )}
    </div>
  );
}

export function Personas() {
  return (
    <section className="container-page py-20 sm:py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-heading font-bold text-ink">Built for how you already work</h2>
        <p className="mt-4 text-body text-muted">
          Whatever you make, Vixerra fits into the workflow you already have.
        </p>
      </Reveal>

      <motion.div
        variants={gridContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="mt-12 grid gap-4 sm:grid-cols-2"
      >
        {PERSONAS.map((persona) => (
          <motion.div
            key={persona.title}
            variants={gridItemVariants}
            className="group relative flex h-72 flex-col justify-end overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-card sm:h-80"
          >
            <PersonaMedia media={persona.media} />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/10"
              aria-hidden="true"
            />
            <div className="relative p-6">
              <h3 className="text-feature-title font-semibold text-white">{persona.title}</h3>
              <p className="mt-2 text-body-sm text-white/75">{persona.body}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
