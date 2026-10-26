"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLazyVideo } from "@/hooks/use-lazy-video";
import { appHref } from "@/lib/hosts";

const KLING4_MODEL_ID = "kling/4.0";

/**
 * Kling 4.0's slide in the landing launch carousel (the "kling/4.0" entry in
 * cloudflare-models.ts). The clip fills the card and the copy sits on a dark
 * scrim, like the Wan 3.0 Unlimited banner. Every claim is one the entry
 * backs: 3-30s, 720p/1080p, native audio, reference images and clips,
 * first/last frames. The clip loads only once the slide is on screen.
 */
export function Kling4Slide() {
  const { containerRef, videoRef, hasLoadedOnce } = useLazyVideo<HTMLAnchorElement>();

  return (
    <Link
      ref={containerRef}
      href={appHref(`/generate?model=${encodeURIComponent(KLING4_MODEL_ID)}`)}
      prefetch={false}
      className="group relative block h-full min-h-[440px] overflow-hidden rounded-[28px] border border-line bg-black bg-cover bg-center sm:min-h-[480px]"
      style={{ backgroundImage: "url(/media/videos/kling4-launch.jpg)" }}
    >
      {hasLoadedOnce && (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          loop
          playsInline
          preload="none"
          poster="/media/videos/kling4-launch.jpg"
          aria-hidden="true"
        >
          <source src="/media/videos/kling4-launch.mp4" type="video/mp4" />
        </video>
      )}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/10 sm:bg-gradient-to-r sm:from-black/85 sm:via-black/45 sm:to-transparent"
        aria-hidden="true"
      />

      <div className="relative flex h-full min-h-[inherit] flex-col justify-end p-7 sm:justify-center sm:p-10 lg:pl-14">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-brand px-2.5 py-1 text-caption font-black tracking-wide text-on-brand uppercase">
            New model
          </span>
          <span className="rounded-md border border-accent-hot-ink/40 bg-black/40 px-2.5 py-1 text-caption font-black tracking-wide text-accent-hot-ink uppercase backdrop-blur-sm">
            Up to 30s · native audio
          </span>
        </div>

        <h3 className="mt-4 max-w-3xl text-heading leading-[1.05] font-black tracking-tight uppercase drop-shadow-lg sm:text-display">
          <span className="block text-accent-hot-ink">Kling 4.0 is now live</span>
          <span className="block text-white">on Vixlens</span>
        </h3>

        <p className="mt-4 max-w-lg text-body text-white/80">
          Kling&apos;s newest model: clips from 3 to 30 seconds at up to 1080p, with sound generated
          alongside the picture. Guide it with reference images and videos, or set the first and
          last frame.
        </p>

        <span className="font-display mt-6 inline-flex w-fit items-center gap-2 rounded-lg bg-brand px-5 py-3 text-[12px] font-bold tracking-[0.06em] uppercase text-on-brand transition-transform group-hover:translate-x-1">
          Try Kling 4.0
          <ArrowRight className="size-4" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
