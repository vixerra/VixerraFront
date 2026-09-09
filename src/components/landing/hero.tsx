"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, ArrowUpRight } from "lucide-react";
import { HeroDemoWidget } from "./hero-demo-widget";
import { SEEDANCE_MODEL_ID } from "@/lib/constants";
import { heroContainerVariants, heroWordVariants } from "@/lib/animations";

// Bold grotesk statement + a short italic-serif line underneath — the same
// two-beat structure ArtCraft uses for "Controllable AI / for artists.":
// one all-caps declarative line the eye reads first, then a quieter,
// lowercase editorial line that reads more like a considered subhead than
// another shouted headline.
const TITLE_WORDS = ["THE", "AI", "VIDEO", "& IMAGE"];
const TITLE_ACCENT_WORD = "STUDIO";
const TITLE_SCRIPT_LINE = "for ambitious creators.";

// Scattered photo/video collage around the central prompt card — an
// OpenArt-style hero (small floating tiles surrounding the generator, not
// one full-bleed background clip). All 5 tiles are local media from
// public/media, one clip + the app's 4 photography images; hidden below
// lg since 5 overlapping tiles has no room to breathe on a narrow viewport.
const COLLAGE = [
  {
    kind: "image" as const,
    url: "/media/images/gpt-image-11.webp",
    className: "left-[2%] top-[16%] w-44 -rotate-3 xl:w-52",
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
    className: "left-[7%] top-[52%] w-36 rotate-2 xl:w-44",
    aspect: "aspect-[3/4]",
  },
  {
    kind: "image" as const,
    url: "/media/images/gpt-image-06.webp",
    className: "right-[6%] top-[46%] w-36 -rotate-2 xl:w-44",
    aspect: "aspect-[3/4]",
  },
  {
    kind: "image" as const,
    url: "/media/images/gpt-image-16.webp",
    className: "left-1/2 bottom-[6%] w-52 -translate-x-1/2 -rotate-1 xl:w-60",
    aspect: "aspect-video",
  },
];

export function Hero() {
  const shouldReduceMotion = useReducedMotion();

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
                  className="h-full w-full object-cover opacity-80"
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
                <img src={item.url} alt="" className="h-full w-full object-cover opacity-80" />
              )}
            </motion.div>
          ))}
        </div>
      )}

      <div className="container-page relative py-24">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link
              href={`/generate?model=${encodeURIComponent(SEEDANCE_MODEL_ID)}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1.5 pl-3 pr-2.5 text-caption text-white/80 backdrop-blur transition-colors hover:border-white/25 hover:text-white"
            >
              <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
              Introducing Seedance 2.5
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
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
              className="inline-block text-brand"
              style={{ WebkitTextFillColor: "initial" }}
            >
              {TITLE_ACCENT_WORD}
            </motion.span>
          </motion.h1>

          <motion.p
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
            className="text-accent-script mt-2 text-3xl text-white/90 sm:text-4xl md:text-5xl"
          >
            {TITLE_SCRIPT_LINE}
          </motion.p>

          <motion.p
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
            className="mx-auto mt-6 max-w-xl text-body-lg text-muted"
          >
            Describe a scene, animate a photo, or edit an existing shot. Vixerra
            generates and refines broadcast-ready video and imagery in minutes —
            no crew, no timeline, no waiting.
          </motion.p>
        </div>

        <motion.div
          initial={shouldReduceMotion ? undefined : { opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.8 }}
          className="relative z-10"
        >
          <HeroDemoWidget />
        </motion.div>

        <motion.p
          initial={shouldReduceMotion ? undefined : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 1 }}
          className="relative z-10 mt-4 text-center text-caption text-white/50"
        >
          50 free credits to start — no credit card required
        </motion.p>
      </div>

      {!shouldReduceMotion && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 1.4 }}
          className="pointer-events-none absolute inset-x-0 bottom-6 flex flex-col items-center gap-1 text-white/40"
          aria-hidden="true"
        >
          <span className="text-caption tracking-wide uppercase">Scroll to explore</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
            <ChevronDown className="size-4" />
          </motion.div>
        </motion.div>
      )}
    </section>
  );
}
