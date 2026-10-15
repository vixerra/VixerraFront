"use client";

import Link from "next/link";
import { ArrowRight, Play, Sparkle } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import {
  GENJUTSU_FILM,
  INFLUENCER_FILM,
  genjutsuHref,
  influencerHref,
  openFeatureAnnouncement,
  type Announcement,
} from "@/lib/feature-announcement";

const LAUNCHES = {
  influencer: { href: influencerHref, film: INFLUENCER_FILM, name: "AI Influencer" },
  genjutsu: { href: genjutsuHref, film: GENJUTSU_FILM, name: "Genjutsu" },
} as const;

/** Lime-ringed pill from the launch creative: star, label, arrow disc. */
function LaunchLink({ launch, label }: { launch: Announcement; label: string }) {
  // The header's query, so this adds no /auth/me call of its own.
  const { data: user } = useMe();

  return (
    <Link
      href={LAUNCHES[launch].href(Boolean(user))}
      prefetch={false}
      className="group/cta font-display inline-flex items-center gap-3 rounded-full border border-brand-ink/60 bg-surface py-2 pr-2 pl-5 text-label font-semibold text-ink shadow-glow-sm transition-[border-color,box-shadow] hover:border-brand-ink hover:shadow-glow-md"
    >
      <Sparkle className="size-4 fill-brand-ink text-brand-ink" aria-hidden="true" />
      {label}
      <span className="flex size-9 items-center justify-center rounded-full bg-brand text-on-brand transition-transform group-hover/cta:translate-x-0.5">
        <ArrowRight className="size-4" aria-hidden="true" />
      </span>
    </Link>
  );
}

export function CreateInfluencerLink() {
  return <LaunchLink launch="influencer" label="Create yours" />;
}

export function TryGenjutsuLink() {
  return <LaunchLink launch="genjutsu" label="Try Genjutsu" />;
}

/** Covers the slide's visual: the whole thing is the play target. */
export function WatchFilmButton({ launch = "influencer" }: { launch?: Announcement }) {
  const { film, name } = LAUNCHES[launch];

  return (
    <button
      type="button"
      onClick={() => openFeatureAnnouncement(launch)}
      aria-label={`Watch the ${name} launch film (${film.duration})`}
      className="group/play absolute inset-0 flex items-center justify-center"
    >
      <span className="btn-glass relative flex items-center gap-3 rounded-full py-1.5 pr-5 pl-1.5 text-label font-semibold text-ink shadow-floating transition-transform duration-300 group-hover/play:scale-105">
        <span className="flex size-10 items-center justify-center rounded-full bg-brand text-on-brand shadow-glow-md">
          <Play className="size-4 translate-x-px fill-current" aria-hidden="true" />
        </span>
        Watch the film
        <span className="font-mono text-caption text-ink/60">{film.duration}</span>
      </span>
    </button>
  );
}
