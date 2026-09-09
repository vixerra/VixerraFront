"use client";

import { workspaceQuery } from "@/components/providers/workspace-provider";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useInvalidateCredits, useUsage } from "@/hooks/use-credits";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftRight, FileType, Monitor, RectangleHorizontal } from "lucide-react";
import { FieldError, Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tooltip } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { estimateVideoCredits } from "@/lib/credit-estimate";
import { measureMediaDuration, formatMediaDuration } from "@/lib/media-duration";
import { seedanceVideoSchema, type SeedanceVideoInput } from "@/lib/validation";
import { apiFetch } from "@/lib/api-client";
import {
  modelLockReason,
  isResolutionLocked,
  isDurationLocked,
  bestAllowedResolution,
  minTierForResolution,
  minTierForDuration,
  upgradeHint,
} from "@/lib/tier-limits";
import {
  PROMPT_MAX_LENGTH,
  SEEDANCE_MODEL_ID,
  SEEDANCE_DURATION_MIN,
  SEEDANCE_DURATION_MAX,
  SEEDANCE_DURATION_AUTO,
  SEEDANCE_RESOLUTIONS,
  SEEDANCE_ASPECT_RATIOS,
  SEEDANCE_OUTPUT_FORMATS,
  SEEDANCE_REFERENCE_IMAGES_MAX,
  SEEDANCE_REFERENCE_VIDEOS_MAX,
  SEEDANCE_REFERENCE_AUDIOS_MAX,
  SEEDANCE_REFERENCE_MEDIA_MAX_SECONDS,
  type VideoModelId,
  type TierInfo,
} from "@/lib/constants";
import {
  PanelSection,
  SegmentedTabs,
  PanelPromptField,
  PanelFieldList,
  PanelDropzone,
  ProviderModelPicker,
  PillSelect,
  FieldRow,
  CreditsSubmitPill,
  type PickerModel,
  type ReferenceMode,
} from "./composer";

/** One attached reference: the uploaded URL the form submits, the blob: URL
 * the tile renders, and — for the two timed lists — how long it runs, so the
 * 30s budget can be spent without re-reading the file. */
type Attachment = { url: string; preview: string; seconds?: number };

/** The three multimodal lists differ only in what they accept and how many of
 * it. Keeping them as one shape means the add/remove/budget logic is written
 * once instead of three times, with three chances to diverge. */
const REFERENCE_LISTS = {
  referenceImages: { max: SEEDANCE_REFERENCE_IMAGES_MAX, timed: false },
  referenceVideos: { max: SEEDANCE_REFERENCE_VIDEOS_MAX, timed: true },
  referenceAudios: { max: SEEDANCE_REFERENCE_AUDIOS_MAX, timed: true },
} as const;

type ReferenceListKey = keyof typeof REFERENCE_LISTS;

/** Unmeasurable files count as 0 — see handleListFile for why that is the
 *  right way for this budget to fail. */
function totalSeconds(items: Attachment[]): number {
  return items.reduce((sum, item) => sum + (item.seconds ?? 0), 0);
}

export function SeedanceVideoForm({
  models,
  model,
  onModelChange,
  initialPrompt,
  onPromptChange,
  onCreated,
  busy,
  tierInfo,
}: {
  models: readonly PickerModel<VideoModelId>[];
  model: VideoModelId;
  onModelChange: (id: VideoModelId) => void;
  initialPrompt: string;
  onPromptChange: (value: string) => void;
  onCreated: (jobId: string) => void;
  busy: boolean;
  /** Current plan's limits — undefined while still loading. Gates
   * resolution and duration controls client-side so a locked pick is
   * discoverable before hitting the server's 403 (see aiVideo-backend's
   * generations.ts, the actual source of truth for these limits). */
  tierInfo?: TierInfo;
}) {
  const { toast } = useToast();
  const invalidateCredits = useInvalidateCredits();
  // Cache read on the same ["usage"] key the workspace already fetched.
  const creditBalance = useUsage().data?.credit_balance;
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadingEndFrame, setUploadingEndFrame] = useState(false);
  const [endFramePreview, setEndFramePreview] = useState<string | null>(null);
  const [refMode, setRefMode] = useState<ReferenceMode>("reference");
  // The three multimodal lists. Growable rather than fixed slots, for the same
  // reason 2.0's characters are: the form only ever holds what was actually
  // uploaded, so each array stays dense and removing the middle one doesn't
  // leave a hole the provider would have to interpret. Each blob: preview is
  // kept beside its URL so a tile renders the picked file itself instead of
  // re-fetching the upload it was just made from.
  const [attachments, setAttachments] = useState<Record<ReferenceListKey, Attachment[]>>({
    referenceImages: [],
    referenceVideos: [],
    referenceAudios: [],
  });
  const [uploadingList, setUploadingList] = useState<ReferenceListKey | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SeedanceVideoInput>({
    resolver: zodResolver(seedanceVideoSchema) as Resolver<SeedanceVideoInput>,
    defaultValues: {
      prompt: initialPrompt,
      duration: 5,
      resolution: "720p",
      aspectRatio: "adaptive",
      generateAudio: true,
      watermark: false,
      // Pinned on and no longer offered as a switch: it routes character
      // references through ByteDance's trusted avatar library instead of its
      // face/deepfake detector, so it only ever unblocks a generation.
      useVirtualAvatar: true,
      outputFormat: "mp4",
    },
  });

  const duration = watch("duration");
  const resolution = watch("resolution");
  const aspectRatio = watch("aspectRatio");
  const outputFormat = watch("outputFormat");
  const image = watch("image");
  const isAuto = duration === SEEDANCE_DURATION_AUTO;
  const hasReferenceVideos = attachments.referenceVideos.length > 0;
  const hasReferenceAudios = attachments.referenceAudios.length > 0;
  const hasTimedReference = hasReferenceVideos || hasReferenceAudios;
  // Reference-video mode bills off the provider's higher per-second table, and
  // an auto-duration clip with any timed reference is quoted at the 30s
  // ceiling — the quote has to know about both, or the pill under-prices the
  // very request the server is about to charge for. See credit-estimate.ts.
  const estimatedCredits = estimateVideoCredits(SEEDANCE_MODEL_ID, duration, resolution, {
    hasReferenceVideo: hasReferenceVideos,
    hasReferenceAudio: hasReferenceAudios,
  });

  // "Auto" duration lands around ~8s (see LIVE_VIDEO_AUTO_DURATION_ESTIMATE in
  // credit-estimate.ts) — or the whole reference ceiling once a timed
  // reference is attached, since the output then tracks the input's length.
  const autoSeconds = hasTimedReference ? SEEDANCE_REFERENCE_MEDIA_MAX_SECONDS : 8;
  const autoLocked = isDurationLocked(autoSeconds, tierInfo);
  const durationCap = tierInfo ? Math.min(SEEDANCE_DURATION_MAX, tierInfo.maxDurationSeconds) : SEEDANCE_DURATION_MAX;
  const durationCapped = durationCap < SEEDANCE_DURATION_MAX;

  // The form defaults to 720p, which the free plan (480p) cannot submit — so
  // it used to open showing a locked value as the current pick and only said
  // so via a 403 after pressing Generate. tierInfo lands async, after
  // react-hook-form has taken its defaults, so this corrects it here.
  useEffect(() => {
    if (!tierInfo || !isResolutionLocked(resolution, tierInfo)) return;
    const allowed = bestAllowedResolution(SEEDANCE_RESOLUTIONS, tierInfo);
    if (allowed) setValue("resolution", allowed as typeof resolution, { shouldValidate: true });
  }, [tierInfo, resolution, setValue]);

  // Attaching a timed reference re-prices Auto at the reference ceiling, which
  // can put it over the plan's cap while it is already selected: the switch
  // below goes disabled, but the -1 it set would still be submitted and 403.
  // Fall back to a real duration instead of leaving a dead value in the form.
  useEffect(() => {
    if (isAuto && autoLocked) setValue("duration", 5, { shouldValidate: true });
  }, [isAuto, autoLocked, setValue]);

  const hasAnyReferenceList =
    attachments.referenceImages.length > 0 || hasReferenceVideos || hasReferenceAudios;

  // Every Seedance 2.5 resolution is reachable on some plan, so a pick still
  // locked here means the clamp above had nothing to fall back to.
  const blockedReason = isResolutionLocked(resolution, tierInfo)
    ? upgradeHint(minTierForResolution(resolution), resolution)
    : // 1080p leaves Cloudflare for kie.ai, whose Seedance 2.5 task takes a
      // first frame and nothing else. The schema refuses the pairing, so say
      // why on the button rather than letting Generate surface a field error
      // on a control that may be scrolled out of view.
      resolution === "1080p" && hasAnyReferenceList
      ? "1080p can't carry reference images, videos or audio — switch to 720p."
      : undefined;

  /** Shared by every upload slot this form owns — first frame, last frame and
   * the three reference lists. Throws so each caller can undo its own
   * optimistic preview. */
  async function uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiFetch("/api/upload", { method: "POST", body: formData });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Upload failed.");
    return json.url as string;
  }

  function reportUploadFailure(err: unknown) {
    toast({ title: "Upload failed", description: (err as Error).message, variant: "error" });
  }

  async function handleFile(file: File) {
    setUploading(true);
    setPreview(URL.createObjectURL(file));
    try {
      setValue("image", await uploadFile(file), { shouldValidate: true });
    } catch (err) {
      reportUploadFailure(err);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleEndFrameFile(file: File) {
    setUploadingEndFrame(true);
    setEndFramePreview(URL.createObjectURL(file));
    try {
      setValue("lastFrameImage", await uploadFile(file), { shouldValidate: true });
    } catch (err) {
      reportUploadFailure(err);
      setEndFramePreview(null);
    } finally {
      setUploadingEndFrame(false);
    }
  }

  function commitList(key: ReferenceListKey, next: Attachment[]) {
    setAttachments((prev) => ({ ...prev, [key]: next }));
    // Undefined rather than [] once the last one goes: the schema treats the
    // field as absent, where an empty array would still reach the provider.
    setValue(key, next.length ? next.map((item) => item.url) : undefined, {
      shouldValidate: true,
    });
  }

  async function handleListFile(key: ReferenceListKey, file: File) {
    const { max, timed } = REFERENCE_LISTS[key];
    const current = attachments[key];
    if (current.length >= max) return;

    // Measured before the upload rather than after: a clip that would blow the
    // 30s budget should never reach the bucket at all, and the check needs a
    // number the API has no way to produce (no video toolchain — see
    // aiVideo-backend/AGENTS.md). A file we fail to measure counts as 0 and
    // travels on, leaving the ceiling to the provider — refusing what we
    // merely could not measure would be the worse failure.
    let seconds: number | undefined;
    if (timed) {
      seconds = await measureMediaDuration(file);
      const total = totalSeconds(current) + (seconds ?? 0);
      if (seconds !== undefined && total > SEEDANCE_REFERENCE_MEDIA_MAX_SECONDS) {
        toast({
          title: "That clip doesn't fit",
          description: `Reference ${
            key === "referenceVideos" ? "video" : "audio"
          } is limited to ${SEEDANCE_REFERENCE_MEDIA_MAX_SECONDS}s in total — this one would take it to ${formatMediaDuration(
            total,
          )}.`,
          variant: "error",
        });
        return;
      }
    }

    setUploadingList(key);
    try {
      const url = await uploadFile(file);
      commitList(key, [...current, { url, preview: URL.createObjectURL(file), seconds }]);
    } catch (err) {
      reportUploadFailure(err);
    } finally {
      setUploadingList(null);
    }
  }

  function removeListItem(key: ReferenceListKey, index: number) {
    commitList(
      key,
      attachments[key].filter((_, i) => i !== index),
    );
  }

  function handleModeChange(next: ReferenceMode) {
    setRefMode(next);
    // The two modes are mutually exclusive — leaving "Keyframe" drops
    // whatever end frame was set, since a last frame with no mode that
    // supports it is not a valid pairing. The reference lists are untouched:
    // they are additive to both modes rather than a third one.
    if (next !== "keyframe") {
      setEndFramePreview(null);
      setValue("lastFrameImage", undefined, { shouldValidate: true });
    }
  }

  function handleSwapFrames() {
    const nextImage = watch("lastFrameImage");
    const nextLastFrame = watch("image");
    setValue("image", nextImage, { shouldValidate: true });
    setValue("lastFrameImage", nextLastFrame, { shouldValidate: true });
    const nextPreview = endFramePreview;
    setEndFramePreview(preview);
    setPreview(nextPreview);
  }

  const mutation = useMutation({
    mutationFn: async (data: SeedanceVideoInput) => {
      const res = await apiFetch(`/api/generations/text-to-video${workspaceQuery()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, model: SEEDANCE_MODEL_ID }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      return json;
    },
    onSuccess: (data) => {
      onCreated(data.id);
      invalidateCredits();
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't start generation", description: err.message, variant: "error" });
    },
  });

  const submit = handleSubmit((data) => mutation.mutate(data));

  /** One of the three reference lists: its filled tiles, plus an Add tile
   * while there is room left. `columns` is per-list because the ceilings are
   * so different — 30 images want small thumbnails, 10 clips want tiles wide
   * enough to read a duration off. */
  function renderList(
    key: ReferenceListKey,
    columns: string,
    mediaKind: "image" | "video" | "audio",
  ) {
    const { max } = REFERENCE_LISTS[key];
    const items = attachments[key];
    const noun = key === "referenceImages" ? "Image" : key === "referenceVideos" ? "Clip" : "Audio";
    return (
      <>
        <div className={cn("grid gap-1.5", columns)}>
          {items.map((item, index) => (
            <PanelDropzone
              key={item.url}
              compact
              className="h-20"
              mediaKind={mediaKind}
              label={`${noun} ${index + 1}`}
              previewUrl={item.preview}
              badge={item.seconds !== undefined ? formatMediaDuration(item.seconds) : undefined}
              // A filled tile is never clickable (see PanelDropzone's
              // `clickable`), so it can't pick a replacement — remove it and
              // add another instead.
              onFile={() => {}}
              onRemove={() => removeListItem(key, index)}
            />
          ))}
          {items.length < max && (
            <PanelDropzone
              compact
              className="h-20"
              mediaKind={mediaKind}
              label="Add"
              uploading={uploadingList === key}
              onFile={(file) => handleListFile(key, file)}
              onRemove={() => {}}
            />
          )}
        </div>
        <FieldError>{errors[key]?.message}</FieldError>
      </>
    );
  }

  /** "3 of 30" for an untimed list, "3 of 10 · 12s of 30s" for a timed one.
   * The budget has to be visible while it is being spent, not only once a clip
   * is refused for overflowing it. */
  function listCounter(key: ReferenceListKey): string {
    const { max, timed } = REFERENCE_LISTS[key];
    const items = attachments[key];
    const count = `${items.length} of ${max}`;
    if (!timed) return count;
    return `${count} · ${formatMediaDuration(
      totalSeconds(items),
    )} of ${SEEDANCE_REFERENCE_MEDIA_MAX_SECONDS}s`;
  }

  return (
    // Fills the studio panel: fields scroll in the middle, Generate stays
    // pinned in the footer — see generate-workspace.tsx for the panel frame.
    <form onSubmit={submit} noValidate className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
        <PanelSection label="Model">
          <ProviderModelPicker
            models={models}
            value={model}
            onChange={onModelChange}
            fullWidth
            lockReason={(id) => modelLockReason(id, tierInfo)}
          />
        </PanelSection>

        <PanelSection
          label="Upload an image"
          action={
            <SegmentedTabs
              value={refMode}
              options={["reference", "keyframe"] as const}
              onChange={handleModeChange}
              renderLabel={(m) => (m === "reference" ? "Reference" : "Keyframe")}
            />
          }
          hint={
            refMode === "keyframe"
              ? "First and last frame — the video interpolates between them."
              : "Optional — JPG, PNG or WEBP. Guides the whole generation."
          }
        >
          {refMode === "keyframe" ? (
            <div className="flex items-center gap-1.5">
              <PanelDropzone
                compact
                className="flex-1"
                label="First frame"
                previewUrl={preview}
                uploading={uploading}
                onFile={handleFile}
                onRemove={() => {
                  setPreview(null);
                  setValue("image", undefined, { shouldValidate: true });
                  // An end frame without a start frame isn't a valid pairing.
                  setEndFramePreview(null);
                  setValue("lastFrameImage", undefined, { shouldValidate: true });
                }}
              />
              <button
                type="button"
                onClick={handleSwapFrames}
                aria-label="Swap first and last frame"
                title="Swap first and last frame"
                className="flex size-6 shrink-0 items-center justify-center rounded-full border border-line bg-surface-3 text-muted shadow-raised transition-all duration-200 hover:rotate-180 hover:border-border-strong hover:text-ink-soft"
              >
                <ArrowLeftRight className="size-3" aria-hidden="true" />
              </button>
              <PanelDropzone
                compact
                className="flex-1"
                label="Last frame"
                previewUrl={endFramePreview}
                uploading={uploadingEndFrame}
                onFile={handleEndFrameFile}
                onRemove={() => {
                  setEndFramePreview(null);
                  setValue("lastFrameImage", undefined, { shouldValidate: true });
                }}
                disabled={!image}
                disabledHint="Add a first frame first."
              />
            </div>
          ) : (
            <PanelDropzone
              label="Click or drag to upload"
              sublabel="JPG, PNG or WEBP"
              previewUrl={preview}
              uploading={uploading}
              onFile={handleFile}
              onRemove={() => {
                setPreview(null);
                setValue("image", undefined, { shouldValidate: true });
                setEndFramePreview(null);
                setValue("lastFrameImage", undefined, { shouldValidate: true });
              }}
            />
          )}
        </PanelSection>

        {/* The three multimodal lists. Not reference *modes*: they travel
            alongside whatever the frame slots above hold rather than replacing
            it, which is what separates 2.5 from 2.0 (where a reference video
            is exclusive with a reference image). */}
        <PanelSection
          label="Reference images"
          action={<span className="text-caption text-muted">{listCounter("referenceImages")}</span>}
          hint="Optional — people, objects or scenes to keep recognisable. Refer to them in the prompt."
        >
          {renderList("referenceImages", "grid-cols-5", "image")}
        </PanelSection>

        <PanelSection
          label="Reference videos"
          action={<span className="text-caption text-muted">{listCounter("referenceVideos")}</span>}
          hint={`Optional — MP4 or MOV for style, motion, editing or extension. ${SEEDANCE_REFERENCE_MEDIA_MAX_SECONDS}s in total across the clips, and this mode bills at the model's higher reference-video rate. Editing an input clip needs Auto duration.`}
        >
          {renderList("referenceVideos", "grid-cols-3", "video")}
        </PanelSection>

        <PanelSection
          label="Reference audio"
          action={<span className="text-caption text-muted">{listCounter("referenceAudios")}</span>}
          hint={`Optional — MP3, WAV, M4A, AAC or OGG to drive the performance, ${SEEDANCE_REFERENCE_MEDIA_MAX_SECONDS}s in total. Enough on its own: 2.5 generates from audio with no image, video or prompt.`}
        >
          {renderList("referenceAudios", "grid-cols-3", "audio")}
        </PanelSection>

        <PanelSection label="Prompt">
          <Controller
            control={control}
            name="prompt"
            render={({ field }) => (
              <PanelPromptField
                value={field.value ?? ""}
                onChange={(v) => {
                  field.onChange(v);
                  onPromptChange(v);
                }}
                onSubmit={submit}
                placeholder="Describe the scene you imagine"
                maxLength={PROMPT_MAX_LENGTH}
              />
            )}
          />
          <FieldError>{errors.prompt?.message}</FieldError>
        </PanelSection>

        <PanelSection label="Settings">
          <PanelFieldList>
            {/* Duration gets a full block rather than a FieldRow — the
                slider needs the row's whole width, and the Auto toggle
                belongs beside the label it modifies. */}
            <div className="border-b border-line py-3.5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-label text-ink-soft">Duration</p>
                <div className="flex items-center gap-2">
                  <span className="text-caption text-muted">Auto (~{autoSeconds}s)</span>
                  {autoLocked ? (
                    <Tooltip
                      content={upgradeHint(minTierForDuration(autoSeconds), "automatic duration")}
                    >
                      <span className="inline-flex" tabIndex={0}>
                        <Switch checked={false} disabled />
                      </span>
                    </Tooltip>
                  ) : (
                    <Switch
                      checked={isAuto}
                      onCheckedChange={(checked) =>
                        setValue("duration", checked ? SEEDANCE_DURATION_AUTO : 5, { shouldValidate: true })
                      }
                    />
                  )}
                </div>
              </div>
              <div className="mt-3">
                <div className="mb-2 flex items-center justify-between text-caption text-muted">
                  <span>{SEEDANCE_DURATION_MIN}s</span>
                  <span className={cn("text-label text-ink-soft", isAuto && "opacity-40")}>
                    {isAuto ? "—" : `${duration}s`}
                  </span>
                  <span>{durationCap}s</span>
                </div>
                <Slider
                  min={SEEDANCE_DURATION_MIN}
                  max={durationCap}
                  step={1}
                  disabled={isAuto}
                  value={[isAuto ? SEEDANCE_DURATION_MIN : Math.min(duration, durationCap)]}
                  onValueChange={([v]) => setValue("duration", v, { shouldValidate: true })}
                />
                {durationCapped && (
                  <p className="mt-1.5 text-caption text-muted">
                    {upgradeHint(minTierForDuration(SEEDANCE_DURATION_MAX), `up to ${SEEDANCE_DURATION_MAX}s`)}
                  </p>
                )}
                {/* Why the number beside Auto just jumped, and why it costs
                    what it costs: an edited clip comes back about as long as
                    its input, and the input can be the whole 30s budget. */}
                {isAuto && hasTimedReference && (
                  <p className="mt-1.5 text-caption text-muted">
                    Auto follows the reference clip&apos;s length, so it is quoted at the{" "}
                    {SEEDANCE_REFERENCE_MEDIA_MAX_SECONDS}s maximum. Set a duration to pay for
                    exactly that many seconds.
                  </p>
                )}
              </div>
              <FieldError>{errors.duration?.message}</FieldError>
            </div>

            <FieldRow label="Resolution">
              <PillSelect
                icon={Monitor}
                value={resolution}
                options={SEEDANCE_RESOLUTIONS}
                onChange={(r) => setValue("resolution", r, { shouldValidate: true })}
                isOptionLocked={(r) => isResolutionLocked(r, tierInfo)}
                lockedHint={(r) => upgradeHint(minTierForResolution(r), r)}
              />
            </FieldRow>

            <FieldRow label="Aspect ratio">
              <PillSelect
                icon={RectangleHorizontal}
                value={aspectRatio}
                options={SEEDANCE_ASPECT_RATIOS}
                renderLabel={(a) => (a === "adaptive" ? "Adaptive" : a)}
                onChange={(a) => setValue("aspectRatio", a, { shouldValidate: true })}
              />
            </FieldRow>

            <FieldRow label="Format">
              <PillSelect
                icon={FileType}
                value={outputFormat}
                options={SEEDANCE_OUTPUT_FORMATS}
                renderLabel={(f) => f.toUpperCase()}
                onChange={(f) => setValue("outputFormat", f, { shouldValidate: true })}
              />
            </FieldRow>

            <FieldRow label="Generate audio" description="Sync ambient sound / dialogue to the video.">
              <Controller
                control={control}
                name="generateAudio"
                render={({ field }) => <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />}
              />
            </FieldRow>

            <div className="py-3.5">
              <label htmlFor="sd-seed" className="mb-1.5 block text-label text-ink-soft">
                Seed (optional)
              </label>
              <Input
                id="sd-seed"
                type="number"
                placeholder="Random"
                {...register("seed", {
                  setValueAs: (v) => (v === "" ? undefined : Number(v)),
                })}
              />
            </div>
          </PanelFieldList>
        </PanelSection>
      </div>

      <div className="shrink-0 border-t border-line p-4 sm:p-5">
        <CreditsSubmitPill
          fullWidth
          credits={estimatedCredits}
          loading={
            mutation.isPending || busy || uploading || uploadingEndFrame || uploadingList !== null
          }
          balance={creditBalance}
          blockedReason={blockedReason}
        />
      </div>
    </form>
  );
}
