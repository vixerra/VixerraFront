"use client";

import Link from "next/link";
import { ArrowRight, Play, Sparkle } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { INFLUENCER_FILM, influencerHref, openFeatureAnnouncement } from "@/lib/feature-announcement";

/** Lime-ringed pill from the launch creative: star, label, arrow disc. */
export function CreateInfluencerLink() {
  // The header's query, so this adds no /auth/me call of its own.
  const { data: user } = useMe();

  return (
    <Link
      href={influencerHref(Boolean(user))}
      prefetch={false}
      className="group/cta font-display inline-flex items-center gap-3 rounded-full border border-brand/60 bg-surface py-2 pr-2 pl-5 text-label font-semibold text-ink shadow-glow-sm transition-[border-color,box-shadow] hover:border-brand hover:shadow-glow-md"
    >
      <Sparkle className="size-4 fill-brand text-brand" aria-hidden="true" />
      Create yours for free
      <span className="flex size-9 items-center justify-center rounded-full bg-brand text-on-brand transition-transform group-hover/cta:translate-x-0.5">
        <ArrowRight className="size-4" aria-hidden="true" />
      </span>
    </Link>
  );
}

/** Covers the cast grid: the whole visual is the play target. */
export function WatchFilmButton() {
  return (
    <button
      type="button"
      onClick={openFeatureAnnouncement}
      aria-label={`Watch the AI Influencer launch film (${INFLUENCER_FILM.duration})`}
      className="group/play absolute inset-0 flex items-center justify-center"
    >
      <span className="btn-glass relative flex items-center gap-3 rounded-full py-1.5 pr-5 pl-1.5 text-label font-semibold text-white shadow-floating transition-transform duration-300 group-hover/play:scale-105">
        <span className="flex size-10 items-center justify-center rounded-full bg-brand text-on-brand shadow-glow-md">
          <Play className="size-4 translate-x-px fill-current" aria-hidden="true" />
        </span>
        Watch the film
        <span className="font-mono text-caption text-white/60">{INFLUENCER_FILM.duration}</span>
      </span>
    </button>
  );
}
