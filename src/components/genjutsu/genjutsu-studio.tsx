"use client";

import { createElement, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Clapperboard, ImagePlus, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { estimateCreditsForRequest } from "@/lib/credit-estimate";
import { formatMediaDuration } from "@/lib/media-duration";
import { isDurationLocked, isResolutionLocked, minTierForDuration, minTierForResolution, upgradeHint } from "@/lib/tier-limits";
import { uploadVideoToLibrary, type PickedVideo } from "@/lib/video-library";
import {
  GENJUTSU_KINDS,
  GENJUTSU_MAX_REFERENCES,
  GENJUTSU_MAX_SECONDS,
  GENJUTSU_MIN_SECONDS,
  GENJUTSU_MODEL_ID,
  GENJUTSU_MODES,
  GENJUTSU_NAME,
  GENJUTSU_NOTE_MAX,
  GENJUTSU_PROMPT_MAX,
  GENJUTSU_RESOLUTIONS,
  genjutsuKind,
  type GenjutsuMode,
  type GenjutsuReferenceKind,
} from "@/lib/genjutsu";
import { useGeneration } from "@/hooks/use-generation";
import { useInvalidateCredits, useUsage } from "@/hooks/use-credits";
import { useMe } from "@/hooks/use-me";
import { useCanGenerate, workspaceQuery } from "@/components/providers/workspace-provider";
import { useToast } from "@/components/ui/toast";
import { Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PanelDropzone, CreditsSubmitPill, SegmentedTabs } from "@/components/generate/composer";
import { JobStatusCard } from "@/components/generate/job-status-card";
import { VideoSourceField } from "@/components/video-library/video-source-field";

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiFetch("/api/upload", { method: "POST", body: formData });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Upload failed.");
  return json.url as string;
}

type Clip = { preview: string; url: string | null; uploading: boolean; seconds?: number };

type Reference = {
  key: number;
  kind: GenjutsuReferenceKind;
  note: string;
  preview: string | null;
  url: string | null;
  uploading: boolean;
};

let nextKey = 1;
const newReference = (kind: GenjutsuReferenceKind = "character"): Reference => ({
  key: nextKey++,
  kind,
  note: "",
  preview: null,
  url: null,
  uploading: false,
});

/**
 * Vixlens Genjutsu: a clip and reference images in, the clip recast out.
 * Object Swap changes only what the references name; Motion Transfer keeps
 * the clip's motion and camera and rebuilds the scene from them. The API
 * writes the instruction (aiVideo-backend's lib/genjutsu.ts); this page
 * only collects the clip, the references and an optional direction.
 */
export function GenjutsuStudio() {
  const { toast } = useToast();
  const { data: me } = useMe();
  const usageQuery = useUsage();
  const invalidateCredits = useInvalidateCredits();
  const canGenerate = useCanGenerate(me?.organization);

  const [mode, setMode] = useState<GenjutsuMode>("swap");
  const [clip, setClip] = useState<Clip | null>(null);
  const [references, setReferences] = useState<Reference[]>(() => [newReference()]);
  const [prompt, setPrompt] = useState("");
  const [resolution, setResolution] = useState<(typeof GENJUTSU_RESOLUTIONS)[number]>("720p");
  const [keepAudio, setKeepAudio] = useState(true);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [tab, setTab] = useState<"how" | "result">("how");
  const generation = useGeneration(activeJobId);
  const busy = generation.status === "queued" || generation.status === "processing";

  const updateReference = (key: number, patch: Partial<Reference>) =>
    setReferences((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  async function pickClip({ file, url: uploadedUrl, seconds }: PickedVideo) {
    const preview = URL.createObjectURL(file);
    // A clip from "My videos" is already uploaded and goes straight in.
    setClip({ preview, url: uploadedUrl ?? null, uploading: !uploadedUrl, seconds });
    if (uploadedUrl) return;
    try {
      const url = await uploadVideoToLibrary(file, { seconds });
      setClip({ preview, url, uploading: false, seconds });
    } catch (err) {
      toast({ title: "Upload failed", description: (err as Error).message, variant: "error" });
      setClip(null);
    }
  }

  async function pickReferenceImage(key: number, file: File) {
    const preview = URL.createObjectURL(file);
    updateReference(key, { preview, url: null, uploading: true });
    try {
      const url = await uploadImage(file);
      updateReference(key, { url, uploading: false });
    } catch (err) {
      toast({ title: "Upload failed", description: (err as Error).message, variant: "error" });
      updateReference(key, { preview: null, url: null, uploading: false });
    }
  }

  // Priced the way the API bills it: the clip's own length, rounded up, or
  // the longest allowed while it hasn't been measured.
  const billedSeconds =
    clip?.seconds !== undefined
      ? Math.min(GENJUTSU_MAX_SECONDS, Math.max(GENJUTSU_MIN_SECONDS, Math.ceil(clip.seconds - 0.05)))
      : GENJUTSU_MAX_SECONDS;
  const credits = estimateCreditsForRequest({
    type: "image-to-video",
    model: GENJUTSU_MODEL_ID,
    durationSeconds: billedSeconds,
    resolution,
    hasReferenceVideo: true,
    referenceVideoSeconds: billedSeconds,
  });

  const tierInfo = usageQuery.data?.tier_info;
  const blockedReason =
    canGenerate.reason ??
    (isResolutionLocked(resolution, tierInfo)
      ? upgradeHint(minTierForResolution(resolution), resolution)
      : clip && isDurationLocked(billedSeconds, tierInfo)
        ? upgradeHint(minTierForDuration(billedSeconds), `${billedSeconds}s clips`)
        : undefined);

  const ready = references.filter((r) => r.url);
  const incompleteReason = !clip?.url
    ? clip?.uploading
      ? "Wait for the clip to finish uploading."
      : "Upload a clip to recast."
    : references.some((r) => r.uploading)
      ? "Wait for the images to finish uploading."
      : ready.length === 0
        ? "Add at least one reference image."
        : undefined;

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/generations/genjutsu${workspaceQuery()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          video: clip!.url,
          // In the order shown: the API names them Image 1, Image 2...
          references: ready.map((r) => ({ image: r.url, kind: r.kind, note: r.note.trim() })),
          prompt: prompt.trim(),
          resolution,
          keepAudio,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      return json as { job_id: string };
    },
    onSuccess: (data) => {
      setActiveJobId(data.job_id);
      setTab("result");
      invalidateCredits();
    },
    onError: (err: Error) => toast({ title: "Couldn't start", description: err.message, variant: "error" }),
  });

  const reason = blockedReason ?? incompleteReason;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!reason) mutation.mutate();
      }}
      className="flex flex-col gap-4 lg:h-[calc(100vh-8rem)] lg:min-h-[38rem] lg:flex-row"
    >
      <div className="flex w-full shrink-0 flex-col gap-4 lg:w-[440px] xl:w-[470px]">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-floating">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
            <header className="space-y-1">
              <h1 className="flex items-center gap-2 font-display text-subheading font-bold text-ink">
                <Wand2 className="size-5 text-brand-ink" aria-hidden="true" />
                {GENJUTSU_NAME}
              </h1>
              <p className="text-caption text-muted">
                Recast any clip with your own characters, products, outfits and places — the motion
                and camera stay.
              </p>
            </header>

            <section className="space-y-1.5">
              <span className="text-label font-medium text-ink-soft">Mode</span>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Mode">
                {GENJUTSU_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={mode === m.id}
                    onClick={() => setMode(m.id)}
                    className={cn(
                      "flex flex-col gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors",
                      mode === m.id ? "border-brand-ink bg-brand/10" : "border-line bg-surface hover:border-border-strong",
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-label font-medium text-ink">
                      {createElement(m.icon, {
                        className: cn("size-4", mode === m.id ? "text-brand-ink" : "text-muted"),
                        "aria-hidden": true,
                      })}
                      {m.title}
                    </span>
                    <span className="text-caption leading-snug text-muted">{m.body}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-label font-medium text-ink-soft">Your clip</span>
                <span className="text-caption text-muted">
                  {GENJUTSU_MIN_SECONDS}-{GENJUTSU_MAX_SECONDS}s, MP4 or MOV
                </span>
              </div>
              <VideoSourceField
                className="h-40"
                label="Upload the clip to recast"
                sublabel="Or pick one you already uploaded"
                previewUrl={clip?.preview}
                uploading={clip?.uploading}
                badge={clip?.seconds !== undefined ? formatMediaDuration(clip.seconds) : undefined}
                minSeconds={GENJUTSU_MIN_SECONDS}
                maxSeconds={GENJUTSU_MAX_SECONDS}
                onPick={(picked) => void pickClip(picked)}
                onRemove={() => setClip(null)}
              />
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-label font-medium text-ink-soft">References</span>
                <span className="text-caption text-muted">
                  {references.length} / {GENJUTSU_MAX_REFERENCES}
                </span>
              </div>
              <p className="text-caption text-muted">
                {mode === "swap"
                  ? "One image per thing to change. Say what each one replaces in the clip."
                  : "Who performs the movement, and anything the new scene should show."}
              </p>
              <ol className="space-y-2">
                {references.map((ref, index) => (
                  <ReferenceRow
                    key={ref.key}
                    index={index}
                    reference={ref}
                    mode={mode}
                    canRemove={references.length > 1}
                    onFile={(file) => void pickReferenceImage(ref.key, file)}
                    onClearImage={() => updateReference(ref.key, { preview: null, url: null })}
                    onChange={(patch) => updateReference(ref.key, patch)}
                    onRemove={() => setReferences((prev) => prev.filter((r) => r.key !== ref.key))}
                  />
                ))}
              </ol>
              {references.length < GENJUTSU_MAX_REFERENCES && (
                <button
                  type="button"
                  onClick={() => setReferences((prev) => [...prev, newReference(prev.length ? "product" : "character")])}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2.5 text-caption font-medium text-muted transition-colors hover:border-border-strong hover:text-ink-soft"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Add a reference
                </button>
              )}
            </section>

            <section className="space-y-1.5">
              <label htmlFor="genjutsu-prompt" className="text-label font-medium text-ink-soft">
                Direction <span className="font-normal text-muted">(optional)</span>
              </label>
              <Textarea
                id="genjutsu-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={GENJUTSU_PROMPT_MAX}
                rows={3}
                placeholder={
                  mode === "swap"
                    ? "Anything else to change, e.g. make it golden hour"
                    : "Describe the new scene, e.g. a neon-lit street at night"
                }
              />
            </section>

            <section className="flex flex-wrap items-end justify-between gap-3">
              <div className="space-y-1.5">
                <span className="text-caption text-muted">Resolution</span>
                <SegmentedTabs value={resolution} options={GENJUTSU_RESOLUTIONS} onChange={setResolution} />
              </div>
              <label className="flex items-center gap-2 pb-1 text-caption text-ink-soft">
                <Switch checked={keepAudio} onCheckedChange={setKeepAudio} />
                Keep the clip&apos;s sound
              </label>
            </section>
          </div>
        </div>

        <div className="shrink-0 space-y-2">
          <CreditsSubmitPill
            fullWidth
            hideTooltip
            credits={credits}
            loading={mutation.isPending || busy}
            balance={usageQuery.data?.credit_balance}
            blockedReason={blockedReason}
            incompleteReason={incompleteReason}
            className="rounded-full py-4 text-body-sm"
          />
          {reason && <p className="text-center text-caption text-muted">{reason}</p>}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="flex min-h-0 flex-1 flex-col gap-4">
          <TabsList className="shrink-0 border-b-0">
            <TabsTrigger value="how">How it works</TabsTrigger>
            <TabsTrigger value="result">Result</TabsTrigger>
          </TabsList>
          <TabsContent value="how" className="min-h-0 flex-1 focus:outline-none">
            <HowItWorks mode={mode} />
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

function ReferenceRow({
  index,
  reference,
  mode,
  canRemove,
  onFile,
  onClearImage,
  onChange,
  onRemove,
}: {
  index: number;
  reference: Reference;
  mode: GenjutsuMode;
  canRemove: boolean;
  onFile: (file: File) => void;
  onClearImage: () => void;
  onChange: (patch: Partial<Reference>) => void;
  onRemove: () => void;
}) {
  const kind = genjutsuKind(reference.kind);
  return (
    <li className="flex gap-3 rounded-xl border border-line bg-surface p-2.5">
      <PanelDropzone
        compact
        className="h-24 w-24 shrink-0 px-1"
        label={`Image ${index + 1}`}
        previewUrl={reference.preview}
        uploading={reference.uploading}
        onFile={onFile}
        onRemove={onClearImage}
      />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={`What image ${index + 1} is`}>
            {GENJUTSU_KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                role="radio"
                aria-checked={reference.kind === k.id}
                onClick={() => onChange({ kind: k.id })}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                  reference.kind === k.id
                    ? "border-brand-ink bg-brand/15 text-brand-ink"
                    : "border-line text-muted hover:border-border-strong hover:text-ink-soft",
                )}
              >
                {createElement(k.icon, { className: "size-3", "aria-hidden": true })}
                {k.label}
              </button>
            ))}
          </div>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove image ${index + 1}`}
              className="shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-white/[0.06] hover:text-ink"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
        <Input
          value={reference.note}
          maxLength={GENJUTSU_NOTE_MAX}
          onChange={(e) => onChange({ note: e.target.value })}
          placeholder={kind.placeholder[mode]}
          aria-label={`Image ${index + 1}: what it ${mode === "swap" ? "replaces" : "is"}`}
          className="h-9 text-caption"
        />
      </div>
    </li>
  );
}

const STEPS: Record<GenjutsuMode, { icon: typeof Clapperboard; title: string; body: string }[]> = {
  swap: [
    { icon: Clapperboard, title: "Upload a clip", body: "Any 3-15s video: a trend, an ad, a scene you filmed. Trim it to the moment you want." },
    { icon: ImagePlus, title: "Add what changes", body: "One image per change — a person, a product, an outfit, a place — and say what each replaces." },
    { icon: Sparkles, title: "Generate", body: "Only what you named changes. The motion, camera, timing and sound stay as filmed." },
  ],
  motion: [
    { icon: Clapperboard, title: "Upload a clip", body: "The movement to copy: a dance, a walk, a camera move. Trim it to the moment you want." },
    { icon: ImagePlus, title: "Add your references", body: "Who performs it, what they wear, where it happens. Describe anything else in the direction." },
    { icon: Sparkles, title: "Generate", body: "A new scene built from your references, moving exactly like the clip." },
  ],
};

function HowItWorks({ mode }: { mode: GenjutsuMode }) {
  return (
    <div className="flex h-full min-h-[24rem] flex-col items-center justify-center gap-6 rounded-2xl border border-line bg-surface-2 p-6 shadow-card">
      <div className="text-center">
        <p className="text-caption font-semibold tracking-[0.12em] text-brand-ink uppercase">{GENJUTSU_NAME}</p>
        <h2 className="mt-1 font-display text-subheading font-bold text-ink">
          {mode === "swap" ? "Object Swap" : "Motion Transfer"}
        </h2>
      </div>
      <ol className="grid w-full max-w-3xl gap-3 sm:grid-cols-3">
        {STEPS[mode].map((step, i) => (
          <li key={step.title} className="space-y-2 rounded-xl border border-line bg-surface p-4">
            <span className="flex items-center gap-2 text-label font-medium text-ink">
              <span className="flex size-6 items-center justify-center rounded-full bg-brand/15 text-caption font-bold text-brand-ink">
                {i + 1}
              </span>
              {step.title}
            </span>
            <p className="text-caption leading-relaxed text-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
