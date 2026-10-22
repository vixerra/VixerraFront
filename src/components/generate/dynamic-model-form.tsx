"use client";

import { workspaceQuery } from "@/components/providers/workspace-provider";
import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useInvalidateCredits, useUsage } from "@/hooks/use-credits";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeftRight,
  Clock,
  Gauge,
  Maximize,
  Monitor,
  Palette,
  FileType,
  RectangleHorizontal,
  SlidersHorizontal,
  Timer,
  type LucideIcon,
} from "lucide-react";

import { FieldError, Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/components/ui/toast";
import {
  estimateVideoCredits,
  estimateImageCredits,
  imageSettingsFromParameters,
  hasAudioFromParameters,
  isDraftFromParameters,
} from "@/lib/credit-estimate";
import { buildDynamicSchema } from "@/lib/validation";
import { referenceImageSlots, type CloudflareModelConfig, type ImageLimits } from "@/lib/cloudflare-models";
import { imageLimitProblem, readImageSize } from "@/lib/image-limits";
import { measureMediaDuration, formatMediaDuration } from "@/lib/media-duration";
import { uploadVideoToLibrary, type PickedVideo } from "@/lib/video-library";
import { VideoSourceField } from "@/components/video-library/video-source-field";
import { apiFetch } from "@/lib/api-client";
import {
  isResolutionLocked,
  isDurationLocked,
  bestAllowedResolution,
  bestAllowedDuration,
  minTierForResolution,
  minTierForDuration,
  isModelLocked,
  minTierForModel,
  upgradeHint,
  RESOLUTION_RANK,
} from "@/lib/tier-limits";
import { useUnlimited } from "@/hooks/use-unlimited";
import {
  UnlimitedEndedNote,
  UnlimitedToggle,
  unlimitedRecentlyEnded,
} from "@/components/generate/unlimited-toggle";
import {
  SIZE_FIELD_KEYS,
  choicesFor,
  compareToolbarFieldKeys,
  composerFieldLabel,
  fieldPlacement,
  valueHint,
} from "@/lib/composer-fields";
import { applyImageStyle } from "@/lib/image-styles";
import { IMAGE_STYLE_PRESETS, PROMPT_MAX_LENGTH, UNLIMITED_PROMO, type TierInfo } from "@/lib/constants";
import {
  PanelSection,
  PanelPromptField,
  PanelFieldList,
  PanelDropzone,
  ProviderModelPicker,
  PillSelect,
  SegmentedTabs,
  FieldRow,
  CreditsSubmitPill,
  type PickerModel,
  type PromptMention,
} from "./composer";

const ENDPOINTS = {
  "text-to-video": "/api/generations/text-to-video",
  "text-to-image": "/api/generations/text-to-image",
  "image-to-video": "/api/generations/image-to-video",
} as const;

const FIELD_ICONS: Record<string, LucideIcon> = {
  aspectRatio: RectangleHorizontal,
  resolution: Monitor,
  duration: Clock,
  size: Maximize,
  imageSize: Maximize,
  quality: Gauge,
  outputFormat: FileType,
  fps: Timer,
};

/** How big the output is has three provider spellings (see SIZE_FIELD_KEYS)
 *  and had three different presentations to match — Monitor + "Resolution"
 *  on one image model, Maximize + "Size" on the next, for the same choice.
 *  On an image model they all read as one control; on a video model
 *  `resolution` keeps the screen icon, where it means exactly that. */
function fieldIcon(fieldKey: string, isImageModel: boolean): LucideIcon {
  if (isImageModel && SIZE_FIELD_KEYS.has(fieldKey)) return Maximize;
  return FIELD_ICONS[fieldKey] ?? SlidersHorizontal;
}

/** "None" first so the pill can express "no style applied" without a
 * separate clear affordance. */
const STYLE_OPTIONS = ["None", ...IMAGE_STYLE_PRESETS] as const;
type StyleOption = (typeof STYLE_OPTIONS)[number];

/** The two things the image section collects on a model that refuses to mix
 * them (referenceImages.exclusiveWithFrames). */
const IMAGE_MODES = ["frames", "references"] as const;
type ImageMode = (typeof IMAGE_MODES)[number];

type UploadedReference = { url: string; preview: string };
/** A reference clip, with its length when the browser could measure it. */
type UploadedClip = UploadedReference & { seconds?: number };

/** Duration is a *select* on some models rather than the numeric range the
 * slider handles — veo-3.1 spells its options "4s"/"6s"/"8s" and
 * hailuo-2.3 spells them "6"/"10". Both parse the same way, and both need it:
 * the slider's tier cap never applied to a select, so those options were
 * freely pickable and then rejected server-side with a 403. */
function durationOptionSeconds(value: string | number): number {
  return typeof value === "number" ? value : Number.parseFloat(value);
}

/** "6" -> "6s", "8s" -> "8s" — for wording an upgrade hint on either spelling. */
function durationOptionLabel(value: string | number): string {
  const raw = String(value);
  return /s$/.test(raw) ? raw : `${raw}s`;
}

/**
 * One form, driven by a CloudflareModelConfig (see cloudflare-models.ts),
 * that serves every generic-registry live model instead of a bespoke form
 * per model — the parameter shapes vary too much across 15 models for
 * hand-written forms to scale (see Seedance's two bespoke forms, which this
 * deliberately doesn't replicate a third/fourth/fifth time of).
 *
 * Enum fields ("select", plus the common "duration" number range) render as
 * rows in the panel's settings list; free text, unbounded numbers and
 * switches render as their own rows below them.
 */
export function DynamicModelForm<T extends string>({
  config,
  mode,
  models,
  model,
  onModelChange,
  initialPrompt,
  onPromptChange,
  onCreated,
  busy,
  tierInfo,
  initialValues,
}: {
  config: CloudflareModelConfig;
  mode: keyof typeof ENDPOINTS;
  models: readonly PickerModel<T>[];
  model: T;
  onModelChange: (id: T) => void;
  initialPrompt: string;
  onPromptChange: (value: string) => void;
  onCreated: (jobId: string) => void;
  busy: boolean;
  /** Current plan's limits — undefined while still loading, and irrelevant
   * for text-to-image models (only video resolution is tier-gated server
   * side, see aiVideo-backend's generations.ts). */
  tierInfo?: TierInfo;
  /** Overrides registry defaults for the given field keys; unknown keys are ignored. */
  initialValues?: Record<string, unknown>;
}) {
  const { toast } = useToast();
  const invalidateCredits = useInvalidateCredits();
  // Same ["usage"] query the generate workspace already runs, so this is a
  // cache read, not a second request. Only the balance is taken from it —
  // plan limits still arrive as the tierInfo prop.
  const usage = useUsage();
  const creditBalance = usage.data?.credit_balance;
  // Wan 3.0 Unlimited (aiVideo-backend's lib/unlimited.ts): while the
  // window is open, the model it covers can run in the Relax queue for 0
  // credits. On by default; off is an ordinary run paid in credits.
  const unlimited = useUnlimited();
  const unlimitedState = unlimited.data ?? null;
  const coveredByUnlimited =
    config.id === UNLIMITED_PROMO.videoModel ||
    (unlimitedState?.image_model !== null && config.id === unlimitedState?.image_model);
  const [relaxOn, setRelaxOn] = useState(true);
  // Reference clips are paid in credits only (the API refuses them in
  // Relax), so adding one sets the switch aside until they're removed.
  const [clips, setClips] = useState<UploadedClip[]>([]);
  const [uploadingClip, setUploadingClip] = useState(false);
  const relax = Boolean(unlimitedState?.active && coveredByUnlimited && relaxOn && clips.length === 0);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  // Image style is a composer-level control, not a model field: it folds into
  // the prompt on submit (see applyImageStyle) rather than travelling as a
  // parameter, because the backend builds parameters strictly from the model
  // registry and no image model here takes a generic style argument.
  const [style, setStyle] = useState<StyleOption>("None");
  const [endFramePreview, setEndFramePreview] = useState<string | null>(null);
  const [uploadingEndFrame, setUploadingEndFrame] = useState(false);
  const [references, setReferences] = useState<UploadedReference[]>([]);
  const [uploadingReference, setUploadingReference] = useState(false);
  const [imageMode, setImageMode] = useState<ImageMode>("frames");

  const isVideoModel = config.category !== "text-to-image";
  const isImageModel = !isVideoModel;
  const imageRequired = config.image === "required";
  const hasImage = config.image !== "none";
  // What the image section collects beyond the one upload: a closing frame
  // (lastFrameCfParam) and a list of references (referenceImages) — beside
  // the upload, or instead of the frames on a model that refuses to mix them.
  const takesEndFrame = hasImage && Boolean(config.lastFrameCfParam);
  const referenceSlots = hasImage ? referenceImageSlots(config) : 0;
  const referencesExclusive = referenceSlots > 0 && Boolean(config.referenceImages?.exclusiveWithFrames);
  const showingReferences = referencesExclusive && imageMode === "references";
  // Reference clips (Wan 3.0) belong to the references mode. Their combined
  // length is billed on top of the output and shares a ceiling with it, so
  // it caps the duration below. An unmeasured clip leaves the total unknown,
  // and the quote then takes the ceiling, as the API does.
  const clipBounds = referencesExclusive ? config.referenceVideos : undefined;
  const clipSeconds = clips.reduce((sum, clip) => sum + (clip.seconds ?? 0), 0);
  const clipBilledSeconds =
    clips.length > 0 && clips.every((clip) => clip.seconds !== undefined)
      ? Math.ceil(clipSeconds - 0.05)
      : undefined;

  const defaultValues: Record<string, unknown> = { prompt: initialPrompt };
  for (const field of config.fields) {
    if (initialValues?.[field.key] !== undefined) defaultValues[field.key] = initialValues[field.key];
    else if (field.defaultValue !== undefined) defaultValues[field.key] = field.defaultValue;
  }

  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Record<string, unknown>>({
    resolver: zodResolver(buildDynamicSchema(config)) as Resolver<Record<string, unknown>>,
    defaultValues,
  });

  // Subscribes to every field at once. The prompt already re-renders this on
  // each keystroke, so nothing is lost by it, and it lets the image cost below
  // read whichever key a given model spells its size with using the exact same
  // rule the server bills by (imageSettingsFromParameters).
  const values = watch();
  const duration = values.duration;
  const resolution = values.resolution;
  const image = values.image as string | undefined;
  const lastFrameImage = values.lastFrameImage as string | undefined;
  // Grok takes a single image at 1080p, so the reference grid closes there.
  const blockedAt = config.referenceImages?.unavailableWhen;
  const referencesBlocked =
    blockedAt !== undefined && Object.entries(blockedAt).every(([key, value]) => values[key] === value);

  // Images used to bill a flat per-model figure, so the Size/Resolution/
  // Quality pill sat directly beside the cost and the number never moved even
  // between 1K and 4K. Both sides now scale off the picked settings — see
  // estimateImageCredits, and createGenerationJob in the backend, which reads
  // the same keys back out of the saved parameters.
  const estimatedCredits = isImageModel
    ? estimateImageCredits(config.id, imageSettingsFromParameters(values))
    : estimateVideoCredits(
        config.id,
        typeof duration === "number" ? duration : durationOptionSeconds(String(duration)) || 5,
        (resolution as string) ?? "720p",
        // Kling charges for its soundtrack and Flux 3 / P-Video discount draft
        // mode, so the quote has to move with both switches — otherwise the
        // pill under the form disagrees with what the backend deducts.
        {
          hasAudio: hasAudioFromParameters(values),
          isDraft: isDraftFromParameters(values),
          hasReferenceVideo: clips.length > 0,
          referenceVideoSeconds: clipBilledSeconds,
        },
      );

  const durationField = config.fields.find(
    (f) => f.key === "duration" && f.type === "number" && f.min !== undefined && f.max !== undefined,
  );
  // Enum options for the two fields a plan can actually gate, when the model
  // spells them as selects. Memoised so the clamping effect below doesn't see
  // a fresh array identity on every render.
  const resolutionOptions = useMemo(
    () => config.fields.find((f) => f.key === "resolution" && f.type === "select")?.options ?? [],
    [config],
  );
  const durationOptions = useMemo(
    () => config.fields.find((f) => f.key === "duration" && f.type === "select")?.options ?? [],
    [config],
  );

  // Every model in the registry defaults to 720p or above, and several default
  // to a clip longer than the free plan's 5s cap — so the composer opened
  // pre-filled with a value the server would reject, and the only feedback was
  // a 403 after pressing Generate. tierInfo arrives async (it rides the usage
  // query), well after react-hook-form has taken its defaults, so the
  // correction happens here rather than in defaultValues.
  useEffect(() => {
    if (!isVideoModel || !tierInfo) return;
    const currentResolution = getValues("resolution");
    if (typeof currentResolution === "string" && isResolutionLocked(currentResolution, tierInfo)) {
      const allowed = bestAllowedResolution(resolutionOptions, tierInfo);
      if (allowed) setValue("resolution", allowed, { shouldValidate: true });
    }
    const currentDuration = getValues("duration");
    if (currentDuration === undefined) return;
    if (durationOptions.length > 0) {
      if (isDurationLocked(durationOptionSeconds(currentDuration as string), tierInfo)) {
        const allowed = bestAllowedDuration(durationOptions, durationOptionSeconds, tierInfo);
        if (allowed) setValue("duration", allowed, { shouldValidate: true });
      }
    } else if (typeof currentDuration === "number" && isDurationLocked(currentDuration, tierInfo)) {
      // The slider only ever clamped what it DISPLAYED (Math.min(value,
      // durationCap)) — the form value stayed at the model default, so both
      // the estimate and the submitted payload could sit above the cap.
      setValue("duration", tierInfo.maxDurationSeconds, { shouldValidate: true });
    }
  }, [tierInfo, isVideoModel, resolutionOptions, durationOptions, getValues, setValue]);

  // A model can offer nothing the plan is allowed to run (Veo 3.1 starts at
  // 720p; the free plan stops at 480p), in which case the clamp above has no
  // fallback and the pick stays locked. Say so on the submit button rather
  // than letting it 403.
  const lockedResolution =
    isVideoModel && typeof resolution === "string" && isResolutionLocked(resolution, tierInfo)
      ? resolution
      : undefined;
  const lockedDuration =
    isVideoModel &&
    durationOptions.length > 0 &&
    duration !== undefined &&
    isDurationLocked(durationOptionSeconds(duration as string), tierInfo)
      ? duration
      : undefined;
  // A model the plan can't run at all (Grok on Free, for now). Read off the
  // usage query rather than the tierInfo prop, which image forms may not get.
  const lockedModel = isModelLocked(model, usage.data?.tier_info);
  const blockedReason = lockedModel
    ? upgradeHint(minTierForModel(model), config.label)
    : lockedResolution
      ? upgradeHint(minTierForResolution(lockedResolution), lockedResolution)
      : lockedDuration !== undefined
        ? upgradeHint(
            minTierForDuration(durationOptionSeconds(lockedDuration as string)),
            durationOptionLabel(lockedDuration as string) + " clips",
          )
        : undefined;

  // Relax runs have their own, lower limits. The pick is clamped to them when
  // the switch is on (effect below); anything above them is refused here
  // instead of by a 403, without pointing at billing — turning the switch
  // off is the fix.
  const numericDuration =
    typeof duration === "number" ? duration : durationOptionSeconds(String(duration ?? "")) || 0;
  const relaxMaxResolution = unlimitedState?.max_resolution ?? null;
  const relaxMaxSeconds = unlimitedState?.max_duration_seconds ?? null;
  const relaxProblem =
    relax && isVideoModel
      ? relaxMaxResolution &&
        typeof resolution === "string" &&
        (RESOLUTION_RANK[resolution] ?? Infinity) > (RESOLUTION_RANK[relaxMaxResolution] ?? 0)
        ? `Unlimited goes up to ${relaxMaxResolution} — turn it off to use credits.`
        : relaxMaxSeconds && numericDuration > relaxMaxSeconds
          ? `Unlimited clips are up to ${relaxMaxSeconds}s — turn it off to use credits.`
          : undefined
      : undefined;

  useEffect(() => {
    if (!relax || !isVideoModel) return;
    const current = getValues("resolution");
    if (
      relaxMaxResolution &&
      typeof current === "string" &&
      (RESOLUTION_RANK[current] ?? Infinity) > (RESOLUTION_RANK[relaxMaxResolution] ?? 0) &&
      resolutionOptions.includes(relaxMaxResolution)
    ) {
      setValue("resolution", relaxMaxResolution, { shouldValidate: true });
    }
    const currentDuration = getValues("duration");
    if (relaxMaxSeconds && typeof currentDuration === "number" && currentDuration > relaxMaxSeconds) {
      setValue("duration", relaxMaxSeconds, { shouldValidate: true });
    }
  }, [relax, isVideoModel, relaxMaxResolution, relaxMaxSeconds, resolutionOptions, getValues, setValue]);

  /** Per-option tier gates. Resolution and duration are the only two fields a
   *  plan caps; everything else is the model's own business. */
  function optionLock(fieldKey: string): ((value: string) => boolean) | undefined {
    if (!isVideoModel) return undefined;
    if (fieldKey === "resolution") return (v) => isResolutionLocked(v, tierInfo);
    if (fieldKey === "duration") return (v) => isDurationLocked(durationOptionSeconds(v), tierInfo);
    return undefined;
  }

  function optionLockHint(fieldKey: string): ((value: string) => string) | undefined {
    if (!isVideoModel) return undefined;
    if (fieldKey === "resolution") return (v) => upgradeHint(minTierForResolution(v), v);
    if (fieldKey === "duration") {
      return (v) =>
        upgradeHint(minTierForDuration(durationOptionSeconds(v)), durationOptionLabel(v) + " clips");
    }
    return undefined;
  }

  /** Shared by every upload slot here. Throws so each caller can undo its
   *  own optimistic preview. */
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

  /** Refuses a pick its provider would refuse anyway (see image-limits.ts),
   *  before anything is uploaded. */
  async function rejectedForLimits(file: File, limits: ImageLimits | undefined): Promise<boolean> {
    if (!limits) return false;
    const size = await readImageSize(file);
    const problem = size && imageLimitProblem(size, limits);
    if (!problem) return false;
    toast({ title: `${config.label} can't use this image`, description: problem, variant: "error" });
    return true;
  }

  async function handleFile(file: File) {
    if (await rejectedForLimits(file, config.imageLimits)) return;
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
    if (await rejectedForLimits(file, config.imageLimits)) return;
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

  function setReferenceList(next: UploadedReference[]) {
    setReferences(next);
    // Undefined rather than [] once the last one goes, as the Seedance forms
    // do: absent is what the schema and the provider read as "none".
    setValue("referenceImages", next.length ? next.map((r) => r.url) : undefined, { shouldValidate: true });
  }

  async function handleReferenceFile(file: File) {
    if (references.length >= referenceSlots) return;
    if (await rejectedForLimits(file, config.referenceImages?.limits ?? config.imageLimits)) return;
    setUploadingReference(true);
    try {
      const url = await uploadFile(file);
      setReferenceList([...references, { url, preview: URL.createObjectURL(file) }]);
    } catch (err) {
      reportUploadFailure(err);
    } finally {
      setUploadingReference(false);
    }
  }

  function setClipList(next: UploadedClip[]) {
    setClips(next);
    setValue("referenceVideos", next.length ? next.map((c) => c.url) : undefined, { shouldValidate: true });
  }

  /** `picked` carries what the video slot already knows about a clip: its
   *  length, and its upload when it came from "My videos". Measured before
   *  the upload, so a clip that can't fit never reaches the bucket; one we
   *  can't measure goes on, for the API to read. */
  async function handleClipPick({ file, ...picked }: PickedVideo) {
    if (!clipBounds || clips.length >= clipBounds.max) return;
    const seconds = picked.seconds ?? (await measureMediaDuration(file));
    if (seconds !== undefined) {
      const problem =
        seconds < clipBounds.minSeconds - 0.05
          ? `Reference videos must be at least ${clipBounds.minSeconds}s.`
          : clipSeconds + seconds > clipBounds.maxTotalSeconds + 0.05
            ? `Reference videos are limited to ${clipBounds.maxTotalSeconds}s in total — this one would take it to ${formatMediaDuration(clipSeconds + seconds)}.`
            : undefined;
      if (problem) {
        toast({ title: "That clip doesn't fit", description: problem, variant: "error" });
        return;
      }
    }
    setUploadingClip(true);
    try {
      // Clips go through the library, so the next run can reuse them.
      const url = picked.url ?? (await uploadVideoToLibrary(file, { seconds }));
      setClipList([...clips, { url, preview: URL.createObjectURL(file), seconds }]);
    } catch (err) {
      reportUploadFailure(err);
    } finally {
      setUploadingClip(false);
    }
  }

  function clearEndFrame() {
    setEndFramePreview(null);
    setValue("lastFrameImage", undefined, { shouldValidate: true });
  }

  function clearImage() {
    // A shared reference list extends the main image, so its first entry
    // takes that place instead of the whole list being left without one.
    if (!referencesExclusive && references.length > 0) {
      const [first, ...rest] = references;
      setPreview(first.preview);
      setValue("image", first.url, { shouldValidate: true });
      setReferenceList(rest);
      return;
    }
    setPreview(null);
    setValue("image", undefined, { shouldValidate: true });
    // An end frame without a start frame isn't a valid pairing.
    clearEndFrame();
  }

  function handleSwapFrames() {
    const nextImage = getValues("lastFrameImage");
    setValue("lastFrameImage", getValues("image"), { shouldValidate: true });
    setValue("image", nextImage, { shouldValidate: true });
    const nextPreview = endFramePreview;
    setEndFramePreview(preview);
    setPreview(nextPreview);
  }

  /** Frames and references are exclusive on these models, so leaving a mode
   *  drops what only that mode could set, as the Seedance 2.0 form does. */
  function handleImageModeChange(next: ImageMode) {
    setImageMode(next);
    if (next === "references") {
      setPreview(null);
      setValue("image", undefined, { shouldValidate: true });
      clearEndFrame();
    } else {
      setReferenceList([]);
      setClipList([]);
    }
  }

  /** The reference tiles. A filled tile is never clickable (see
   *  PanelDropzone), so a reference is replaced by removing it and adding
   *  another, like the Seedance 2.0 character grid. On a shared list the
   *  upload is image 1, so the tiles count on from 2. */
  function renderReferenceGrid(disabledHint?: string) {
    const firstNumber = referencesExclusive ? 1 : 2;
    return (
      <>
        <div className="grid grid-cols-4 gap-1.5">
          {references.map((reference, index) => (
            <PanelDropzone
              key={reference.url}
              compact
              className="h-20"
              label={`Image ${index + firstNumber}`}
              previewUrl={reference.preview}
              onFile={() => {}}
              onRemove={() => setReferenceList(references.filter((_, i) => i !== index))}
            />
          ))}
          {references.length < referenceSlots && (
            <PanelDropzone
              compact
              className="h-20"
              label="Add"
              uploading={uploadingReference}
              onFile={handleReferenceFile}
              onRemove={() => {}}
              disabled={Boolean(disabledHint)}
              disabledHint={disabledHint}
            />
          )}
        </div>
        <FieldError>{errors.referenceImages?.message as string | undefined}</FieldError>
      </>
    );
  }

  /** The reference clips, under the images. Each tile shows its length, and
   *  the Add tile's trimmer is capped at what's left of the total, so a clip
   *  that wouldn't fit can be cut down instead of refused. */
  function renderClipGrid() {
    if (!clipBounds) return null;
    const left = clipBounds.maxTotalSeconds - clipSeconds;
    return (
      <>
        <p className="mt-4 mb-1.5 flex items-center justify-between text-caption text-muted">
          <span>Videos</span>
          {clips.length > 0 && (
            <span>
              {formatMediaDuration(clipSeconds)} / {clipBounds.maxTotalSeconds}s
            </span>
          )}
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {clips.map((clip, index) => (
            <PanelDropzone
              key={clip.url}
              compact
              className="h-20"
              mediaKind="video"
              label={`Video ${index + 1}`}
              previewUrl={clip.preview}
              badge={clip.seconds !== undefined ? formatMediaDuration(clip.seconds) : undefined}
              onFile={() => {}}
              onRemove={() => setClipList(clips.filter((_, i) => i !== index))}
            />
          ))}
          {clips.length < clipBounds.max && left >= clipBounds.minSeconds && (
            <VideoSourceField
              compact
              className="h-20"
              label="Add"
              uploading={uploadingClip}
              minSeconds={clipBounds.minSeconds}
              maxSeconds={left}
              onPick={(picked) => void handleClipPick(picked)}
              onRemove={() => {}}
            />
          )}
        </div>
        <FieldError>{errors.referenceVideos?.message as string | undefined}</FieldError>
      </>
    );
  }

  /** What @ offers in the prompt, numbered as the tiles are: the images the
   *  model receives as a list, in the order it receives them. */
  const referencePreviews = references.map((r) => r.preview);
  const mentionPreviews = showingReferences
    ? referencePreviews
    : referenceSlots > 0 && !referencesExclusive && image
      ? [preview, ...referencePreviews]
      : [];
  const promptMentions: PromptMention[] = mentionPreviews.map((p, i) => ({
    tag: `image${i + 1}`,
    label: `Image ${i + 1}`,
    preview: p,
  }));

  const referenceHint = [
    clipBounds
      ? `Optional — up to ${referenceSlots} images and ${clipBounds.max} videos (${clipBounds.maxTotalSeconds}s in total) of the people, objects, places or motion to keep. Videos add their length to the price.`
      : `Optional — up to ${referenceSlots} ${referencesExclusive ? "images" : "more images"} of the people, objects or places to keep.`,
    config.referenceImages?.hint ?? "Refer to them in the prompt.",
    clipBounds?.hint,
  ]
    .filter(Boolean)
    .join(" ");

  const mutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const workspace = workspaceQuery();
      const queue = relax ? `${workspace ? "&" : "?"}queue=relax` : "";
      const res = await apiFetch(`${ENDPOINTS[mode]}${workspace}${queue}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, model: config.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      return json;
    },
    onSuccess: (data) => {
      onCreated(data.id);
      invalidateCredits();
      if (relax) void unlimited.refetch();
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't start generation", description: err.message, variant: "error" });
    },
  });

  const submit = handleSubmit((data) =>
    mutation.mutate(
      isImageModel && style !== "None"
        ? { ...data, prompt: applyImageStyle(String(data.prompt ?? ""), style) }
        : data,
    ),
  );

  // Where each field goes is decided in one place — see fieldPlacement.
  // "toolbar" fields are the enum picks (plus the duration range); "panel"
  // fields are what a pill genuinely cannot carry (switches, open numbers,
  // open text). Both render as rows of the same settings list now, in that
  // order; what is dropped entirely is what the plan owns or what offers no
  // real choice — both still ship their default.
  const placement = (f: (typeof config.fields)[number]) => fieldPlacement(f, durationField?.key);
  const pillFields = config.fields
    .filter((f) => placement(f) === "toolbar")
    .sort((a, b) => compareToolbarFieldKeys(a.key, b.key));
  const panelFields = config.fields.filter((f) => placement(f) === "panel");

  // Clamps the duration slider to the current plan's limit (undefined
  // tierInfo — still loading — leaves the model's own max in place).
  const durationModelMax = durationField?.max ?? 0;
  const durationPlanCap = tierInfo ? Math.min(durationModelMax, tierInfo.maxDurationSeconds) : durationModelMax;
  const durationCapped = tierInfo ? durationPlanCap < durationModelMax : false;
  // Output and reference clips share one ceiling on these models.
  const durationClipCap =
    clipBounds?.maxWithOutputSeconds !== undefined && clips.length > 0
      ? clipBounds.maxWithOutputSeconds - Math.ceil(clipSeconds - 0.05)
      : Infinity;
  const durationCap = Math.max(durationField?.min ?? 1, Math.min(durationPlanCap, durationClipCap));

  useEffect(() => {
    const current = getValues("duration");
    if (durationField && typeof current === "number" && current > durationCap) {
      setValue("duration", durationCap, { shouldValidate: true });
    }
  }, [durationCap, durationField, getValues, setValue]);

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
          />
        </PanelSection>

        {hasImage && (
          <PanelSection
            label={
              referencesExclusive
                ? "Images"
                : takesEndFrame
                  ? "Frames"
                  : isVideoModel
                    ? "Upload an image"
                    : "Reference image"
            }
            action={
              referencesExclusive ? (
                <SegmentedTabs
                  value={imageMode}
                  options={IMAGE_MODES}
                  onChange={handleImageModeChange}
                  renderLabel={(m) => (m === "frames" ? "Frames" : "References")}
                />
              ) : undefined
            }
            hint={
              showingReferences
                ? referenceHint
                : takesEndFrame
                  ? `${imageRequired ? "Required" : "Optional"} — JPG, PNG or WEBP. The clip starts on the first frame; add a last frame to set where it ends.`
                  : imageRequired
                    ? "Required — JPG, PNG or WEBP. This image becomes the first frame."
                    : "Optional — JPG, PNG or WEBP."
            }
          >
            {showingReferences ? (
              <>
                {clipBounds && <p className="mb-1.5 text-caption text-muted">Images</p>}
                {renderReferenceGrid()}
                {renderClipGrid()}
              </>
            ) : takesEndFrame ? (
              <div className="flex items-center gap-1.5">
                <PanelDropzone
                  compact
                  className="flex-1"
                  label="First frame"
                  previewUrl={preview}
                  uploading={uploading}
                  onFile={handleFile}
                  onRemove={clearImage}
                />
                <button
                  type="button"
                  onClick={handleSwapFrames}
                  disabled={!image || !lastFrameImage}
                  aria-label="Swap first and last frame"
                  title="Swap first and last frame"
                  className="flex size-6 shrink-0 items-center justify-center rounded-full border border-line bg-surface-3 text-muted shadow-raised transition-all duration-200 hover:rotate-180 hover:border-border-strong hover:text-ink-soft disabled:pointer-events-none disabled:opacity-40"
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
                  onRemove={clearEndFrame}
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
                onRemove={clearImage}
              />
            )}
            <FieldError>{!image ? (errors.image?.message as string | undefined) : undefined}</FieldError>
            <FieldError>{errors.lastFrameImage?.message as string | undefined}</FieldError>
          </PanelSection>
        )}

        {referenceSlots > 0 && !referencesExclusive && (
          <PanelSection label="More references" hint={referenceHint}>
            {renderReferenceGrid(
              !image
                ? "Add the main image first."
                : referencesBlocked
                  ? `Only one image at ${Object.values(blockedAt ?? {}).join(", ")}.`
                  : undefined,
            )}
          </PanelSection>
        )}

        <PanelSection label="Prompt">
          <Controller
            control={control}
            name="prompt"
            render={({ field }) => (
              <PanelPromptField
                value={(field.value as string) ?? ""}
                onChange={(v) => {
                  field.onChange(v);
                  onPromptChange(v);
                }}
                onSubmit={submit}
                placeholder={
                  imageRequired
                    ? "Describe the motion or scene changes…"
                    : isImageModel
                      ? "Describe the image you imagine"
                      : "Describe the scene you imagine"
                }
                maxLength={PROMPT_MAX_LENGTH}
                mentions={promptMentions}
              />
            )}
          />
          <FieldError>{errors.prompt?.message as string | undefined}</FieldError>
        </PanelSection>

        <PanelSection label="Settings">
          <PanelFieldList>
            {isImageModel && (
              <FieldRow label="Style" description="Added to your prompt when you generate.">
                <PillSelect
                  icon={Palette}
                  label="Style"
                  value={style}
                  options={STYLE_OPTIONS}
                  onChange={setStyle}
                />
              </FieldRow>
            )}

            {pillFields.map((field) =>
              field.key === durationField?.key ? (
                // The duration range gets a full-width block — the slider
                // needs the row's whole width, not a pill's.
                <div key={field.key} className="border-b border-line py-3.5 last:border-0">
                  <div className="flex items-center justify-between gap-4 text-label text-ink-soft">
                    <p>{field.label}</p>
                    <span>
                      {Math.min(
                        typeof duration === "number" ? duration : ((field.defaultValue as number) ?? field.min!),
                        durationCap,
                      )}
                      s
                    </span>
                  </div>
                  <div className="mt-3">
                    <Slider
                      min={field.min!}
                      max={durationCap}
                      step={1}
                      value={[
                        Math.min(
                          typeof duration === "number" ? duration : ((field.defaultValue as number) ?? field.min!),
                          durationCap,
                        ),
                      ]}
                      onValueChange={([v]) => setValue(field.key, v, { shouldValidate: true })}
                    />
                    {durationClipCap < durationPlanCap ? (
                      <p className="mt-1.5 text-caption text-muted">
                        Up to {durationCap}s with your reference videos — output and videos share{" "}
                        {clipBounds?.maxWithOutputSeconds}s.
                      </p>
                    ) : (
                      durationCapped && (
                        <p className="mt-1.5 text-caption text-muted">
                          {upgradeHint(minTierForDuration(durationModelMax), `up to ${durationModelMax}s`)}
                        </p>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <FieldRow key={field.key} label={composerFieldLabel(field, isImageModel)}>
                  <PillSelect
                    icon={fieldIcon(field.key, isImageModel)}
                    label={composerFieldLabel(field, isImageModel)}
                    value={(watch(field.key) as string) ?? choicesFor(field)[0] ?? ""}
                    options={choicesFor(field)}
                    renderHint={valueHint}
                    onChange={(v) => setValue(field.key, v, { shouldValidate: true })}
                    isOptionLocked={optionLock(field.key)}
                    lockedHint={optionLockHint(field.key)}
                  />
                </FieldRow>
              ),
            )}

            {panelFields.map((field) =>
              field.type === "switch" ? (
                <FieldRow key={field.key} label={field.label} description={field.helperText}>
                  <Controller
                    control={control}
                    name={field.key}
                    render={({ field: controllerField }) => (
                      <Switch
                        checked={Boolean(controllerField.value)}
                        onCheckedChange={controllerField.onChange}
                      />
                    )}
                  />
                </FieldRow>
              ) : (
                <div key={field.key} className="border-b border-line py-3.5 last:border-0">
                  <label htmlFor={`dyn-${field.key}`} className="mb-1.5 block text-label text-ink-soft">
                    {field.label}
                  </label>
                  {field.type === "number" ? (
                    <Input
                      id={`dyn-${field.key}`}
                      type="number"
                      placeholder={field.helperText ?? "Random"}
                      {...register(field.key, {
                        setValueAs: (v) => (v === "" ? undefined : Number(v)),
                      })}
                    />
                  ) : (
                    <Input id={`dyn-${field.key}`} placeholder={field.helperText} {...register(field.key)} />
                  )}
                  {field.helperText && field.type !== "number" && (
                    <p className="mt-1.5 text-caption text-muted">{field.helperText}</p>
                  )}
                  <FieldError>{errors[field.key]?.message as string | undefined}</FieldError>
                </div>
              ),
            )}
          </PanelFieldList>
        </PanelSection>
      </div>

      <div className="shrink-0 border-t border-line p-4 sm:p-5">
        {coveredByUnlimited && unlimitedState?.active && (
          <UnlimitedToggle
            state={unlimitedState}
            checked={relax}
            onCheckedChange={setRelaxOn}
            disabledReason={
              clips.length > 0
                ? "Reference videos are paid in credits. Remove them to generate for free."
                : undefined
            }
            className="mb-3"
          />
        )}
        {config.id === UNLIMITED_PROMO.videoModel && unlimitedRecentlyEnded(unlimitedState) && (
          <UnlimitedEndedNote className="mb-3" />
        )}
        <CreditsSubmitPill
          fullWidth
          credits={relax ? 0 : estimatedCredits}
          loading={mutation.isPending || busy || uploading || uploadingEndFrame || uploadingReference || uploadingClip}
          disabled={imageRequired && !image}
          balance={creditBalance}
          blockedReason={blockedReason}
          incompleteReason={relaxProblem}
        />
      </div>
    </form>
  );
}
