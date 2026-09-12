"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SEEDANCE25_SHOWCASE_VIDEOS } from "@/lib/showcase-media";
import { GPT_IMAGE_2_IMAGES } from "@/lib/gpt-image-2-showcase";
import { NANO_BANANA_IMAGES } from "@/lib/nano-banana-showcase";
import { VIDEO_MODELS, IMAGE_MODELS, SEEDANCE_MODEL_ID } from "@/lib/constants";
import { useLazyVideo } from "@/hooks/use-lazy-video";
import { appHref } from "@/lib/hosts";
import { cn } from "@/lib/utils";

// The four featured models — Seedance 2.5 and Kling 3.0 for video, GPT Image 2
// and Nano Banana Pro for images — interleaved video/image so the "All models"
// view doesn't read as two separate blocks.
const SEEDANCE_25 = VIDEO_MODELS.find((m) => m.id === SEEDANCE_MODEL_ID);
const GPT_IMAGE_2 = IMAGE_MODELS.find((m) => m.label === "GPT Image 2");
// `.trim()` guards against the leading-whitespace id corruption some
// CLOUDFLARE_MODELS entries carry (see cloudflare-models.ts) — matching on
// label instead of id would be more fragile since ids are stable identifiers.
const KLING_3 = VIDEO_MODELS.find((m) => m.id.trim() === "kling/3.0");
const NANO_BANANA_PRO = IMAGE_MODELS.find((m) => m.id.trim() === "google/nano-banana-pro");
// Deliberately a different id than Hero's BG_VIDEO (also from
// SEEDANCE25_SHOWCASE_VIDEOS) so this card doesn't repeat the exact clip the
// visitor just saw playing behind the hero copy.
const HERO_VIDEO =
  SEEDANCE25_SHOWCASE_VIDEOS.find((v) => v.id === "night-rally-car") ?? SEEDANCE25_SHOWCASE_VIDEOS[0];
const HERO_IMAGE = GPT_IMAGE_2_IMAGES.find((i) => i.id === "hero") ?? GPT_IMAGE_2_IMAGES[0];

// Local media only, sourced from public/media (no external CDN), same as
// SEEDANCE25_SHOWCASE_VIDEOS / GPT_IMAGE_2_IMAGES — picked so no two cards
// share a file.
const KLING_3_VIDEO_URL = "/media/videos/msc6H2R1htn6Mzjy_OPku_video.mp4";
const KLING_3_PROMPT =
  "A man dancing alone on a rain-soaked city rooftop at night, neon signs reflecting in puddles, slow cinematic dolly-in, synchronized beat and ambient city sound";
const NANO_BANANA_IMAGE =
  NANO_BANANA_IMAGES.find((i) => i.id === "coffee-mug-product") ?? NANO_BANANA_IMAGES[0];

type ModelCard = {
  kind: "video" | "image";
  href: string;
  label: string;
  provider: string;
  description: string;
  mediaUrl: string;
};

// Workspace links live on the app host — see hosts.ts for why a same-origin
// href to /generate from the public site breaks.
const MODEL_CARDS: ModelCard[] = [
  SEEDANCE_25 && {
    kind: "video",
    href: appHref(`/generate?model=${encodeURIComponent(SEEDANCE_25.id)}&prompt=${encodeURIComponent(HERO_VIDEO.prompt)}`),
    label: SEEDANCE_25.label,
    provider: SEEDANCE_25.provider,
    description: SEEDANCE_25.description,
    mediaUrl: HERO_VIDEO.url,
  },
  GPT_IMAGE_2 && {
    kind: "image",
    href: appHref(`/generate/image?model=${encodeURIComponent(GPT_IMAGE_2.id)}&prompt=${encodeURIComponent(HERO_IMAGE.prompt)}`),
    label: GPT_IMAGE_2.label,
    provider: GPT_IMAGE_2.provider,
    description: GPT_IMAGE_2.description,
    mediaUrl: HERO_IMAGE.url,
  },
  KLING_3 && {
    kind: "video",
    href: appHref(`/generate?model=${encodeURIComponent(KLING_3.id)}&prompt=${encodeURIComponent(KLING_3_PROMPT)}`),
    label: KLING_3.label,
    provider: KLING_3.provider,
    description: "Up to 4K video with native audio and optional reference image",
    mediaUrl: KLING_3_VIDEO_URL,
  },
  NANO_BANANA_PRO && {
    kind: "image",
    href: appHref(`/generate/image?model=${encodeURIComponent(NANO_BANANA_PRO.id)}&prompt=${encodeURIComponent(NANO_BANANA_IMAGE.prompt)}`),
    label: NANO_BANANA_PRO.label,
    provider: NANO_BANANA_PRO.provider,
    description: NANO_BANANA_PRO.description,
    mediaUrl: NANO_BANANA_IMAGE.url,
  },
].filter((c): c is ModelCard => Boolean(c));

// Cards below the hero are off-screen on first paint (some horizontally,
// past the carousel's visible width; the rest vertically, until scrolled
// to) — autoplaying every one of them unconditionally on mount meant every
// landing pageload was fetching/decoding this many video streams at once
// regardless of whether they were ever seen. Deferred to useLazyVideo so
// each only starts once it's actually about to be on screen.
function CarouselVideo({ src }: { src: string }) {
  const { containerRef, videoRef, hasLoadedOnce } = useLazyVideo<HTMLDivElement>();
  return (
    <div ref={containerRef} className="absolute inset-0">
      {hasLoadedOnce && (
        <video
          ref={videoRef}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          muted
          loop
          playsInline
          preload="none"
        >
          <source src={src} type="video/mp4" />
        </video>
      )}
    </div>
  );
}

const FILTERS = [
  { value: "all", label: "All models" },
  { value: "video", label: "Video models" },
  { value: "image", label: "Image models" },
] as const;
type Filter = (typeof FILTERS)[number]["value"];

// Large feature-card carousel, one per live model with curated examples —
// mirrors higgsfield.ai's horizontal model-carousel pattern: big media
// preview, title/description scrim, single "Open" CTA per card. Pill
// segmented control filters by modality (migration brief §3, step 5's
// "Video AI tools / Image AI tools" tab pattern) rather than a separate
// tabbed UI — same card list, just narrowed.
export function ModelCarousel() {
  const [filter, setFilter] = useState<Filter>("all");

  if (MODEL_CARDS.length === 0) return null;

  const visibleCards = filter === "all" ? MODEL_CARDS : MODEL_CARDS.filter((c) => c.kind === filter);

  return (
    <div>
      <div className="mb-6 inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 p-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-label font-medium transition-colors",
              filter === f.value ? "bg-brand text-on-brand" : "text-muted hover:text-ink",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:gap-5 sm:px-0">
        {visibleCards.map((card) => (
        <Link
          key={card.label}
          href={card.href}
          prefetch={false}
          className="group relative flex h-[320px] w-[85vw] max-w-sm flex-none snap-center overflow-hidden rounded-2xl border border-line bg-surface-2 sm:h-[380px] sm:w-[480px] sm:max-w-none"
        >
          {card.kind === "video" ? (
            <CarouselVideo src={card.mediaUrl} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- local asset from public/media
            <img
              src={card.mediaUrl}
              alt={card.label}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}

          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgb(0 0 0 / 0.92) 0%, rgb(0 0 0 / 0.35) 45%, transparent 75%)",
            }}
          />

          <div className="relative z-10 mt-auto flex w-full flex-col gap-2 p-6">
            <span className="inline-flex w-fit items-center rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[11px] leading-4 font-medium text-white/80 backdrop-blur">
              {card.provider}
            </span>
            <h3 className="text-heading font-bold text-white">{card.label}</h3>
            <p className="line-clamp-2 text-body-sm text-white/70">{card.description}</p>
            <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-label font-semibold text-on-brand shadow-glow-sm transition-transform duration-200 group-hover:translate-x-0.5">
              Open workspace
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </span>
          </div>
        </Link>
        ))}
      </div>
    </div>
  );
}
