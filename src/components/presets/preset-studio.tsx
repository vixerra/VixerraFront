"use client";

import { workspaceQuery } from "@/components/providers/workspace-provider";
import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Info, Pencil, Sparkles, Wand2 } from "lucide-react";
import {
  PickPresetMark,
  UploadImageMark,
  DownloadResultMark,
} from "@/components/presets/step-icons";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PanelDropzone, CreditsSubmitPill } from "@/components/generate/composer";
import { JobStatusCard } from "@/components/generate/job-status-card";
import { useGeneration } from "@/hooks/use-generation";
import { useInvalidateCredits, useUsage } from "@/hooks/use-credits";
import { useLazyVideo } from "@/hooks/use-lazy-video";
import {
  presetCredits,
  resolvePresetSettings,
  type Preset,
} from "@/lib/viral-presets";

/**
 * The one-image preset runner: a locked recipe on the left with a single
 * upload slot and a Generate button, the result canvas on the right.
 *
 * Everything the /generate composer exposes as a control — prompt, duration,
 * resolution, camera, audio — is fixed by the preset here and deliberately
 * not editable. Someone who wants to change any of it belongs in the full
 * composer, not in a second half-composer bolted onto this page.
 */
export function PresetStudio({ preset }: { preset: Preset }) {
  const { toast } = useToast();
  const invalidateCredits = useInvalidateCredits();
  const usageQuery = useUsage();

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const generation = useGeneration(activeJobId);
  // Opens on the walkthrough rather than an empty result canvas — until a
  // generation is running there is nothing to look at on the Result tab, and
  // the three steps are what a first-time visitor actually needs. Submitting
  // flips it over (see the mutation below), so the switch is never manual.
  const [tab, setTab] = useState<"how" | "result">("how");

  // The preset's settings, stepped down to whatever the current plan can
  // actually submit — see resolvePresetSettings for why this isn't silent.
  // The server re-runs the same step-down for real (fitPresetToPlan); this
  // is here so the price and the notes are right BEFORE anyone clicks.
  const settings = resolvePresetSettings(preset, usageQuery.data?.tier_info);
  // Both stages, when the recipe has two — the server bills for both.
  const credits = presetCredits(preset, settings);

  const busy = generation.status === "queued" || generation.status === "processing";

  async function handleFile(file: File) {
    setUploading(true);
    setPreview(URL.createObjectURL(file));
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed.");
      setImageUrl(json.url);
    } catch (err) {
      toast({ title: "Upload failed", description: (err as Error).message, variant: "error" });
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  function clearImage() {
    setPreview(null);
    setImageUrl(null);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      // Slug and image, nothing else. The recipe, the model and every
      // parameter come from the "Preset" row on the server — see the
      // /generations/preset handler. While this posted a composed prompt to
      // /text-to-video, the "locked" recipe was locked only by this UI
      // declining to show it.
      const res = await apiFetch(`/api/generations/preset${workspaceQuery()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: preset.slug, image: imageUrl }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      return json;
    },
    onSuccess: (data) => {
      setActiveJobId(data.id);
      setTab("result");
      invalidateCredits();
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't start generation", description: err.message, variant: "error" });
    },
  });

  const blockedReason = settings.blockedReason ?? (imageUrl ? undefined : "Upload an image first.");

  return (
    // Same studio frame as /generate (see generate-workspace.tsx) — the 8rem
    // is the app header plus <main>'s vertical padding.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!blockedReason) mutation.mutate();
      }}
      // min-h floor matters now that nothing inside scrolls: on a short
      // viewport, claiming exactly the visible height would squeeze the
      // upload card until its hint got clipped with no way to reach it.
      // Below 38rem the studio keeps its height and the PAGE scrolls
      // instead, which is the right thing to give up first.
      className="flex flex-col gap-4 lg:h-[calc(100vh-8rem)] lg:min-h-[38rem] lg:flex-row"
    >
      <div className="flex w-full shrink-0 flex-col gap-4 lg:w-[400px] xl:w-[430px]">
        <PresetHeaderCard preset={preset} />

        {/* Nothing here scrolls. The dropzone is the only flexible element —
            everything around it is shrink-0 — so it absorbs whatever height
            the column has left and the panel always fits exactly. Its floor
            (min-h-52) is what the panel is guaranteed even at the studio's
            minimum height — raise one without the other and a scrollbar
            comes back on short viewports. overflow-hidden
            stays as a guard so nothing can ever spill onto the Generate
            button below, the way it did before. */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-floating">
          <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-4 sm:px-5 sm:pt-5">
            <span className="text-label font-medium text-ink-soft">Your image</span>
            <span className="text-caption text-muted">Required</span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 sm:p-5">
            <PanelDropzone
              className="min-h-52 flex-1"
              label="Upload image"
              sublabel="Select a PNG or JPG from your device"
              previewUrl={preview}
              uploading={uploading}
              onFile={handleFile}
              onRemove={clearImage}
              previewMode="showcase"
            />

            {/* The character the video is actually being built from. Only
                exists once the first stage finishes, which is also the
                point the run stops looking like it has stalled. */}
            {generation.stagedImageUrl && (
              <div className="shrink-0 space-y-1.5">
                <p className="text-caption text-muted">Your character</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={generation.stagedImageUrl}
                  alt="The character generated from your photo"
                  className="h-28 w-auto rounded-lg border border-line object-cover"
                />
              </div>
            )}

            {preset.styleModel && (
              <p className="flex shrink-0 items-start gap-1.5 text-caption text-muted">
                <Wand2 className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                Your photo is redrawn as a character first, then animated — the result is a
                character based on it, not the photo itself.
              </p>
            )}

            {settings.notes.map((note) => (
              <p key={note} className="flex shrink-0 items-start gap-1.5 text-caption text-warning">
                <Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                {note}
              </p>
            ))}
          </div>
        </div>

        <div className="shrink-0 space-y-2">
          {/* Full-round and taller than the composer's footer button. This is
              the only action on the screen, so it gets to look like it —
              className lands last in cn(), so these override the shared
              rounded-xl/px-4 py-3 without needing another prop. */}
          <CreditsSubmitPill
            fullWidth
            hideTooltip
            credits={credits}
            loading={mutation.isPending || busy || uploading}
            balance={usageQuery.data?.credit_balance}
            blockedReason={blockedReason}
            className="rounded-full py-4 text-body-sm"
          />
          {/* The tooltip was the only place blockedReason appeared, so with
              it gone the reason the button is dead has to be stated here —
              otherwise a greyed-out Generate has no explanation at all. */}
          {blockedReason && (
            <p className="text-center text-caption text-muted">{blockedReason}</p>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as typeof tab)}
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <TabsList className="shrink-0 border-b-0">
            <TabsTrigger value="how">How it works</TabsTrigger>
            <TabsTrigger value="result">Result</TabsTrigger>
          </TabsList>

          <TabsContent value="how" className="min-h-0 flex-1 focus:outline-none">
            <HowItWorks />
          </TabsContent>

          <TabsContent value="result" className="min-h-0 flex-1 focus:outline-none">
            <div className="h-full min-h-[24rem]">
              <JobStatusCard
                generation={generation}
                jobId={activeJobId}
                hasJob={Boolean(activeJobId)}
                isVideo
                onReset={() => setActiveJobId(null)}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </form>
  );
}

/** The preset itself, as a looping thumbnail with its name over it — the
 * "you picked this one" anchor, plus the way back to the gallery. */
function PresetHeaderCard({ preset }: { preset: Preset }) {
  const { containerRef, videoRef, hasLoadedOnce } = useLazyVideo();

  return (
    <div
      ref={containerRef}
      className="relative aspect-[21/9] w-full shrink-0 overflow-hidden rounded-2xl border border-line bg-surface-3 shadow-floating"
    >
      {hasLoadedOnce && (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          loop
          playsInline
          preload="none"
        >
          <source src={preset.previewUrl} type="video/mp4" />
        </video>
      )}
      {/* Flat scrim rather than a bottom-weighted gradient: the name sits in
          the middle of the frame now, so the whole clip has to be knocked
          back evenly for lime-on-video to stay legible. */}
      <div className="absolute inset-0 bg-black/45" aria-hidden="true" />

      <Link
        href="/presets"
        className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-line bg-black/60 px-3 py-1.5 text-caption font-semibold text-ink backdrop-blur-sm transition-colors hover:border-border-strong hover:bg-black/80"
      >
        <Pencil className="size-3.5" aria-hidden="true" />
        Change
      </Link>

      {/* The preset's name IS the branding here — centred, brand-coloured and
          set in the display face, the way the gallery's own hero cards read.
          drop-shadow does the heavy lifting over a moving clip: lime on a
          bright frame would otherwise disappear for whole seconds at a time. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
        <h1 className="font-display text-heading font-bold tracking-tight text-brand uppercase [text-shadow:0_2px_18px_rgb(0_0_0/0.75)]">
          {preset.title}
        </h1>
        <p className="mt-2 max-w-[28ch] text-caption text-white/75 [text-shadow:0_1px_10px_rgb(0_0_0/0.8)]">
          {preset.tagline}
        </p>
      </div>
    </div>
  );
}

const STEPS = [
  {
    Mark: PickPresetMark,
    title: "Pick a preset",
    body: "Every preset is a finished recipe — the prompt, the camera move, the length and the audio are already written. You never have to describe anything.",
  },
  {
    Mark: UploadImageMark,
    title: "Upload one image",
    body: "Drop in a JPG, PNG or WEBP. That photo becomes the reference the whole clip is built from, so your subject stays your subject.",
  },
  {
    Mark: DownloadResultMark,
    title: "Generate and download",
    body: "One tap, usually under a minute. Download the result straight from the canvas — it's also saved to your gallery.",
  },
];

/** Three-card walkthrough with arrows and dots, matching the reference
 * layout. Local index rather than a routed/parameterised carousel: nothing
 * else on the page cares which step is on screen. */
function HowItWorks() {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const Mark = step.Mark;

  return (
    <div className="flex h-full min-h-[24rem] flex-col items-center justify-center gap-6 rounded-2xl border border-line bg-surface-2 p-6 text-center shadow-card">
      <div className="flex max-w-md flex-col items-center gap-4">
        {/* Keyed on the step so switching slides remounts the mark and its
            animation restarts from frame one — otherwise the next step's
            drawing picks up mid-cycle and the first thing you see is the
            tail of a loop rather than the step being acted out. */}
        <Mark key={step.title} className="h-24" />
        <h2 className="font-display text-subheading font-bold text-ink">{step.title}</h2>
        <p className="text-body text-muted">{step.body}</p>
      </div>

      <div className="flex items-center gap-4">
        <CarouselArrow
          direction="prev"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        />
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Step ${i + 1}: ${s.title}`}
              aria-current={i === index}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === index ? "w-6 bg-brand" : "w-1.5 bg-white/20 hover:bg-white/40",
              )}
            />
          ))}
        </div>
        <CarouselArrow
          direction="next"
          disabled={index === STEPS.length - 1}
          onClick={() => setIndex((i) => Math.min(STEPS.length - 1, i + 1))}
        />
      </div>

      <p className="flex items-center gap-1.5 text-caption text-muted">
        <Sparkles className="size-3" aria-hidden="true" />
        Want to change the prompt or settings?{" "}
        <Link href="/generate" className="text-brand underline-offset-4 hover:underline">
          Open the full composer
        </Link>
      </p>
    </div>
  );
}

function CarouselArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Previous step" : "Next step"}
      className="flex size-9 items-center justify-center rounded-full border border-line bg-surface-3 text-muted transition-colors hover:border-border-strong hover:text-ink-soft disabled:pointer-events-none disabled:opacity-30"
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}
