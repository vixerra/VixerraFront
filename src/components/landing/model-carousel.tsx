"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SEEDANCE25_SHOWCASE_VIDEOS } from "@/lib/showcase-media";
import { GPT_IMAGE_2_IMAGES } from "@/lib/gpt-image-2-showcase";
import { VIDEO_MODELS, IMAGE_MODELS, SEEDANCE_MODEL_ID } from "@/lib/constants";
import { useLazyVideo } from "@/hooks/use-lazy-video";
import { cn } from "@/lib/utils";

// This first card leads with Seedance 2.5 and GPT Image 2 — the two flagship
// models, each shown with its own real output (see showcase-media.ts /
// gpt-image-2-showcase.ts) rather than borrowing a sample from a different
// model like the previous Seedance 2.0 / Nano Banana version of this card did.
const SEEDANCE_25 = VIDEO_MODELS.find((m) => m.id === SEEDANCE_MODEL_ID);
const GPT_IMAGE_2 = IMAGE_MODELS.find((m) => m.label === "GPT Image 2");
// `.trim()` guards against the leading-whitespace id corruption some
// CLOUDFLARE_MODELS entries carry (see cloudflare-models.ts) — matching on
// label instead of id would be more fragile since ids are stable identifiers.
const VEO_3_1 = VIDEO_MODELS.find((m) => m.id.trim() === "google/veo-3.1");
const RECRAFT_4_1 = IMAGE_MODELS.find((m) => m.id.trim() === "recraft/recraftv4-1");
// Deliberately a different id than Hero's BG_VIDEO (also from
// SEEDANCE25_SHOWCASE_VIDEOS) so this card doesn't repeat the exact clip the
// visitor just saw playing behind the hero copy.
const HERO_VIDEO =
  SEEDANCE25_SHOWCASE_VIDEOS.find((v) => v.id === "night-rally-car") ?? SEEDANCE25_SHOWCASE_VIDEOS[0];
const HERO_IMAGE = GPT_IMAGE_2_IMAGES.find((i) => i.id === "hero") ?? GPT_IMAGE_2_IMAGES[0];

// Local media only — one per additional model, sourced from public/media
// (no external CDN), same as SEEDANCE25_SHOWCASE_VIDEOS / GPT_IMAGE_2_IMAGES.
const VEO_3_1_VIDEO_URL = "/media/videos/makeup-girl.mp4";
const VEO_3_1_PROMPT =
  "First-person view soaring low over a medieval battlefield at dawn, gliding past clashing knights in armor, fire-lit arrows whizzing overhead, splintered catapults burning near fallen soldiers, flying inches above torn flags and mud-soaked ground, ambient sounds of swords striking, war cries, galloping hooves, and wind rushing in your ears, raw, terrifying, epic";
const RECRAFT_4_1_IMAGE_URL = "/media/images/gpt-image-09.webp";
const RECRAFT_4_1_PROMPT = "High-end skincare bottle floating on a swirl of cream texture, macro, soft pink palette";

type ModelCard = {
  kind: "video" | "image";
  href: string;
  label: string;
  provider: string;
  description: string;
  mediaUrl: string;
};

const MODEL_CARDS: ModelCard[] = [
  SEEDANCE_25 && {
    kind: "video",
    href: `/generate?model=${encodeURIComponent(SEEDANCE_25.id)}&prompt=${encodeURIComponent(HERO_VIDEO.prompt)}`,
    label: SEEDANCE_25.label,
    provider: SEEDANCE_25.provider,
    description: SEEDANCE_25.description,
    mediaUrl: HERO_VIDEO.url,
  },
  GPT_IMAGE_2 && {
    kind: "image",
    href: `/generate/image?model=${encodeURIComponent(GPT_IMAGE_2.id)}&prompt=${encodeURIComponent(HERO_IMAGE.prompt)}`,
    label: GPT_IMAGE_2.label,
    provider: GPT_IMAGE_2.provider,
    description: GPT_IMAGE_2.description,
    mediaUrl: HERO_IMAGE.url,
  },
  VEO_3_1 && {
    kind: "video",
    href: `/generate?model=${encodeURIComponent(VEO_3_1.id)}&prompt=${encodeURIComponent(VEO_3_1_PROMPT)}`,
    label: VEO_3_1.label,
    provider: VEO_3_1.provider,
    description: VEO_3_1.description,
    mediaUrl: VEO_3_1_VIDEO_URL,
  },
  RECRAFT_4_1 && {
    kind: "image",
    href: `/generate/image?model=${encodeURIComponent(RECRAFT_4_1.id)}&prompt=${encodeURIComponent(RECRAFT_4_1_PROMPT)}`,
    label: RECRAFT_4_1.label,
    provider: RECRAFT_4_1.provider,
    description: RECRAFT_4_1.description,
    mediaUrl: RECRAFT_4_1_IMAGE_URL,
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
