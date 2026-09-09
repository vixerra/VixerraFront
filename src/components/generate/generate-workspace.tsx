"use client";

import { useMe } from "@/hooks/use-me";
import { useCanGenerate } from "@/components/providers/workspace-provider";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FolderOpen, Lock, Megaphone, Sparkles, Wand2, Zap } from "lucide-react";
import { TextToVideoForm } from "./text-to-video-form";
import { TextToImageForm } from "./text-to-image-form";
import { JobStatusCard } from "./job-status-card";
import { MODALITIES } from "./modality-switcher";
import { useGeneration } from "@/hooks/use-generation";
import { useUsage } from "@/hooks/use-credits";
import { useSpotlight } from "@/hooks/use-spotlight";
import { cn, formatCredits } from "@/lib/utils";
import {
  VIDEO_MODELS,
  IMAGE_MODELS,
  SEEDANCE2_RESOLUTIONS,
  SEEDANCE2_ASPECT_RATIOS,
  type VideoModelId,
  type ImageModelId,
  type GenerationType,
} from "@/lib/constants";

/**
 * Studio layout: a fixed-width composer panel on the left (modality tabs →
 * model → upload → prompt → settings → generate, top to bottom) and the
 * result canvas filling the rest — the classic image-to-video studio
 * arrangement (media.io, Kling, PixVerse) rather than the previous
 * bottom-docked composer bar. On desktop the studio claims the viewport
 * height left under the app header and each side scrolls internally; below
 * lg the two stack and the page scrolls as one.
 */
export function GenerateStudio({ type }: { type: GenerationType }) {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeIsVideo, setActiveIsVideo] = useState(true);
  const generation = useGeneration(activeJobId);
  const active = MODALITIES.find((m) => m.type === type) ?? MODALITIES[0];
  const spotlight = useSpotlight<HTMLDivElement>();

  // Deep-link support — the gallery preview's Recreate button and the
  // landing page's "try this prompt" links both land here with
  // ?model=&prompt= (and friends) pre-filled. Read once: these only seed
  // initial state, they don't stay in sync with the form afterwards.
  const searchParams = useSearchParams();
  const requestedModel = searchParams.get("model");
  const initialModel = VIDEO_MODELS.some((m) => m.id === requestedModel)
    ? (requestedModel as VideoModelId)
    : undefined;
  const initialImageModel = IMAGE_MODELS.some((m) => m.id === requestedModel)
    ? (requestedModel as ImageModelId)
    : undefined;
  const initialPrompt = searchParams.get("prompt") ?? undefined;
  const requestedDuration = Number(searchParams.get("duration"));
  const requestedResolution = searchParams.get("resolution");
  const requestedAspectRatio = searchParams.get("aspectRatio");
  const initialParams = {
    duration: Number.isFinite(requestedDuration) && requestedDuration > 0 ? requestedDuration : undefined,
    resolution: SEEDANCE2_RESOLUTIONS.some((r) => r === requestedResolution)
      ? (requestedResolution as (typeof SEEDANCE2_RESOLUTIONS)[number])
      : undefined,
    aspectRatio: SEEDANCE2_ASPECT_RATIOS.some((a) => a === requestedAspectRatio)
      ? (requestedAspectRatio as (typeof SEEDANCE2_ASPECT_RATIOS)[number])
      : undefined,
  };

  // Shared with every composer form's submit button, which prices and gates
  // itself off the same balance — see useUsage.
  const usageQuery = useUsage();
  const { data: me } = useMe();
  const canGenerate = useCanGenerate(me?.organization);

  const busy = generation.status === "queued" || generation.status === "processing";
  const hasJob = Boolean(activeJobId);

  function handleCreated(isVideo: boolean) {
    return (jobId: string) => {
      setActiveIsVideo(isVideo);
      setActiveJobId(jobId);
    };
  }

  // "Create another" (completed) / "Try again" (failed) both just clear the
  // active job so the idle canvas + composer come back for a fresh attempt.
  function handleReset() {
    setActiveJobId(null);
  }

  return (
    // The 8rem accounts for the app header (h-16) plus <main>'s lg:p-8
    // vertical padding — see app-shell.tsx.
    <div className="flex flex-col gap-4 lg:h-[calc(100vh-8rem)] lg:flex-row">
      {/* Composer panel. The 1px brand top edge is the one accent touch
          carried over from the old composer bar — still marking "this is
          the generate control" without going full glow. */}
      <div
        className={cn(
          "relative isolate flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-floating",
          "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-brand before:content-['']",
          "lg:w-[400px] xl:w-[430px]",
        )}
      >
        {/* Modality tabs — underline style, one route per modality. */}
        <div className="flex shrink-0 items-center gap-5 border-b border-line px-4 pt-3 sm:px-5">
          {MODALITIES.map((m) => (
            <Link
              key={m.type}
              href={m.href}
              className={cn(
                "border-b-2 pb-2.5 text-body-sm font-semibold whitespace-nowrap transition-colors",
                m.type === type
                  ? "border-brand text-ink"
                  : "border-transparent text-muted hover:text-ink-soft",
              )}
            >
              {m.heroTitle}
            </Link>
          ))}
          <span
            title="Coming soon"
            className="cursor-not-allowed border-b-2 border-transparent pb-2.5 text-body-sm font-semibold whitespace-nowrap text-muted opacity-50"
          >
            Audio
          </span>
        </div>

        {/* A team member without creator access can still browse the team's
            work; they just can't add to it from here. Said once at the top of
            the composer rather than on each of the five submit buttons. */}
        {!canGenerate.allowed && canGenerate.reason && (
          <p className="mx-4 mt-3 flex gap-2 rounded-xl border border-warning/40 bg-warning/5 px-3.5 py-2.5 text-caption text-ink-soft sm:mx-5">
            <Lock className="mt-px size-3.5 shrink-0 text-warning" aria-hidden="true" />
            {canGenerate.reason}
          </p>
        )}

        {/* The form fills the rest of the panel and manages its own scroll
            area + pinned Generate footer — see the forms' root <form>. */}
        <div className={cn("min-h-0 flex-1", !canGenerate.allowed && "pointer-events-none opacity-50")}>
          {type === "text-to-video" && (
            <TextToVideoForm
              onCreated={handleCreated(true)}
              busy={busy}
              initialModel={initialModel}
              initialPrompt={initialPrompt}
              initialParams={initialParams}
              tierInfo={usageQuery.data?.tier_info}
            />
          )}
          {type === "text-to-image" && (
            <TextToImageForm
              onCreated={handleCreated(false)}
              busy={busy}
              initialModel={initialImageModel}
              initialPrompt={initialPrompt}
            />
          )}
        </div>
      </div>

      {/* Result side: quick links + credits up top, canvas below. */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href="/my-gallery"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-label text-muted transition-colors hover:border-border-strong hover:text-ink-soft"
          >
            <FolderOpen className="size-3.5" aria-hidden="true" />
            Creations
          </Link>
          {/* The other end of the dial from this composer — a locked recipe
              that only asks for one image. See /presets. (There used to be a
              "Prompt ideas" chip beside this one pointing at /prompts; that
              page is the same catalogue now, so it was one chip saying two
              things.) */}
          <Link
            href="/presets"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-label text-muted transition-colors hover:border-border-strong hover:text-ink-soft"
          >
            <Wand2 className="size-3.5" aria-hidden="true" />
            Viral presets
          </Link>
          {/* Same models, but the prompt is assembled from a brief and a
              style instead of written here. See /studio. */}
          <Link
            href="/studio"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-label text-muted transition-colors hover:border-border-strong hover:text-ink-soft"
          >
            <Megaphone className="size-3.5" aria-hidden="true" />
            Marketing studio
          </Link>

          {usageQuery.data && (
            <div className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-body-sm text-ink-soft">
              <Zap className="size-4 text-accent-amber" aria-hidden="true" />
              <span className="font-semibold text-accent-amber">
                {formatCredits(usageQuery.data.credit_balance)}
              </span>
              <span className="text-muted">credits remaining</span>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1">
          {hasJob ? (
            <div className="h-full min-h-[24rem] w-full">
              <JobStatusCard
                generation={generation}
                jobId={activeJobId}
                hasJob={hasJob}
                isVideo={activeIsVideo}
                onReset={handleReset}
              />
            </div>
          ) : (
            // The empty state is framed as a "canvas" — a large dashed,
            // brand-tinted card — rather than text floating in open space.
            // Same accent language as the composer's upload drop zones
            // (dashed border-brand, tinted icon ring), so "this is where
            // your creation will appear" reads consistently the very first
            // time someone lands here and every time after.
            <div
              {...spotlight}
              className="group relative flex h-full min-h-[24rem] flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-brand/15 bg-surface-2/20 p-10 text-center"
            >
              {/* Ambient drifting glow at rest — crossfades out for the
                  cursor spotlight below once hovered. Kept faint on
                  purpose: spread across a 34rem blob, lime stops reading
                  as a glow and turns the whole canvas olive. The tight
                  halo on the badge below is where the colour should
                  actually register. */}
              <div
                className="pointer-events-none absolute -top-24 left-1/2 size-[34rem] -translate-x-1/2 bg-brand opacity-[0.06] blur-3xl transition-opacity duration-300 animate-blob-float group-hover:opacity-0"
                aria-hidden="true"
              />
              {/* Cursor spotlight — see use-spotlight.ts. */}
              <div
                className="pointer-events-none absolute size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-[0.09]"
                style={{ left: "var(--spot-x, 50%)", top: "var(--spot-y, 0%)" }}
                aria-hidden="true"
              />

              <span className="relative mb-5 flex items-center justify-center">
                {/* Soft pulsing halo behind the badge — a small sign of life
                    on an otherwise static empty state. */}
                <span
                  className="absolute inset-0 -m-2 animate-pulse rounded-2xl bg-brand opacity-20 blur-lg"
                  aria-hidden="true"
                />
                <span className="relative flex size-16 items-center justify-center rounded-2xl bg-brand shadow-glow-md">
                  <Sparkles className="size-7 text-on-brand" aria-hidden="true" />
                </span>
              </span>
              <h2 className="relative text-heading font-bold text-ink">{active.heroTitle}</h2>
              <p className="relative mt-3 text-body text-muted">{active.heroSubtitle}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
