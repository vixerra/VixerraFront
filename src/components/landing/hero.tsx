"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SEEDANCE_MODEL_ID, TIER_INFO } from "@/lib/constants";
import { heroContainerVariants, heroWordVariants } from "@/lib/animations";
import { useMe } from "@/hooks/use-me";
import { appHref, subscribeHref } from "@/lib/hosts";
import { formatCredits } from "@/lib/utils";
import {
  COMPETITORS,
  ENTRY_PRICE_MONTHLY,
  ENTRY_TIER,
  PRICES_CHECKED_ON,
  formatListPrice,
  yearlySavings,
} from "@/lib/competitor-pricing";

// Price-led, subscribe-first: the headline IS the offer (every model, from
// the entry plan's price), the main CTA subscribes to that entry plan
// directly (the plans section is one scroll away for anyone comparing), and
// the one object under it is the entry-price board — the same comparison the
// #compare section details, at a glance. Same two-beat title as before: an
// all-caps grotesk statement, then a quieter italic-serif line.
const TITLE_WORDS = ["EVERY", "TOP", "AI", "MODEL."];
const TITLE_SCRIPT_LINE = "one plan, every model.";
const ENTRY_PRICE = formatListPrice(ENTRY_PRICE_MONTHLY);
const ENTRY = TIER_INFO[ENTRY_TIER];

// Featured models, each a direct link into its workspace — the same
// flagship lineup the competitors in the board below sell.
const FEATURED_MODELS = [
  { label: "Seedance 2.5", path: `/generate?model=${encodeURIComponent(SEEDANCE_MODEL_ID)}` },
  { label: "Kling 3.0", path: `/generate?model=${encodeURIComponent("kling/3.0")}` },
  { label: "GPT Image 2", path: `/generate/image?model=${encodeURIComponent("openai/gpt-image-2")}` },
  { label: "Nano Banana Pro", path: `/generate/image?model=${encodeURIComponent("google/nano-banana-pro")}` },
];

// Scattered photo/video collage around the centre column — local media from
// public/media, hidden below lg where overlapping tiles have no room. The
// bottom-centre tile the old hero had is gone: the price board sits there.
const COLLAGE = [
  {
    kind: "image" as const,
    url: "/media/images/gpt-image-11.webp",
    className: "left-[2%] top-[14%] w-44 -rotate-3 xl:w-52",
    aspect: "aspect-[3/4]",
  },
  {
    kind: "video" as const,
    url: "/media/videos/01_seedance_2_0_1b29ad9ce6.mp4",
    className: "right-[3%] top-[10%] w-48 rotate-3 xl:w-56",
    aspect: "aspect-video",
  },
  {
    kind: "image" as const,
    url: "/media/images/gpt-image-09.webp",
    className: "left-[6%] top-[56%] w-36 rotate-2 xl:w-44",
    aspect: "aspect-[3/4]",
  },
  {
    kind: "image" as const,
    url: "/media/images/gpt-image-06.webp",
    className: "right-[5%] top-[50%] w-36 -rotate-2 xl:w-44",
    aspect: "aspect-[3/4]",
  },
];

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

/** Cheapest paid plan per month, as bars — ours in lime, theirs in silver,
 *  with what theirs costs over a year beyond ours in amber (the money
 *  colour, see globals.css). */
function PriceBoard({ animate }: { animate: boolean }) {
  return (
    <div className="glass mx-auto w-full max-w-xl rounded-2xl p-5 text-left shadow-floating sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-display text-label font-semibold text-ink">
          Cheapest paid plan, per month
        </p>
        <p className="text-caption text-text-tertiary">Public prices · {PRICES_CHECKED_ON}</p>
      </div>
      <ul className="mt-5 space-y-3.5">
        {BOARD_ROWS.map((row, i) => (
          <li key={row.name} className="grid grid-cols-[5.25rem_1fr_4.75rem] items-center gap-3">
            <span
              className={
                row.ours
                  ? "font-display text-body-sm font-bold text-brand"
                  : "text-body-sm text-muted"
              }
            >
              {row.name}
            </span>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className={
                  row.ours
                    ? "h-full origin-left rounded-full bg-brand shadow-glow-sm"
                    : "h-full origin-left rounded-full bg-silver/30"
                }
                style={{ width: `${(row.price / BOARD_MAX) * 100}%` }}
                initial={animate ? { scaleX: 0 } : false}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.9, delay: 1.1 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <span className="flex flex-col items-end leading-tight">
              <span
                className={
                  row.ours
                    ? "font-display text-body font-bold text-brand"
                    : "font-display text-body-sm font-semibold text-ink"
                }
              >
                {formatListPrice(row.price)}
              </span>
              {row.savings !== null && (
                <span className="text-[11px] text-accent-amber">+${row.savings}/yr</span>
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

  return (
    <section className="relative isolate flex min-h-screen flex-col justify-center overflow-hidden bg-black">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[70%] -translate-x-1/2 -translate-y-1/3 rounded-full bg-brand/10 blur-[120px]"
        aria-hidden="true"
      />

      {!shouldReduceMotion && (
        <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden="true">
          {COLLAGE.map((item, i) => (
            <motion.div
              key={item.url}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className={`absolute ${item.className} ${item.aspect} overflow-hidden rounded-2xl border border-white/10 shadow-floating`}
            >
              {item.kind === "video" ? (
                <video
                  className="h-full w-full object-cover opacity-70"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                >
                  <source src={item.url} type="video/mp4" />
                </video>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- local asset from public/media, decorative collage
                <img src={item.url} alt="" className="h-full w-full object-cover opacity-70" />
              )}
            </motion.div>
          ))}
        </div>
      )}

      <div className="container-page relative py-20 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap items-center justify-center gap-2"
          >
            {FEATURED_MODELS.map((model) => (
              <Link
                key={model.label}
                href={appHref(model.path)}
                prefetch={false}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1.5 pl-3 pr-2.5 text-caption text-white/80 backdrop-blur transition-colors hover:border-white/25 hover:text-white"
              >
                <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
                {model.label}
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            ))}
          </motion.div>

          <motion.h1
            variants={shouldReduceMotion ? undefined : heroContainerVariants}
            initial="hidden"
            animate="visible"
            className="font-display mt-6 bg-gradient-to-b from-white to-white/50 bg-clip-text text-4xl leading-[0.95] font-bold tracking-tight text-transparent uppercase sm:text-5xl md:text-6xl lg:text-display"
          >
            {TITLE_WORDS.map((word, i) => (
              <motion.span
                key={`w-${i}`}
                variants={shouldReduceMotion ? undefined : heroWordVariants}
                className="mr-[0.25em] inline-block"
              >
                {word}
              </motion.span>
            ))}
            <motion.span
              variants={shouldReduceMotion ? undefined : heroWordVariants}
              className="block text-brand"
              style={{ WebkitTextFillColor: "initial" }}
            >
              From {ENTRY_PRICE}
              <span className="ml-1 align-top text-[0.35em] leading-none text-white/60">/mo</span>
            </motion.span>
          </motion.h1>

          <motion.p
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
            className="text-accent-script mt-3 text-3xl text-white/90 sm:text-4xl md:text-5xl"
          >
            {TITLE_SCRIPT_LINE}
          </motion.p>

          <motion.p
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
            className="mx-auto mt-6 max-w-xl text-body-lg text-muted"
          >
            Seedance 2.5, Kling 3.0, Veo 3.1, GPT Image 2 and Nano Banana Pro in one studio.
            No watermark on any plan, commercial license from {TIER_INFO.starter.label} up, cancel
            anytime.
          </motion.p>

          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.75 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              href={subscribeHref(ENTRY_TIER, Boolean(user))}
              prefetch={false}
              className={buttonVariants({
                variant: "accent",
                className: "w-full px-8 py-4 text-body sm:w-auto sm:px-8 sm:py-4",
              })}
            >
              Get {ENTRY.label} for {ENTRY_PRICE}/mo
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <a
              href="#compare"
              className={buttonVariants({
                variant: "glass",
                className: "w-full px-8 py-4 text-body sm:w-auto sm:px-8 sm:py-4",
              })}
            >
              Compare prices
            </a>
          </motion.div>

          <motion.p
            initial={shouldReduceMotion ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.9 }}
            className="mt-4 text-caption text-white/50"
          >
            {formatCredits(ENTRY.monthlyCredits)} credits every month. Just looking?{" "}
            <Link
              href={appHref("/signup")}
              prefetch={false}
              className="text-white/70 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white"
            >
              Try it with {TIER_INFO.free.monthlyCredits} free credits
            </Link>{" "}
            — no card required.
          </motion.p>
        </div>

        <motion.div
          initial={shouldReduceMotion ? undefined : { opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.95 }}
          className="relative z-10 mt-12"
        >
          <PriceBoard animate={!shouldReduceMotion} />
        </motion.div>
      </div>
    </section>
  );
}
