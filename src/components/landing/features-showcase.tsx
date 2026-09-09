"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Video, Image as ImageIcon, Sparkles, Wand2, Layers, Users, Volume2, ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { gridContainerVariants, gridItemVariants } from "@/lib/animations";
import { SEEDANCE25_SHOWCASE_VIDEOS } from "@/lib/showcase-media";
import { GPT_IMAGE_2_IMAGES } from "@/lib/gpt-image-2-showcase";
import { VIDEO_MODELS, IMAGE_MODELS, SEEDANCE_MODEL_ID } from "@/lib/constants";
import { useLazyVideo } from "@/hooks/use-lazy-video";
import { cn } from "@/lib/utils";

const SEEDANCE_25 = VIDEO_MODELS.find((m) => m.id === SEEDANCE_MODEL_ID);
const GPT_IMAGE_2 = IMAGE_MODELS.find((m) => m.label === "GPT Image 2");

// Two modality sections (Video, Image) instead of the old Create/Refine/
// Scale grouping — the migration brief's "alternating product sections"
// pattern, one per pillar. No standalone Audio section: Vixerra has no
// independent audio-generation model, so native audio is listed as a
// Seedance video option instead of claiming a third pillar that doesn't
// exist. Each section pairs its item list with one real media sample
// (distinct from every other spotlighted clip/image on this page).
const VIDEO_CLIP = SEEDANCE25_SHOWCASE_VIDEOS.find((v) => v.id === "flamenco-practice-room")!;
const IMAGE_SAMPLE = GPT_IMAGE_2_IMAGES.find((i) => i.id === "product-photography")!;

const SECTIONS = [
  {
    label: "Video",
    media: { kind: "video" as const, url: VIDEO_CLIP.url, prompt: VIDEO_CLIP.prompt },
    tryHref: SEEDANCE_25 ? `/generate?model=${encodeURIComponent(SEEDANCE_25.id)}` : "/generate",
    items: [
      { icon: Video, title: "Text to Video", body: "Describe a shot and generate motion from scratch." },
      { icon: ImageIcon, title: "Image to Video", body: "Animate a still photo into a moving clip." },
      { icon: Layers, title: "Reference-guided control", body: "Guide composition and camera with reference shots on supported models." },
      { icon: Volume2, title: "Native audio, built in", body: "Seedance generates synchronized audio alongside the shot — no separate audio pass." },
    ],
  },
  {
    label: "Image",
    media: { kind: "image" as const, url: IMAGE_SAMPLE.url, prompt: IMAGE_SAMPLE.prompt },
    tryHref: GPT_IMAGE_2 ? `/generate/image?model=${encodeURIComponent(GPT_IMAGE_2.id)}` : "/generate/image",
    items: [
      { icon: Sparkles, title: "Text to Image", body: "Generate stills from a written prompt." },
      { icon: Wand2, title: "Plain-language editing", body: "Describe the change you want — no masks, no region selection." },
      { icon: Sparkles, title: "AI prompt enhancement", body: "Turn a rough idea into a detailed, model-ready prompt in one click." },
      { icon: Users, title: "Consistent characters", body: "The same character keeps its identity across multiple generations." },
    ],
  },
] as const;

function SectionMedia({
  media,
  prompt,
  tryHref,
  className,
}: {
  media: (typeof SECTIONS)[number]["media"];
  prompt: string;
  tryHref: string;
  className?: string;
}) {
  const { containerRef, videoRef, hasLoadedOnce } = useLazyVideo<HTMLDivElement>();

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-card lg:aspect-auto lg:h-full",
        className,
      )}
    >
      {media.kind === "video" ? (
        hasLoadedOnce && (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
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
        <img src={media.url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
      )}

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"
        aria-hidden="true"
      />

      {/* "Prompt" chip overlay — the migration brief's card-with-prompt-
          overlay pattern — shows the real prompt that produced the sample,
          not a fabricated one. */}
      <div className="glass absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3 rounded-xl px-3 py-2 sm:right-auto sm:max-w-[80%]">
        <p className="line-clamp-1 text-caption text-white/85">{prompt}</p>
      </div>

      <Link
        href={tryHref}
        className="btn-glass absolute top-3 right-3 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-caption font-medium text-white transition-transform hover:scale-105"
      >
        Try it
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}

export function FeaturesShowcase() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <Reveal className="container-page mx-auto max-w-2xl text-center">
        <h2 className="text-heading font-bold text-ink">Features that go beyond the basics</h2>
        <p className="mt-4 text-body text-muted">
          Vixerra&apos;s AI tools help creators move from idea to finished shot without losing
          quality or control.
        </p>
      </Reveal>

      <div className="mt-16">
        {SECTIONS.map((section, i) => (
          <div
            key={section.label}
            className={`border-t border-line py-14 first:border-t-0 ${i % 2 === 1 ? "bg-surface-2/40" : ""}`}
          >
            <div className="container-page grid gap-8 lg:grid-cols-5 lg:items-stretch lg:gap-10">
              <SectionMedia
                media={section.media}
                prompt={section.media.prompt}
                tryHref={section.tryHref}
                className={cn("lg:col-span-2", i % 2 === 1 ? "lg:order-last" : "lg:order-first")}
              />

              <div className="lg:order-none lg:col-span-3">
                <motion.span
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="font-mono text-caption tracking-widest text-brand uppercase"
                >
                  {section.label}
                </motion.span>

                <motion.div
                  variants={gridContainerVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                  className="mt-6 grid gap-4 sm:grid-cols-2"
                >
                  {section.items.map((item) => (
                    <motion.div
                      key={item.title}
                      variants={gridItemVariants}
                      className="flex items-start gap-4 rounded-2xl border border-border-subtle bg-surface-2 p-6"
                    >
                      <span className="flex size-10 flex-none items-center justify-center rounded-lg bg-brand/15">
                        <item.icon className="size-5 text-brand" aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="text-feature-title font-semibold text-ink">{item.title}</h3>
                        <p className="mt-2 text-body-sm text-muted">{item.body}</p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
