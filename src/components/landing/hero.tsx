"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LaunchOfferPill } from "@/components/landing/launch-offer";
import { SEEDANCE_MODEL_ID, TIER_INFO } from "@/lib/constants";
import { useMe } from "@/hooks/use-me";
import { appHref, subscribeHref } from "@/lib/hosts";
import { cn, formatCredits } from "@/lib/utils";
import {
  COMPETITORS,
  ENTRY_PRICE_MONTHLY,
  ENTRY_TIER,
  PRICES_CHECKED_ON,
  formatListPrice,
  yearlySavings,
} from "@/lib/competitor-pricing";

// Price-led, subscribe-first: the headline IS the offer (every model, from
// the entry plan's price), set as two narrow uppercase lines on slanted
// yellow tags; the main CTA subscribes to the entry plan directly, and the
// one object under it is the entry-price board.
const TITLE_LINES = ["Every top AI model", "One plan"];
const ENTRY_PRICE = formatListPrice(ENTRY_PRICE_MONTHLY);
const ENTRY = TIER_INFO[ENTRY_TIER];
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
    alt: "AI-generated image from GPT Image 2",
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
    label: "Text render",
    url: "/media/images/gpt-image-09.webp",
    alt: "AI-generated image with production-ready text rendering from GPT Image 2",
    className: "left-[5%] top-[58%] w-36 xl:w-44",
    aspect: "aspect-[3/4]",
    side: "left" as const,
  },
  {
    kind: "image" as const,
    label: "Product shot",
    url: "/media/images/gpt-image-06.webp",
    alt: "Photorealistic AI-generated product image from GPT Image 2",
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

const BOARD_ROWS = [
  { name: "Vixlens", price: ENTRY_PRICE_MONTHLY, savings: null, ours: true },
  ...COMPETITORS.map((c) => ({
    name: c.name,
    price: c.entryPriceMonthly,
    savings: yearlySavings(c),
    ours: false,
  })),
];
const BOARD_MAX = Math.max(...BOARD_ROWS.map((row) => row.price));

/** Cheapest paid plan per month, as bars — ours in yellow, theirs in stone,
 *  with what theirs costs over a year beyond ours in amber. Styled as a
 *  graph node: header row with ports, body below. */
function PriceBoard({ animate }: { animate: boolean }) {
  return (
    <div className="node-card mx-auto w-full max-w-xl text-left">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 sm:px-5">
        <span className="flex items-center gap-2 text-[11px] font-bold tracking-[0.08em] text-muted uppercase">
          <span className="size-2 rounded-full bg-brand" aria-hidden="true" />
          Cheapest paid plan / month
        </span>
        <span className="text-[11px] text-text-tertiary">Public prices · {PRICES_CHECKED_ON}</span>
      </div>
      <ul className="space-y-3.5 p-4 sm:p-5">
        {BOARD_ROWS.map((row, i) => (
          <li key={row.name} className="grid grid-cols-[5rem_1fr_4.5rem] items-center gap-3">
            <span
              className={
                row.ours ? "text-body-sm font-bold text-brand" : "text-body-sm text-muted"
              }
            >
              {row.name}
            </span>
            <div className="h-2 overflow-hidden rounded-full bg-ink/[0.06]">
              <motion.div
                className={
                  row.ours
                    ? "h-full origin-left rounded-full bg-brand shadow-glow-sm"
                    : "h-full origin-left rounded-full bg-silver/35"
                }
                style={{ width: `${(row.price / BOARD_MAX) * 100}%` }}
                initial={animate ? { scaleX: 0 } : false}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.9, delay: 1.1 + i * 0.12, ease: EASE }}
              />
            </div>
            <span className="flex flex-col items-end leading-tight">
              <span
                className={
                  row.ours
                    ? "text-body font-bold text-brand tabular-nums"
                    : "text-body-sm font-semibold text-ink tabular-nums"
                }
              >
                {formatListPrice(row.price)}
              </span>
              {row.savings !== null && (
                <span className="text-[11px] text-accent-amber tabular-nums">+${row.savings}/yr</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
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
            <LaunchOfferPill />
          </motion.div>

          <h1 className="font-narrow flex flex-col items-center gap-1.5 text-[2.2rem] leading-none font-semibold tracking-[-0.01em] uppercase min-[400px]:text-5xl sm:gap-2 sm:text-6xl lg:text-[5.25rem]">
            {TITLE_LINES.map((line, i) => (
              <motion.span key={line} {...rise(0.15 + i * 0.12, 30)} className="tag-slant">
                {line}
              </motion.span>
            ))}
            <motion.span
              {...rise(0.4, 30)}
              className="mt-2 flex items-baseline gap-2 text-ink sm:mt-3"
            >
              From {ENTRY_PRICE}
              <span className="font-sans text-[0.3em] font-normal tracking-normal text-muted normal-case">
                /mo
              </span>
            </motion.span>
          </h1>

          <motion.p
            {...rise(0.55, 24)}
            className="mx-auto mt-6 max-w-xl text-body-lg text-muted"
          >
            Seedance 2.5, Kling 3.0, Veo 3.1, GPT Image 2 and Nano Banana Pro in one studio.
            No watermark and a commercial license from {TIER_INFO.starter.label} up, cancel
            anytime.
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
              href={subscribeHref(ENTRY_TIER, Boolean(user))}
              prefetch={false}
              className={buttonVariants({ variant: "accent", size: "lg" })}
            >
              Get {ENTRY.label} for {ENTRY_PRICE}/mo
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <a href="#compare" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Compare prices
            </a>
          </motion.div>

          <motion.p
            {...rise(0.9, 0)}
            className="mt-4 text-caption text-text-tertiary"
          >
            {formatCredits(ENTRY.monthlyCredits)} credits every month. Just looking?{" "}
            <Link
              href={appHref("/signup")}
              prefetch={false}
              className="text-muted underline decoration-brand/50 underline-offset-4 transition-colors hover:text-brand"
            >
              Try it with {TIER_INFO.free.monthlyCredits} free credits
            </Link>{" "}
            — no card required.
          </motion.p>
        </div>

        <motion.div {...rise(0.95, 30)} className="relative z-10 mt-12">
          <PriceBoard animate={!shouldReduceMotion} />
        </motion.div>
      </div>
    </section>
  );
}
