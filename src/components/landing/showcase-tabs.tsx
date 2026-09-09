"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { TiltCard } from "@/components/marketing/tilt-card";
import { SEEDANCE25_SHOWCASE_VIDEOS, type ShowcaseVideo } from "@/lib/showcase-media";
import { GPT_IMAGE_2_IMAGES, type GptImage2Image } from "@/lib/gpt-image-2-showcase";
import { IMAGE_MODELS, VIDEO_MODELS, SEEDANCE_MODEL_ID } from "@/lib/constants";
import { useLazyVideo } from "@/hooks/use-lazy-video";

// Every curated video sample comes from the same live model (Seedance 2.5);
// every curated image sample comes from the same live model (GPT Image 2).
// Reading the id from the registry (not retyping it) means it stays correct
// even though some Cloudflare catalog ids carry leading-whitespace
// corruption (see cloudflare-models.ts) — round-tripping the id verbatim
// through the URL still lands back on the same registry entry.
const SEEDANCE_25 = VIDEO_MODELS.find((m) => m.id === SEEDANCE_MODEL_ID);
const GPT_IMAGE_2 = IMAGE_MODELS.find((m) => m.label === "GPT Image 2");

// All 4 Seedance 2.5 entries are "square" so every tile in the grid below
// renders the same size — "tall"/"wide" stay defined for any future entry
// that wants a different shape, but nothing currently uses them.
const VIDEO_ASPECT: Record<ShowcaseVideo["tile"], string> = {
  wide: "aspect-video",
  tall: "aspect-[3/4]",
  square: "aspect-square",
};

// Whole card is the click target — a single "Try this model" affordance
// rather than a separate nested link/button inside the card (keeps the
// touch target large and avoids nested-interactive-element a11y issues).
// No badge/caption chrome on the tile itself — matches the image grid's
// poster-wall look; the model identity is already stated once in the
// section header above, and the aria-label carries the prompt for a11y.
function VideoTile({ video }: { video: ShowcaseVideo }) {
  const { containerRef, videoRef, hasLoadedOnce } = useLazyVideo<HTMLAnchorElement>();
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const targetModelId = SEEDANCE_25?.id ?? SEEDANCE_MODEL_ID;
  const tryHref = `/generate?model=${encodeURIComponent(targetModelId)}&prompt=${encodeURIComponent(video.prompt)}`;

  return (
    <TiltCard className="block overflow-hidden rounded-lg">
      <Link
        href={tryHref}
        ref={containerRef}
        aria-label={`Try Seedance 2.5 with prompt: ${video.prompt}`}
        className={cn("group relative block w-full bg-surface-2", VIDEO_ASPECT[video.tile])}
      >
        {!loaded && !errored && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-surface-3 to-surface-2" />
        )}

        {errored ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface-3 to-brand/10">
            <Play className="size-8 text-muted" aria-hidden="true" />
          </div>
        ) : (
          hasLoadedOnce && (
            <video
              ref={videoRef}
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105",
                loaded ? "opacity-100" : "opacity-0",
              )}
              muted
              loop
              playsInline
              preload="none"
              onLoadedData={() => setLoaded(true)}
              onError={() => setErrored(true)}
            >
              <source src={video.url} type="video/mp4" />
            </video>
          )
        )}
      </Link>
    </TiltCard>
  );
}

// Same fixed-aspect + object-cover crop the hero's film-reel frames use
// (see hero.tsx's ReelFrame) instead of the natural-aspect/no-crop masonry
// tiles the video section above still uses — every tile bottoms out at the
// same edge row by row, a structured grid rather than a poster-wall of
// uneven heights. No per-tile badge/caption chrome — the model identity is
// carried once by the section header above the grid, not repeated on every
// tile. The whole tile is still the tap target for "Try this model".
function ImageTile({ image }: { image: GptImage2Image }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const tryHref = GPT_IMAGE_2
    ? `/generate/image?model=${encodeURIComponent(GPT_IMAGE_2.id)}&prompt=${encodeURIComponent(image.prompt)}`
    : "/generate/image";

  return (
    <TiltCard className="block overflow-hidden rounded-lg">
      <Link
        href={tryHref}
        title={image.prompt}
        className="group relative block aspect-[3/4] w-full bg-surface-2"
      >
        {!loaded && !errored && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-surface-3 to-surface-2" />
        )}

        {errored ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface-3 to-brand/10">
            <Play className="size-8 text-muted" aria-hidden="true" />
          </div>
        ) : (
          // Eager (no loading="lazy"), matching the hero's ReelFrame images —
          // lazy-loading this small ~8-image gallery meant a visible blank
          // beat while scrolling in, instead of the image already being
          // there. The fixed aspect-[3/4] height means eager-loading these
          // is not the perf concern it would've been on the old zero-height
          // masonry skeleton (that was the reason lazy was avoided there too).
          // eslint-disable-next-line @next/next/no-img-element -- local asset from public/media
          <img
            src={image.url}
            alt={image.prompt}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105",
              loaded ? "opacity-100" : "opacity-0",
            )}
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
          />
        )}
      </Link>
    </TiltCard>
  );
}

// higgsfield's Explore page states the model identity once, as a page
// header (name + tagline), rather than repeating it on every tile — and
// every model's section is always on the page, not gated behind a tab
// switch. With only two live models here, both sections render stacked.
// A real CSS grid (not a CSS-column masonry) so every row of fixed-aspect
// tiles lines up on the same bottom edge instead of trailing off unevenly —
// both sections are capped at a handful of entries now, so a poster-wall
// masonry has nothing left to do that a plain grid doesn't already do better.
function ShowcaseSection({
  name,
  description,
  children,
}: {
  name: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="text-heading font-extrabold uppercase tracking-tight text-brand">{name}</h3>
      <p className="mt-1 text-body text-muted">{description}</p>
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {children}
      </div>
    </div>
  );
}

export function ShowcaseTabs() {
  return (
    <div className="space-y-16">
      {SEEDANCE_25 && (
        <ShowcaseSection name={SEEDANCE_25.label} description={SEEDANCE_25.description}>
          {SEEDANCE25_SHOWCASE_VIDEOS.map((video) => (
            <VideoTile key={video.id} video={video} />
          ))}
        </ShowcaseSection>
      )}

      {GPT_IMAGE_2 && (
        <ShowcaseSection name={GPT_IMAGE_2.label} description={GPT_IMAGE_2.description}>
          {GPT_IMAGE_2_IMAGES.map((image) => (
            <ImageTile key={image.id} image={image} />
          ))}
        </ShowcaseSection>
      )}
    </div>
  );
}
