"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SEEDANCE_MODEL_ID } from "@/lib/constants";
import { useMe } from "@/hooks/use-me";
import { appHref, PRIMARY_CTA } from "@/lib/hosts";
import { openFeatureAnnouncement } from "@/lib/feature-announcement";
import { cn } from "@/lib/utils";

// Differentiator-led: the headline is what only Vixlens does (Genjutsu's
// video recast, locked-identity AI influencers), set as two narrow uppercase
// lines on slanted yellow tags; "every top model" is the supporting line.
// The main CTA is PRIMARY_CTA (the plans), and pricing itself is left to the
// plans further down.
// TODO(owner): final hero copy. This is the audit's suggested wording.
const TITLE_LINES = ["Recast any video", "Create AI influencers"];
const EASE = [0.16, 1, 0.3, 1] as const;

// Featured models, each a direct link into its workspace.
const FEATURED_MODELS = [
  { label: "Seedance 2.5", path: `/generate?model=${encodeURIComponent(SEEDANCE_MODEL_ID)}` },
  { label: "Kling 3.0", path: `/generate?model=${encodeURIComponent("kling/3.0")}` },
  { label: "GPT Image 2", path: `/generate/image?model=${encodeURIComponent("openai/gpt-image-2")}` },
  { label: "Nano Banana Pro", path: `/generate/image?model=${encodeURIComponent("google/nano-banana-pro")}` },
];

// Media laid out as graph nodes around the centre column, each wired toward
// it — the node-canvas look. Hidden below lg, where there's no room.
const NODES = [
  {
    kind: "image" as const,
    label: "GPT Image 2",
    url: "/media/images/gpt-image-11.webp",
    alt: "AI-generated photo of a tuxedo cat leaning into a wide-angle lens, its owner smiling behind",
    className: "left-[2.5%] top-[12%] w-44 xl:w-52",
    aspect: "aspect-[3/4]",
    side: "left" as const,
  },
  {
    kind: "video" as const,
    label: "Output · Seedance",
    url: "/media/videos/01_seedance_2_0_1b29ad9ce6.mp4",
    className: "right-[2.5%] top-[10%] w-52 xl:w-64",
    aspect: "aspect-video",
    side: "right" as const,
  },
  {
    kind: "image" as const,
    label: "Portrait",
    url: "/media/images/gpt-image-09.webp",
    alt: "AI-generated smartphone-style portrait of a young woman on a balcony at dusk",
    className: "left-[5%] top-[58%] w-36 xl:w-44",
    aspect: "aspect-[3/4]",
    side: "left" as const,
  },
  {
    kind: "image" as const,
    label: "Poster",
    url: "/media/images/gpt-image-06.webp",
    alt: "AI-generated editorial poster: a man in a record store under the headline LISTEN.",
    className: "right-[5%] top-[50%] w-36 xl:w-44",
    aspect: "aspect-[3/4]",
    side: "right" as const,
  },
];

/** A dashed wire leaving a node's header port toward the centre column. It
 *  hangs off the node itself, so it always lines up with the port. */
function Wire({ side }: { side: "left" | "right" }) {
  return (
    <svg
      className={cn(
        "absolute top-[7px] h-16 w-24 overflow-visible",
        side === "left" ? "left-full" : "right-full -scale-x-100",
      )}
      viewBox="0 0 96 64"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M0 7 C 52 7, 44 56, 96 56"
        stroke="var(--color-brand)"
        strokeOpacity="0.7"
        strokeWidth="1.5"
        strokeDasharray="4 4"
        className="motion-safe:animate-wire-flow"
      />
      <circle cx="96" cy="56" r="3.5" fill="var(--color-brand)" />
    </svg>
  );
}

export function Hero() {
  const shouldReduceMotion = useReducedMotion();
  const { data: user } = useMe();
  const rise = (delay: number, y = 20) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, y },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, ease: EASE, delay },
        };

  return (
    <section className="relative isolate flex min-h-[calc(100svh-4rem)] flex-col justify-center overflow-hidden bg-surface">
      <div className="grid-texture pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />

      {!shouldReduceMotion && (
        <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden="true">
          {NODES.map((node, i) => (
            <motion.div
              key={node.url}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: EASE }}
              className={cn("node-card absolute", node.className)}
            >
              <Wire side={node.side} />
              <div className="flex items-center justify-between px-3 py-2 text-[10px] font-bold tracking-[0.08em] text-muted uppercase">
                <span className="size-1.5 rounded-full bg-brand" />
                {node.label}
                <span className="size-1.5 rounded-full bg-brand" />
              </div>
              <div className={cn("mx-1.5 mb-1.5 overflow-hidden rounded-xl", node.aspect)}>
                {node.kind === "video" ? (
                  <video
                    className="h-full w-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                  >
                    <source src={node.url} type="video/mp4" />
                  </video>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- local asset from public/media, decorative collage
                  <img src={node.url} alt={node.alt} className="h-full w-full object-cover" />
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="container-page relative py-14 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div {...rise(0, 16)} className="mb-5 flex justify-center">
            <button
              type="button"
              onClick={() => openFeatureAnnouncement("genjutsu")}
              className="inline-flex items-center gap-2 rounded-full border border-accent-hot/30 bg-accent-hot/[0.08] py-1 pr-3 pl-1 font-mono text-[11px] leading-none tracking-[0.16em] text-accent-hot-ink uppercase transition-colors hover:border-accent-hot/60"
            >
              <span className="rounded-full bg-accent-hot-strong px-2 py-1 font-semibold tracking-[0.14em] text-white">
                New
              </span>
              Genjutsu is live
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </button>
          </motion.div>

          <h1 className="font-narrow flex flex-col items-center gap-1.5 text-[2.2rem] leading-none font-semibold tracking-[-0.01em] uppercase min-[400px]:text-5xl sm:gap-2 sm:text-6xl lg:text-[5.25rem]">
            {TITLE_LINES.map((line, i) => (
              <motion.span key={line} {...rise(0.15 + i * 0.12, 30)} className="tag-slant">
                {line}
              </motion.span>
            ))}
          </h1>

          <motion.p
            {...rise(0.55, 24)}
            className="mx-auto mt-6 max-w-xl text-body-lg text-muted"
          >
            Every top model in one studio — Seedance 2.5, Kling 3.0, Veo 3.1, GPT Image 2 and
            Nano Banana Pro, side by side, with Genjutsu and AI Influencers built in.
          </motion.p>

          <motion.div
            {...rise(0.65, 16)}
            className="mt-6 flex flex-wrap items-center justify-center gap-2"
          >
            {FEATURED_MODELS.map((model) => (
              <Link
                key={model.label}
                href={appHref(model.path)}
                prefetch={false}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-ink/[0.04] py-1.5 pr-2.5 pl-3 text-caption text-muted transition-colors hover:border-brand/50 hover:text-ink"
              >
                <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
                {model.label}
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            ))}
          </motion.div>

          <motion.div
            {...rise(0.75, 24)}
            className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
          >
            <Link
              href={user ? appHref("/generate") : PRIMARY_CTA.href}
              prefetch={false}
              className={buttonVariants({ variant: "accent", size: "lg" })}
            >
              {user ? "Open the studio" : PRIMARY_CTA.label}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <a href="#showcase" className={buttonVariants({ variant: "outline", size: "lg" })}>
              See what it makes
            </a>
          </motion.div>

          {!user && (
            <motion.p {...rise(0.9, 0)} className="mt-4 text-caption text-text-tertiary">
              Just looking?{" "}
              <Link
                href="/gallery"
                className="text-muted underline decoration-brand/50 underline-offset-4 transition-colors hover:text-brand"
              >
                Browse the gallery
              </Link>{" "}
              — no account needed.
            </motion.p>
          )}
        </div>
      </div>
    </section>
  );
}
