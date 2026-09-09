"use client";

import { useState, type RefObject } from "react";
import Link from "next/link";
import { Clock, ImagePlus, Monitor, Sparkles, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLazyVideo } from "@/hooks/use-lazy-video";
import {
  PRESET_CATEGORIES,
  presetCredits,
  presetDurationLabel,
  presetDurationSeconds,
  presetResolution,
  type PresetCategory,
  type Preset,
} from "@/lib/viral-presets";
import { usePresets } from "@/hooks/use-presets";
import { useMe } from "@/hooks/use-me";
import { Spinner } from "@/components/ui/spinner";

/** "All" is a UI-only filter value, not a category a preset can carry. */
type Filter = "All" | PresetCategory;
const FILTERS: Filter[] = ["All", ...PRESET_CATEGORIES];

/**
 * Where a card goes.
 *
 * The catalogue is public — it's what the marketing site puts on /prompts —
 * but running a recipe is not: the studio lives behind the app shell and
 * POST /api/generations/preset rejects an anonymous caller outright. So a
 * signed-out visitor is sent to log in with the studio as their return
 * trip, rather than into a page whose only move is to bounce them there.
 */
function presetHref(slug: string, isAuthed: boolean) {
  const studio = `/presets/${slug}`;
  return isAuthed ? studio : `/login?next=${encodeURIComponent(studio)}`;
}

function PresetPreview({
  url,
  containerRef,
  videoRef,
  hasLoadedOnce,
}: {
  url: string;
  containerRef: RefObject<HTMLDivElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  hasLoadedOnce: boolean;
}) {
  return (
    // 9:16 rather than the composer's landscape frame — presets are aimed at
    // social output, and a portrait tile also lets six of them sit on one
    // screen without scrolling.
    <div ref={containerRef} className="relative aspect-[3/4] w-full overflow-hidden bg-surface-3">
      {/* Gradient stands in for a poster frame (same approach as the landing
          showcase tiles) so nothing extra is fetched before the clip is. */}
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-surface-3 to-surface-2" />
      {hasLoadedOnce && (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          loop
          playsInline
          // "metadata" rather than "none": the tile now sits paused on its
          // first frame until hovered, and a browser told to preload nothing
          // has no frame to show — the card would be a grey box until pointed
          // at. Metadata is a few KB per clip, not the clip itself.
          preload="metadata"
        >
          <source src={url} type="video/mp4" />
        </video>
      )}
      <div
        className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/35 to-transparent"
        aria-hidden="true"
      />
    </div>
  );
}

function MetaChip({ icon: Icon, label }: { icon: typeof Clock; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-black/40 px-2 py-0.5 text-caption text-ink-soft backdrop-blur-sm">
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </span>
  );
}

function PresetCard({ preset, isAuthed }: { preset: Preset; isAuthed: boolean }) {
  // Duration and resolution now live in the model's own parameter blob
  // rather than as columns on the preset, since every model spells them
  // differently — hence the accessors instead of preset.duration.
  const resolution = presetResolution(preset.parameters);
  const credits = presetCredits(preset, {
    durationSeconds: presetDurationSeconds(preset.parameters),
    resolution,
  });

  // Hover handlers belong on the card, not on the clip: the badges, chips
  // and title are absolutely positioned *over* the preview, so a pointer
  // moving onto the tagline would count as leaving the video and stop it
  // mid-shot.
  const { containerRef, videoRef, hasLoadedOnce, hoverProps } = useLazyVideo({
    playOnHover: true,
  });

  return (
    <Link
      href={presetHref(preset.slug, isAuthed)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface-2 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-glow-sm"
      {...hoverProps}
    >
      <PresetPreview
        url={preset.previewUrl}
        containerRef={containerRef}
        videoRef={videoRef}
        hasLoadedOnce={hasLoadedOnce}
      />

      {preset.badge && (
        <span className="absolute top-3 left-3 rounded-full border border-brand/30 bg-brand/15 px-2.5 py-0.5 text-caption font-semibold text-brand backdrop-blur-sm">
          {preset.badge}
        </span>
      )}
      <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full border border-line bg-black/50 px-2.5 py-0.5 text-caption font-semibold text-accent-amber backdrop-blur-sm">
        <Sparkles className="size-3" aria-hidden="true" />
        {credits}
      </span>

      {/* Text sits over the bottom of the clip rather than in a panel under
          it — keeps every card the same height whatever the tagline runs to. */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className="mb-2 flex flex-wrap gap-1.5">
          <MetaChip icon={Clock} label={presetDurationLabel(preset.parameters)} />
          {resolution && <MetaChip icon={Monitor} label={resolution} />}
          {preset.requiresImage && <MetaChip icon={ImagePlus} label="1 photo" />}
          {/* Says up front that the upload is redrawn — the output is a
              character, not the photo animated, and that is a different
              product than the card would otherwise promise. */}
          {preset.styleModel && <MetaChip icon={Wand2} label="AI character" />}
        </div>
        <h3 className="font-display text-feature-title font-bold text-ink">{preset.title}</h3>
        <p className="mt-1 text-caption text-white/70">{preset.tagline}</p>
      </div>
    </Link>
  );
}

export function PresetsGallery() {
  const [filter, setFilter] = useState<Filter>("All");
  const { data: presets, isLoading, error } = usePresets();
  // A visitor on the marketing catalogue has no session; on /presets inside
  // the app this is already resolved by the shell, so it reads from cache
  // and no card ever flickers through its signed-out link. `isLoading`
  // rather than the error state gates the notice below, so a signed-in user
  // whose "me" is still in flight isn't told to log in.
  const { data: me, isLoading: meLoading } = useMe();
  const isAuthed = Boolean(me);

  const visible = (presets ?? []).filter((p) => filter === "All" || p.category === filter);

  return (
    <div className="space-y-6">
      {!meLoading && !isAuthed && (
        <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-body-sm text-muted">
          Browse the whole catalogue freely — running a preset needs an account.{" "}
          <Link href="/signup" className="text-brand underline-offset-4 hover:underline">
            Create one
          </Link>{" "}
          or{" "}
          <Link href="/login" className="text-brand underline-offset-4 hover:underline">
            log in
          </Link>
          , and you land straight back on the preset you picked.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-label font-medium transition-colors",
              f === filter
                ? "border-brand/40 bg-brand/15 text-brand"
                : "border-line bg-surface-2 text-muted hover:border-border-strong hover:text-ink-soft",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : error ? (
        <p className="py-16 text-center text-body-sm text-muted">
          Couldn&apos;t load the presets. Refresh to try again.
        </p>
      ) : visible.length === 0 ? (
        <p className="py-16 text-center text-body-sm text-muted">
          {presets?.length
            ? "No presets in this category yet."
            : "No presets published yet — check back soon."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((preset) => (
            <PresetCard key={preset.slug} preset={preset} isAuthed={isAuthed} />
          ))}
        </div>
      )}

      <p className="text-caption text-muted">
        Preview clips show the kind of shot each preset aims for — they are sample output, not the
        result of running that exact preset.
      </p>
    </div>
  );
}
