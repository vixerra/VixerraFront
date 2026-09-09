"use client";

import Link from "next/link";
import { Reveal } from "@/components/marketing/reveal";
import { buttonVariants } from "@/components/ui/button";
import { useLazyVideo } from "@/hooks/use-lazy-video";
import { cn } from "@/lib/utils";

// Replaces the old "Real output, not mockups" tile wall — an OpenArt-style
// "how creators use this" section instead: one real clip per use case,
// paired with the description and a single CTA, alternating media side per
// row. Two rows, one per local video in public/media/videos (marketing.mp4,
// ads.mp4) — no external CDN, no fabricated case studies.
const USE_CASES = [
  {
    id: "marketing",
    title: "Marketing and ad creatives",
    body: "Vixerra is your AI creative companion for marketing. Generate promo videos, branded stories, and website hero visuals without booking a production schedule. Spin up variations from a single prompt and run A/B tests without re-sourcing creators or reshooting.",
    videoUrl: "/media/videos/marketing.mp4",
  },
  {
    id: "ads",
    title: "Paid social & performance ads",
    body: "Turn one idea into dozens of scroll-stopping ad variations. Test hooks, formats, and styles for paid social in minutes instead of weeks — no shoot, no editor queue, no production calendar to work around.",
    videoUrl: "/media/videos/ads.mp4",
  },
] as const;

function UseCaseVideo({ url, className }: { url: string; className?: string }) {
  const { containerRef, videoRef, hasLoadedOnce } = useLazyVideo<HTMLDivElement>();

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-card sm:aspect-video",
        className,
      )}
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
          <source src={url} type="video/mp4" />
        </video>
      )}
    </div>
  );
}

export function CreatorUseCases() {
  return (
    <section className="border-t border-line py-20 sm:py-28">
      <Reveal className="container-page mx-auto max-w-2xl text-center">
        <h2 className="text-heading font-bold text-ink">How creators are using Vixerra&apos;s AI video maker</h2>
        <p className="mt-4 text-body text-muted">
          See how professionals and independent creators use Vixerra&apos;s AI video generator and
          editor to ship content faster than ever.
        </p>
      </Reveal>

      <div className="container-page mt-16 space-y-16">
        {USE_CASES.map((useCase, i) => (
          <Reveal
            key={useCase.id}
            className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16"
          >
            <UseCaseVideo url={useCase.videoUrl} className={i % 2 === 1 ? "lg:order-last" : "lg:order-first"} />

            <div>
              <h3 className="text-subheading font-bold text-ink">{useCase.title}</h3>
              <p className="mt-4 text-body text-muted">{useCase.body}</p>
              <Link href="/generate" className={buttonVariants({ variant: "primary", className: "mt-6" })}>
                Try it now
              </Link>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
