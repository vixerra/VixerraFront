"use client";

import { workspaceQuery } from "@/components/providers/workspace-provider";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useInvalidateCredits, useUsage } from "@/hooks/use-credits";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftRight, Clock, Monitor, RectangleHorizontal } from "lucide-react";
import { FieldError, Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { estimateVideoCredits } from "@/lib/credit-estimate";
import { seedance2VideoSchema, type Seedance2VideoInput } from "@/lib/validation";
import { apiFetch } from "@/lib/api-client";
import {
  modelLockReason,
  isResolutionLocked,
  isDurationLocked,
  bestAllowedResolution,
  bestAllowedDuration,
  minTierForResolution,
  minTierForDuration,
  upgradeHint,
} from "@/lib/tier-limits";
import {
  PROMPT_MAX_LENGTH,
  SEEDANCE2_MODEL_ID,
  SEEDANCE2_DURATION_MIN,
  SEEDANCE2_DURATION_MAX,
  SEEDANCE2_RESOLUTIONS,
  SEEDANCE2_ASPECT_RATIOS,
  SEEDANCE2_REFERENCE_IMAGES_MAX,
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

const DURATIONS = Array.from(
  { length: SEEDANCE2_DURATION_MAX - SEEDANCE2_DURATION_MIN + 1 },
  (_, i) => SEEDANCE2_DURATION_MIN + i,
);

function clampDuration(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isInteger(value)) return undefined;
  return Math.min(SEEDANCE2_DURATION_MAX, Math.max(SEEDANCE2_DURATION_MIN, value));
}

export function Seedance2VideoForm({
  models,
  model,
  onModelChange,
  initialPrompt,
  onPromptChange,
  initialParams,
  onCreated,
  busy,
  tierInfo,
}: {
  models: readonly PickerModel<VideoModelId>[];
  model: VideoModelId;
  onModelChange: (id: VideoModelId) => void;
  initialPrompt: string;
  onPromptChange: (value: string) => void;
  /** Deep-link support (e.g. "Use this template" from the prompt gallery). */
  initialParams?: {
    duration?: number;
    resolution?: (typeof SEEDANCE2_RESOLUTIONS)[number];
    aspectRatio?: (typeof SEEDANCE2_ASPECT_RATIOS)[number];
  };
  onCreated: (jobId: string) => void;
  busy: boolean;
  /** Current plan's limits — undefined while still loading. See
   * seedance-video-form.tsx's tierInfo prop for the full rationale. */
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
  const [uploadingRefVideo, setUploadingRefVideo] = useState(false);
  const [refVideoPreview, setRefVideoPreview] = useState<string | null>(null);
  const [refMode, setRefMode] = useState<ReferenceMode>("reference");
  // Character references are a growable list rather than fixed slots: the
  // form only ever holds the ones actually uploaded, so referenceImages stays
  // a dense array and removing the second of three doesn't leave a hole the
  // provider would have to interpret. The blob: preview is kept beside each
  // URL so a tile renders the picked file itself rather than re-fetching the
  // upload it was just made from.
  const [characters, setCharacters] = useState<{ url: string; preview: string }[]>([]);
  const [uploadingCharacter, setUploadingCharacter] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Seedance2VideoInput>({
    resolver: zodResolver(seedance2VideoSchema) as Resolver<Seedance2VideoInput>,
    defaultValues: {
      prompt: initialPrompt,
      duration: clampDuration(initialParams?.duration) ?? 5,
      resolution: initialParams?.resolution ?? "720p",
      aspectRatio: initialParams?.aspectRatio ?? "16:9",
      cameraFixed: false,
      generateAudio: true,
      watermark: false,
      // Pinned on and no longer offered as a switch: it routes character
      // references through ByteDance's trusted avatar library instead of its
      // face/deepfake detector, so it only ever unblocks a generation.
      useVirtualAvatar: true,
    },
  });

  const duration = watch("duration");
  const resolution = watch("resolution");
  const aspectRatio = watch("aspectRatio");
  const image = watch("image");
  const referenceVideo = watch("referenceVideo");
  // Both pin the output's shape: a still is composed into, a clip is followed.
  const hasReference = Boolean(image) || Boolean(referenceVideo);
  // Reference-video mode bills off the provider's higher per-second table, so
  // the quote has to know about it — otherwise the pill under-prices the very
  // request the server is about to charge for. See credit-estimate.ts.
  const estimatedCredits = estimateVideoCredits(SEEDANCE2_MODEL_ID, duration, resolution, {
    hasReferenceVideo: Boolean(referenceVideo),
  });

  // Defaults are 720p / 5s, and the free plan caps at 480p — so the composer
  // used to open on a resolution the server would reject, with a 403 after
  // pressing Generate as the only feedback. tierInfo lands async, after
  // react-hook-form has taken its defaults, so this corrects it here.
  useEffect(() => {
    if (!tierInfo) return;
    if (isResolutionLocked(resolution, tierInfo)) {
      const allowed = bestAllowedResolution(SEEDANCE2_RESOLUTIONS, tierInfo);
      if (allowed) setValue("resolution", allowed as typeof resolution, { shouldValidate: true });
    }
    if (isDurationLocked(duration, tierInfo)) {
      const allowed = bestAllowedDuration(DURATIONS, (d) => d, tierInfo);
      if (allowed !== undefined) setValue("duration", allowed, { shouldValidate: true });
    }
  }, [tierInfo, resolution, duration, setValue]);

  // Both clamps can come up empty — 4K is Studio-only, and a plan could cap
  // below this model's 4s floor — so say why instead of letting it 403.
  const blockedReason = isResolutionLocked(resolution, tierInfo)
    ? upgradeHint(minTierForResolution(resolution), resolution === "4k" ? "4K" : resolution)
    : isDurationLocked(duration, tierInfo)
      ? upgradeHint(minTierForDuration(duration), duration + "s clips")
      : undefined;

  /** Shared by every upload slot this form owns — first frame, last frame,
   * reference video and the character stills. Throws so each caller can undo
   * its own optimistic preview. */
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

  async function handleRefVideoFile(file: File) {
    setUploadingRefVideo(true);
    setRefVideoPreview(URL.createObjectURL(file));
    try {
      setValue("referenceVideo", await uploadFile(file), { shouldValidate: true });
    } catch (err) {
      reportUploadFailure(err);
      setRefVideoPreview(null);
    } finally {
      setUploadingRefVideo(false);
    }
  }

  function clearRefVideo() {
    setRefVideoPreview(null);
    setValue("referenceVideo", undefined, { shouldValidate: true });
  }

  async function handleCharacterFile(file: File) {
    if (characters.length >= SEEDANCE2_REFERENCE_IMAGES_MAX) return;
    setUploadingCharacter(true);
    try {
      const url = await uploadFile(file);
      const next = [...characters, { url, preview: URL.createObjectURL(file) }];
      setCharacters(next);
      setValue(
        "referenceImages",
        next.map((c) => c.url),
        { shouldValidate: true },
      );
    } catch (err) {
      reportUploadFailure(err);
    } finally {
      setUploadingCharacter(false);
    }
  }

  function removeCharacter(index: number) {
    const next = characters.filter((_, i) => i !== index);
    setCharacters(next);
    // Undefined rather than [] once the last one goes: the schema treats the
    // field as absent, where an empty array would still reach the provider.
    setValue("referenceImages", next.length ? next.map((c) => c.url) : undefined, {
      shouldValidate: true,
    });
  }

  /** The three modes are mutually exclusive on the wire — the model follows
   * a video reference instead of frame references, not alongside them — so
   * leaving a mode drops whatever only that mode could set. Character
   * references survive the switch: they are additive to all three. */
  function handleModeChange(next: ReferenceMode) {
    setRefMode(next);
    if (next !== "keyframe") {
      setEndFramePreview(null);
      setValue("lastFrameImage", undefined, { shouldValidate: true });
    }
    if (next !== "video") {
      clearRefVideo();
    } else {
      setPreview(null);
      setValue("image", undefined, { shouldValidate: true });
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
    mutationFn: async (data: Seedance2VideoInput) => {
      const res = await apiFetch(`/api/generations/text-to-video${workspaceQuery()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, model: SEEDANCE2_MODEL_ID }),
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
          label="Reference"
          action={
            <SegmentedTabs
              value={refMode}
              options={["reference", "keyframe", "video"] as const}
              onChange={handleModeChange}
              renderLabel={(m) => (m === "reference" ? "Image" : m === "keyframe" ? "Keyframe" : "Video")}
            />
          }
          hint={
            refMode === "keyframe"
              ? "First and last frame — the video interpolates between them."
              : refMode === "video"
                ? "Optional — MP4 or MOV, up to 50MB. The clip's motion and framing drive the generation; this mode bills at the model's higher reference-video rate."
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
          ) : refMode === "video" ? (
            <>
              <PanelDropzone
                mediaKind="video"
                label="Click or drag to upload"
                sublabel="MP4 or MOV"
                previewUrl={refVideoPreview}
                uploading={uploadingRefVideo}
                onFile={handleRefVideoFile}
                onRemove={clearRefVideo}
              />
              <FieldError>{errors.referenceVideo?.message}</FieldError>
            </>
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

        {/* Subject references, not a fourth reference mode: these say who or
            what appears and travel with whichever mode is selected above. */}
        <PanelSection
          label="Characters"
          hint={`Optional — up to ${SEEDANCE2_REFERENCE_IMAGES_MAX} people or objects to keep recognisable across the clip. Refer to them in the prompt.`}
        >
          <div className="grid grid-cols-4 gap-1.5">
            {characters.map((character, index) => (
              <PanelDropzone
                key={character.url}
                compact
                className="h-20"
                label={`Character ${index + 1}`}
                previewUrl={character.preview}
                // A filled tile is never clickable (see PanelDropzone's
                // `clickable`), so it can't pick a replacement — remove it and
                // add another instead.
                onFile={() => {}}
                onRemove={() => removeCharacter(index)}
              />
            ))}
            {characters.length < SEEDANCE2_REFERENCE_IMAGES_MAX && (
              <PanelDropzone
                compact
                className="h-20"
                label="Add"
                uploading={uploadingCharacter}
                onFile={handleCharacterFile}
                onRemove={() => {}}
              />
            )}
          </div>
          <FieldError>{errors.referenceImages?.message}</FieldError>
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
            <FieldRow label="Duration">
              <PillSelect
                icon={Clock}
                value={duration}
                options={DURATIONS}
                renderLabel={(d) => `${d}s`}
                onChange={(d) => setValue("duration", d, { shouldValidate: true })}
                isOptionLocked={(d) => isDurationLocked(d, tierInfo)}
                lockedHint={(d) => upgradeHint(minTierForDuration(d), `${d}s clips`)}
              />
            </FieldRow>

            <FieldRow label="Resolution">
              <PillSelect
                icon={Monitor}
                value={resolution}
                options={SEEDANCE2_RESOLUTIONS}
                renderLabel={(r) => (r === "4k" ? "4K" : r)}
                onChange={(r) => setValue("resolution", r, { shouldValidate: true })}
                isOptionLocked={(r) => isResolutionLocked(r, tierInfo)}
                lockedHint={(r) => upgradeHint(minTierForResolution(r), r === "4k" ? "4K" : r)}
              />
            </FieldRow>

            <FieldRow
              label="Aspect ratio"
              description={
                hasReference ? "Ignored while a reference image or video is set." : undefined
              }
            >
              <PillSelect
                icon={RectangleHorizontal}
                value={aspectRatio}
                options={SEEDANCE2_ASPECT_RATIOS}
                onChange={(a) => setValue("aspectRatio", a, { shouldValidate: true })}
                disabled={hasReference}
                disabledHint="Ignored while a reference image or video is set — the video inherits its aspect ratio."
              />
            </FieldRow>

            <FieldRow label="Fix camera position" description="Lock the camera instead of letting it move.">
              <Controller
                control={control}
                name="cameraFixed"
                render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
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
              <label htmlFor="sd2-seed" className="mb-1.5 block text-label text-ink-soft">
                Seed (optional)
              </label>
              <Input
                id="sd2-seed"
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
            mutation.isPending ||
            busy ||
            uploading ||
            uploadingEndFrame ||
            uploadingRefVideo ||
            uploadingCharacter
          }
          balance={creditBalance}
          blockedReason={blockedReason}
        />
      </div>
    </form>
  );
}
