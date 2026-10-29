"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { TIER_INFO, UNLIMITED_PROMO } from "@/lib/constants";
import { useLazyVideo } from "@/hooks/use-lazy-video";
import { useUnlimitedPromoEnabled } from "@/hooks/use-launch-offer";

/**
 * Promo for the 7-day Wan 3.0 Unlimited (UNLIMITED_PROMO). The fine print
 * restates the real terms — Creator/Studio, Relax mode — so the headline's
 * "unlimited" never reads as a blanket claim. Hidden with the rest of the
 * Unlimited marketing when the API's UNLIMITED_PROMO_ENABLED switch is off.
 */
export function Wan3UnlimitedBanner() {
  const enabled = useUnlimitedPromoEnabled();
  const { containerRef, videoRef, hasLoadedOnce } = useLazyVideo<HTMLAnchorElement>();

  if (!enabled) return null;

  return (
    <section className="container-page py-4">
      <Reveal>
        <Link
          ref={containerRef}
          href="/pricing"
          className="group relative block min-h-[440px] overflow-hidden rounded-[28px] border border-line bg-black transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-glow-sm sm:min-h-[480px]"
        >
          {hasLoadedOnce && (
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              muted
              loop
              playsInline
              preload="none"
              aria-hidden="true"
            >
              <source src="/media/videos/wan3-unlimited.mp4" type="video/mp4" />
            </video>
          )}
          {/* The clip is bright (open sky, pale rooftops), so the text sits on
              a dark scrim: from the bottom on phones, where the text stacks
              at the foot of the frame, and from the left from sm up. */}
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/10 sm:bg-gradient-to-r sm:from-black/85 sm:via-black/45 sm:to-transparent"
            aria-hidden="true"
          />

          <div className="relative flex min-h-[inherit] flex-col justify-end p-8 sm:justify-center sm:p-12">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-brand px-2.5 py-1 text-caption font-black tracking-wide text-on-brand uppercase">
                Now live
              </span>
              <span className="rounded-md border border-accent-hot-ink/40 bg-black/40 px-2.5 py-1 text-caption font-black tracking-wide text-accent-hot-ink uppercase backdrop-blur-sm">
                {UNLIMITED_PROMO.days} days unlimited
              </span>
            </div>

            <h2 className="mt-4 max-w-2xl text-heading leading-[1.05] font-black tracking-tight uppercase drop-shadow-lg sm:text-display">
              <span className="block text-accent-hot-ink">Wan 3.0 is officially</span>
              <span className="block text-white">unlimited on Vixlens</span>
            </h2>

            <p className="mt-4 max-w-lg text-body text-white/80">
              Free Wan 3.0 videos every day for {UNLIMITED_PROMO.days} days, in Relax mode from
              your first payment: up to 5 a day at 720p on {TIER_INFO.creator.label}, up to 4 a day
              at 1080p on {TIER_INFO.studio.label}.
            </p>

            <span className="font-display mt-6 inline-flex w-fit items-center gap-2 rounded-lg bg-brand px-5 py-3 text-[12px] font-bold tracking-[0.06em] uppercase text-on-brand transition-transform group-hover:translate-x-1">
              Get unlimited
              <ArrowRight className="size-4" aria-hidden="true" />
            </span>
          </div>
        </Link>
      </Reveal>
    </section>
  );
}
