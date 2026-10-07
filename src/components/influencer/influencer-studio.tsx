"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Clapperboard,
  Film,
  Gift,
  ImagePlus,
  Info,
  RefreshCw,
  Trash2,
  UserPlus,
  Video,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { estimateCreditsForRequest } from "@/lib/credit-estimate";
import { measureMediaDuration, formatMediaDuration } from "@/lib/media-duration";
import { isDurationLocked, isResolutionLocked, minTierForDuration, minTierForResolution, upgradeHint } from "@/lib/tier-limits";
import { cropFullBodyPanel } from "@/lib/influencer-crop";
import {
  isActive,
  isCharacterSheet,
  OPEN_BY_DEFAULT,
  type Influencer,
  type InfluencerGeneration,
  type InfluencerOptions,
  type TraitPicks,
} from "@/lib/influencer";
import {
  useInfluencer,
  useInfluencerOptions,
  useInfluencers,
  useInvalidateInfluencers,
} from "@/hooks/use-influencers";
import { useGeneration } from "@/hooks/use-generation";
import { useInvalidateCredits, useUsage } from "@/hooks/use-credits";
import { useMe } from "@/hooks/use-me";
import { useCanGenerate, workspaceQuery } from "@/components/providers/workspace-provider";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { Spinner } from "@/components/ui/spinner";
import { Input, Textarea } from "@/components/ui/input";
import { PanelDropzone, CreditsSubmitPill, SegmentedTabs } from "@/components/generate/composer";
import { JobStatusCard } from "@/components/generate/job-status-card";
import { TraitSection } from "./trait-section";

type Mode = "create" | "motion";

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiFetch("/api/upload", { method: "POST", body: formData });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Upload failed.");
  return json.url as string;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
  return json as T;
}

/** One uploaded file: the local preview while it's in flight, the API's url
 *  once it lands. */
type Upload = { preview: string; url: string | null; uploading: boolean };

function useUploadSlot() {
  const { toast } = useToast();
  const [slot, setSlot] = useState<Upload | null>(null);
  async function pick(file: File) {
    const preview = URL.createObjectURL(file);
    setSlot({ preview, url: null, uploading: true });
    try {
      const url = await uploadFile(file);
      setSlot({ preview, url, uploading: false });
    } catch (err) {
      toast({ title: "Upload failed", description: (err as Error).message, variant: "error" });
      setSlot(null);
    }
  }
  return { slot, pick, clear: () => setSlot(null) };
}

/**
 * The AI influencer studio. Two modes over one canvas:
 *
 *   Create  pick traits, generate a portrait (Nano Banana Pro). The character
 *           is saved, so it can be reshot and animated later.
 *   Motion  pick a saved influencer and a reference clip; Kling Motion
 *           Control makes the influencer perform the clip's movement.
 *
 * The page never writes a prompt. It posts option ids and the API compiles
 * them (aiVideo-backend's lib/influencer-traits.ts), so the catalogue comes
 * from the API too.
 */
export function InfluencerStudio() {
  const optionsQuery = useInfluencerOptions();
  const [mode, setMode] = useState<Mode>("create");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<{ id: string; isVideo: boolean; influencerId?: string } | null>(null);
  const generation = useGeneration(activeJob?.id ?? null);
  const invalidateInfluencers = useInvalidateInfluencers();

  // The job card owns the progress of the portrait it streams, so the gallery
  // leaves that influencer's tile out until it lands — one loader, not two.
  const streamingInfluencerId = activeJob && !activeJob.isVideo ? activeJob.influencerId ?? null : null;
  const finished = generation.status === "completed" || generation.status === "failed";

  // The gallery only polls every few seconds; refetch the moment the stream
  // ends so the tile comes back together with the card's result.
  useEffect(() => {
    if (finished) invalidateInfluencers();
  }, [finished, invalidateInfluencers]);

  function animate(influencer: Influencer) {
    setSelectedId(influencer.id);
    setMode("motion");
  }

  if (optionsQuery.isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!optionsQuery.data) {
    return (
      <p className="rounded-2xl border border-line bg-surface-2 p-6 text-body-sm text-muted">
        Couldn&apos;t load the influencer builder. Refresh the page to try again.
      </p>
    );
  }
  const options = optionsQuery.data;

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100vh-8rem)] lg:min-h-[38rem] lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-floating lg:w-[400px] xl:w-[430px]">
        <div className="shrink-0 space-y-3 border-b border-border-subtle px-4 pt-4 pb-3 sm:px-5">
          <div>
            <p className="text-caption text-muted">Create your own virtual influencer</p>
            <h1 className="font-display text-subheading font-bold tracking-tight text-ink uppercase">AI Influencer</h1>
          </div>
          <div className="grid grid-cols-2 rounded-xl border border-line bg-surface-dark p-1">
            {(["create", "motion"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-lg py-2 text-label font-medium transition-colors",
                  mode === m ? "bg-surface-3 text-ink shadow-raised" : "text-muted hover:text-ink-soft",
                )}
              >
                {m === "create" ? "Create influencer" : "Motion"}
              </button>
            ))}
          </div>
        </div>

        {mode === "create" ? (
          <CreatePanel
            options={options}
            onQueued={(influencerId, jobId) => {
              setSelectedId(influencerId);
              setActiveJob({ id: jobId, isVideo: false, influencerId });
            }}
          />
        ) : (
          <MotionPanel
            options={options}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onCreateFirst={() => setMode("create")}
            onQueued={(jobId) => setActiveJob({ id: jobId, isVideo: true })}
          />
        )}
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-4 lg:overflow-y-auto">
        {activeJob && (
          <div className="h-[26rem] shrink-0">
            <JobStatusCard
              generation={generation}
              jobId={activeJob.id}
              hasJob
              isVideo={activeJob.isVideo}
              onReset={() => setActiveJob(null)}
            />
          </div>
        )}
        {mode === "create" ? (
          <InfluencerGallery
            selectedId={selectedId}
            streamingId={streamingInfluencerId}
            onSelect={setSelectedId}
            onAnimate={animate}
          />
        ) : (
          <MotionClips influencerId={selectedId} />
        )}
      </main>
    </div>
  );
}

// ── Create ──────────────────────────────────────────────────────────────

function CreatePanel({
  options,
  onQueued,
}: {
  options: InfluencerOptions;
  onQueued: (influencerId: string, jobId: string) => void;
}) {
  const { toast } = useToast();
  const { data: me } = useMe();
  const usageQuery = useUsage();
  const invalidateCredits = useInvalidateCredits();
  const invalidateInfluencers = useInvalidateInfluencers();
  const canGenerate = useCanGenerate(me?.organization);

  const [name, setName] = useState("");
  const [picks, setPicks] = useState<TraitPicks>({});
  const [details, setDetails] = useState("");
  const [aspectRatio, setAspectRatio] = useState(options.portrait.defaults.aspectRatio);
  const [open, setOpen] = useState<Set<string>>(() => new Set(OPEN_BY_DEFAULT));
  const face = useUploadSlot();
  const style = useUploadSlot();

  // Portraits always render at the API's one size (2K). The first one a user
  // ever makes is free; the API decides that again when it charges.
  const firstFree = Boolean(options.portrait.firstFree);
  const credits = firstFree
    ? 0
    : estimateCreditsForRequest({
        type: "text-to-image",
        model: options.portrait.model,
        imageSize: options.portrait.defaults.imageSize,
      });

  const mutation = useMutation({
    mutationFn: () =>
      postJson<{ job_id: string; influencer: Influencer }>(`/api/influencers${workspaceQuery()}`, {
        name: name.trim(),
        traits: picks,
        details: details.trim() || undefined,
        faceImage: face.slot?.url ?? undefined,
        styleImage: style.slot?.url ?? undefined,
        aspectRatio,
      }),
    onSuccess: (data) => {
      onQueued(data.influencer.id, data.job_id);
      invalidateCredits();
      invalidateInfluencers();
    },
    onError: (err: Error) => toast({ title: "Couldn't create influencer", description: err.message, variant: "error" }),
  });

  const uploading = Boolean(face.slot?.uploading || style.slot?.uploading);
  const incompleteReason = !name.trim() ? "Name your influencer." : uploading ? "Wait for the upload to finish." : undefined;
  const blockedReason = canGenerate.reason ?? undefined;
  const pickedTotal = Object.values(picks).reduce((n, v) => n + (Array.isArray(v) ? v.length : 1), 0);

  function toggleOpen(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (!incompleteReason && !blockedReason) mutation.mutate();
      }}
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
        <div className="space-y-1.5">
          <label htmlFor="influencer-name" className="text-label font-medium text-ink-soft">
            Name
          </label>
          <Input
            id="influencer-name"
            value={name}
            maxLength={60}
            placeholder="e.g. Nova"
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <PanelDropzone
            compact
            className="h-28"
            label="Your photo"
            sublabel="Optional face"
            previewUrl={face.slot?.preview}
            uploading={face.slot?.uploading}
            onFile={face.pick}
            onRemove={face.clear}
          />
          <PanelDropzone
            compact
            className="h-28"
            label="Style reference"
            sublabel="Outfit & vibe"
            previewUrl={style.slot?.preview}
            uploading={style.slot?.uploading}
            onFile={style.pick}
            onRemove={style.clear}
          />
        </div>
        {face.slot && (
          <p className="flex items-start gap-1.5 text-caption text-muted">
            <Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
            Only upload a face you have the right to use. Your influencer will be based on it.
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-label font-medium text-ink-soft">Traits</span>
          {pickedTotal > 0 && (
            <button type="button" onClick={() => setPicks({})} className="text-caption text-muted hover:text-ink-soft">
              Reset all ({pickedTotal})
            </button>
          )}
        </div>
        <div className="rounded-xl border border-line bg-surface px-3">
          {options.groups.map((group) => (
            <TraitSection
              key={group.id}
              group={group}
              picks={picks}
              open={open.has(group.id)}
              onToggleOpen={() => toggleOpen(group.id)}
              onChange={setPicks}
            />
          ))}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="influencer-details" className="text-label font-medium text-ink-soft">
            Extra details <span className="font-normal text-muted">(optional)</span>
          </label>
          <Textarea
            id="influencer-details"
            rows={3}
            value={details}
            maxLength={options.detailsMaxLength}
            placeholder="Anything the tiles don't cover: a signature pose, a mood, a colour palette…"
            onChange={(e) => setDetails(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <span className="text-caption text-muted">Shape</span>
          <SegmentedTabs value={aspectRatio} options={options.portrait.aspectRatios} onChange={setAspectRatio} />
        </div>
      </div>

      {/* The pill spells out why it is disabled itself, under the button. */}
      <div className="shrink-0 space-y-2 border-t border-border-subtle px-4 py-3 sm:px-5">
        {firstFree && (
          <p className="flex items-center justify-center gap-1.5 text-caption text-muted">
            <Gift className="size-3.5 text-brand" aria-hidden="true" />
            Your first influencer is on us.
          </p>
        )}
        <CreditsSubmitPill
          fullWidth
          credits={credits}
          loading={mutation.isPending}
          balance={usageQuery.data?.credit_balance}
          blockedReason={blockedReason}
          incompleteReason={incompleteReason}
        />
      </div>
    </form>
  );
}

// ── Motion ──────────────────────────────────────────────────────────────

const ORIENTATION_LABEL: Record<"video" | "image", string> = {
  video: "Match the video",
  image: "Match the photo",
};

function MotionPanel({
  options,
  selectedId,
  onSelect,
  onCreateFirst,
  onQueued,
}: {
  options: InfluencerOptions;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateFirst: () => void;
  onQueued: (jobId: string) => void;
}) {
  const { toast } = useToast();
  const { data: me } = useMe();
  const usageQuery = useUsage();
  const invalidateCredits = useInvalidateCredits();
  const invalidateInfluencers = useInvalidateInfluencers();
  const canGenerate = useCanGenerate(me?.organization);
  const influencersQuery = useInfluencers();

  const motion = options.motion;
  const [model, setModel] = useState(motion.models[0]?.id ?? "");
  const [resolution, setResolution] = useState(motion.resolutions[0] ?? "720p");
  const [orientation, setOrientation] = useState<"video" | "image">("video");
  const [background, setBackground] = useState<"video" | "image">("video");
  const [prompt, setPrompt] = useState("");
  const [video, setVideo] = useState<(Upload & { seconds?: number }) | null>(null);

  const ready = (influencersQuery.data ?? []).filter((i) => i.portrait?.status === "completed");
  const selected = ready.find((i) => i.id === selectedId) ?? null;
  const modelConfig = motion.models.find((m) => m.id === model);
  const maxSeconds = motion.maxSeconds[orientation];

  async function pickVideo(file: File) {
    const preview = URL.createObjectURL(file);
    const seconds = await measureMediaDuration(file);
    if (seconds !== undefined && seconds < motion.minSeconds - 0.05) {
      toast({ title: "Clip too short", description: `Use a clip of at least ${motion.minSeconds}s.`, variant: "error" });
      return;
    }
    if (seconds !== undefined && seconds > motion.maxSeconds.video + 0.05) {
      toast({ title: "Clip too long", description: `Trim it to ${motion.maxSeconds.video}s or less.`, variant: "error" });
      return;
    }
    setVideo({ preview, url: null, uploading: true, seconds });
    try {
      const url = await uploadFile(file);
      setVideo({ preview, url, uploading: false, seconds });
    } catch (err) {
      toast({ title: "Upload failed", description: (err as Error).message, variant: "error" });
      setVideo(null);
    }
  }

  // Priced the way the API bills it: the clip's own length, rounded up, or
  // the longest allowed when the browser couldn't measure it.
  const billedSeconds =
    video?.seconds !== undefined
      ? Math.min(maxSeconds, Math.max(motion.minSeconds, Math.ceil(video.seconds - 0.05)))
      : maxSeconds;
  const credits = estimateCreditsForRequest({
    type: "image-to-video",
    model,
    durationSeconds: billedSeconds,
    resolution,
    hasReferenceVideo: true,
  });

  const tierInfo = usageQuery.data?.tier_info;
  const blockedReason =
    canGenerate.reason ??
    (isResolutionLocked(resolution, tierInfo)
      ? upgradeHint(minTierForResolution(resolution), resolution)
      : video && isDurationLocked(billedSeconds, tierInfo)
        ? upgradeHint(minTierForDuration(billedSeconds), `${billedSeconds}s clips`)
        : undefined);
  const incompleteReason = !selected
    ? "Pick an influencer."
    : !video?.url
      ? video?.uploading
        ? "Wait for the upload to finish."
        : "Upload a reference video."
      : video.seconds !== undefined && video.seconds > maxSeconds + 0.05
        ? `"${ORIENTATION_LABEL.image}" takes clips up to ${maxSeconds}s. Trim it or switch to "${ORIENTATION_LABEL.video}".`
        : undefined;

  const mutation = useMutation({
    mutationFn: async () => {
      // Only the full-body half of a character sheet goes to Kling, which
      // would otherwise animate both copies of the person. Cut and uploaded
      // here, per run; it takes a moment and costs nothing.
      const portrait = selected!.portrait;
      const characterImage =
        isCharacterSheet(portrait) && portrait?.resultUrl
          ? await uploadFile(await cropFullBodyPanel(portrait.resultUrl))
          : undefined;
      return postJson<{ job_id: string }>(`/api/influencers/${selected!.id}/motion`, {
        model,
        video: video!.url,
        characterImage,
        resolution,
        orientation,
        background: modelConfig?.background ? background : undefined,
        prompt: prompt.trim() || undefined,
      });
    },
    onSuccess: (data) => {
      onQueued(data.job_id);
      invalidateCredits();
      invalidateInfluencers();
    },
    onError: (err: Error) => toast({ title: "Couldn't start motion", description: err.message, variant: "error" }),
  });

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (!incompleteReason && !blockedReason) mutation.mutate();
      }}
    >
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-5">
        <section className="space-y-2">
          <span className="text-label font-medium text-ink-soft">Influencer</span>
          {influencersQuery.isLoading ? (
            <Spinner size={16} />
          ) : ready.length === 0 ? (
            <button
              type="button"
              onClick={onCreateFirst}
              className="flex w-full items-center gap-3 rounded-xl border border-dashed border-line bg-surface p-4 text-left text-body-sm text-muted hover:border-border-strong hover:text-ink-soft"
            >
              <UserPlus className="size-5 shrink-0" aria-hidden="true" />
              Create an influencer first. Its portrait is what gets animated.
            </button>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {ready.map((influencer) => (
                <button
                  key={influencer.id}
                  type="button"
                  onClick={() => onSelect(influencer.id)}
                  aria-pressed={influencer.id === selected?.id}
                  className={cn(
                    "group overflow-hidden rounded-xl border bg-surface text-left transition-colors",
                    influencer.id === selected?.id ? "border-brand ring-1 ring-brand" : "border-line hover:border-border-strong",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={influencer.portrait!.resultUrl ?? ""}
                    alt={influencer.name}
                    // A character sheet's right half is the full-body shot,
                    // the part that gets animated.
                    className={cn(
                      "aspect-[3/4] w-full bg-white object-cover",
                      isCharacterSheet(influencer.portrait) && "object-right",
                    )}
                  />
                  <span className="block truncate px-1.5 py-1 text-[11px] font-medium text-ink-soft">{influencer.name}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-label font-medium text-ink-soft">Reference video</span>
            <span className="text-caption text-muted">
              {motion.minSeconds}-{maxSeconds}s, MP4 or MOV
            </span>
          </div>
          <PanelDropzone
            className="h-40"
            mediaKind="video"
            label="Upload a motion clip"
            sublabel="A dance, a walk, a gesture: your influencer copies it"
            previewUrl={video?.preview}
            uploading={video?.uploading}
            badge={video?.seconds !== undefined ? formatMediaDuration(video.seconds) : undefined}
            onFile={pickVideo}
            onRemove={() => setVideo(null)}
          />
        </section>

        <section className="space-y-3">
          <div className="space-y-1.5">
            <span className="text-caption text-muted">Model</span>
            <div className="grid grid-cols-1 gap-2">
              {motion.models.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModel(m.id)}
                  aria-pressed={m.id === model}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left transition-colors",
                    m.id === model ? "border-brand bg-brand/10" : "border-line bg-surface hover:border-border-strong",
                  )}
                >
                  <span className="block text-label font-medium text-ink">{m.label}</span>
                  <span className="block text-caption text-muted">{m.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1.5">
              <span className="text-caption text-muted">Resolution</span>
              <SegmentedTabs value={resolution} options={motion.resolutions} onChange={setResolution} />
            </div>
            <div className="space-y-1.5">
              <span className="text-caption text-muted">Facing</span>
              <SegmentedTabs
                value={orientation}
                options={motion.orientations}
                onChange={setOrientation}
                renderLabel={(v) => ORIENTATION_LABEL[v]}
              />
            </div>
          </div>

          {modelConfig?.background && (
            <div className="space-y-1.5">
              <span className="text-caption text-muted">Background</span>
              <SegmentedTabs
                value={background}
                options={["video", "image"] as const}
                onChange={setBackground}
                renderLabel={(v) => (v === "video" ? "From the clip" : "From the portrait")}
              />
            </div>
          )}
        </section>

        <div className="space-y-1.5">
          <label htmlFor="motion-prompt" className="text-label font-medium text-ink-soft">
            Prompt <span className="font-normal text-muted">(optional)</span>
          </label>
          <Textarea
            id="motion-prompt"
            rows={2}
            value={prompt}
            maxLength={motion.promptMaxLength}
            placeholder="e.g. smiling, natural daylight"
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <p className="flex items-start gap-1.5 text-caption text-muted">
          <Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          The result is as long as your clip, and that&apos;s what it costs
          {video?.seconds === undefined && video ? ` (we couldn't read its length, so it's priced at ${maxSeconds}s)` : ""}.
        </p>
      </div>

      {/* The pill spells out why it is disabled itself, under the button. */}
      <div className="shrink-0 border-t border-border-subtle px-4 py-3 sm:px-5">
        <CreditsSubmitPill
          fullWidth
          credits={credits}
          loading={mutation.isPending}
          balance={usageQuery.data?.credit_balance}
          blockedReason={blockedReason}
          incompleteReason={incompleteReason}
        />
      </div>
    </form>
  );
}

// ── Canvas ──────────────────────────────────────────────────────────────

function InfluencerGallery({
  selectedId,
  streamingId,
  onSelect,
  onAnimate,
}: {
  selectedId: string | null;
  /** Shown in the job card above while it renders; skipped here until done. */
  streamingId: string | null;
  onSelect: (id: string) => void;
  onAnimate: (influencer: Influencer) => void;
}) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const invalidateCredits = useInvalidateCredits();
  const invalidateInfluencers = useInvalidateInfluencers();
  const influencersQuery = useInfluencers();

  const reshoot = useMutation({
    mutationFn: (influencer: Influencer) =>
      postJson(`/api/influencers/${influencer.id}/portrait`, {
        aspectRatio: influencer.portrait?.parameters.aspectRatio,
      }),
    onSuccess: () => {
      invalidateCredits();
      invalidateInfluencers();
      toast({ title: "New portrait on the way", description: "Same influencer, a fresh shot." });
    },
    onError: (err: Error) => toast({ title: "Couldn't start a new portrait", description: err.message, variant: "error" }),
  });

  async function remove(influencer: Influencer) {
    const ok = await confirm({
      title: `Delete ${influencer.name}?`,
      description: "The influencer leaves this list. Its portraits and clips stay in your gallery.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    const res = await apiFetch(`/api/influencers/${influencer.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast({ title: "Couldn't delete", description: json.error ?? "Try again.", variant: "error" });
      return;
    }
    invalidateInfluencers();
  }

  const all = influencersQuery.data ?? [];
  const items = all.filter(
    (i) => !(i.id === streamingId && i.portrait && isActive(i.portrait.status)),
  );

  return (
    <section className="flex min-h-[20rem] flex-1 flex-col rounded-2xl border border-line bg-surface-2 p-4 shadow-card sm:p-5">
      <h2 className="mb-4 text-label font-medium text-ink-soft">Your influencers</h2>
      {influencersQuery.isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner />
        </div>
      ) : items.length === 0 && all.length > 0 ? (
        <p className="flex flex-1 items-center justify-center text-center text-body-sm text-muted">
          Your new influencer lands here as soon as it&apos;s ready.
        </p>
      ) : items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <ImagePlus className="size-8 text-text-tertiary" aria-hidden="true" />
          <p className="text-body-sm text-muted">Pick a few traits on the left and generate your first influencer.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {items.map((influencer) => {
            const portrait = influencer.portrait;
            const busy = portrait ? isActive(portrait.status) : false;
            const done = portrait?.status === "completed";
            return (
              <div
                key={influencer.id}
                className={cn(
                  "group overflow-hidden rounded-xl border bg-surface transition-colors",
                  influencer.id === selectedId ? "border-brand" : "border-line",
                )}
              >
                <button type="button" onClick={() => onSelect(influencer.id)} className="relative block w-full">
                  {done && portrait?.resultUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={portrait.resultUrl} alt={influencer.name} className="aspect-video w-full bg-white object-contain" />
                  ) : (
                    <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-surface-3">
                      {busy ? (
                        <>
                          <Spinner size={18} />
                          <span className="text-caption text-muted">{portrait?.progressPercent ?? 0}%</span>
                        </>
                      ) : (
                        <span className="px-3 text-center text-caption text-muted">
                          {portrait?.errorMessage ?? "No portrait yet"}
                        </span>
                      )}
                    </div>
                  )}
                </button>
                <div className="space-y-2 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-label font-medium text-ink">{influencer.name}</span>
                    {influencer.motionCount > 0 && (
                      <span className="flex items-center gap-1 text-caption text-muted">
                        <Film className="size-3" aria-hidden="true" />
                        {influencer.motionCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={!done}
                      onClick={() => onAnimate(influencer)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-2 py-1.5 text-caption font-semibold text-on-brand transition-colors hover:bg-brand-hover disabled:opacity-40"
                    >
                      <Clapperboard className="size-3.5" aria-hidden="true" />
                      Animate
                    </button>
                    <button
                      type="button"
                      disabled={busy || reshoot.isPending}
                      onClick={() => reshoot.mutate(influencer)}
                      title="New portrait of the same influencer"
                      aria-label="New portrait of the same influencer"
                      className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:border-border-strong hover:text-ink-soft disabled:opacity-40"
                    >
                      <RefreshCw className="size-3.5" aria-hidden="true" />
                    </button>
                    {/* Shown to everyone: in a team only the author may delete, and
                        the API says so in its error, which is clearer than a
                        button that silently isn't there. */}
                    <button
                      type="button"
                      onClick={() => remove(influencer)}
                      aria-label={`Delete ${influencer.name}`}
                      className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:border-accent hover:text-accent"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MotionClips({ influencerId }: { influencerId: string | null }) {
  const detail = useInfluencer(influencerId);
  const clips: InfluencerGeneration[] = (detail.data?.generations ?? []).filter((g) => g.type === "image-to-video");

  return (
    <section className="flex min-h-[20rem] flex-1 flex-col rounded-2xl border border-line bg-surface-2 p-4 shadow-card sm:p-5">
      <h2 className="mb-4 text-label font-medium text-ink-soft">
        {detail.data ? `${detail.data.name}'s motion clips` : "Motion clips"}
      </h2>
      {!influencerId ? (
        <EmptyClips text="Pick an influencer on the left to see its clips." />
      ) : detail.isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner />
        </div>
      ) : clips.length === 0 ? (
        <EmptyClips text="No clips yet. Upload a reference video and hit Generate." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {clips.map((clip) => (
            <div key={clip.id} className="overflow-hidden rounded-xl border border-line bg-surface">
              {clip.status === "completed" && clip.resultUrl ? (
                <video
                  src={clip.resultUrl}
                  className="aspect-[9/16] w-full bg-black object-cover"
                  controls
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
              ) : (
                <div className="flex aspect-[9/16] w-full flex-col items-center justify-center gap-2 bg-surface-3 px-3 text-center">
                  {isActive(clip.status) ? (
                    <>
                      <Spinner size={18} />
                      <span className="text-caption text-muted">{clip.progressPercent}%</span>
                    </>
                  ) : (
                    <span className="text-caption text-muted">{clip.errorMessage ?? "Failed"}</span>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between px-2.5 py-2 text-caption text-muted">
                <span>{String(clip.parameters.resolution ?? "")}</span>
                <span>{clip.parameters.duration ? `${String(clip.parameters.duration)}s` : ""}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyClips({ text }: { text: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
      <Video className="size-8 text-text-tertiary" aria-hidden="true" />
      <p className="text-body-sm text-muted">{text}</p>
    </div>
  );
}
