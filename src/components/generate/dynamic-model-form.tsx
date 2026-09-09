"use client";

import { workspaceQuery } from "@/components/providers/workspace-provider";
import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useInvalidateCredits, useUsage } from "@/hooks/use-credits";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
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
} from "@/lib/credit-estimate";
import { buildDynamicSchema } from "@/lib/validation";
import type { CloudflareModelConfig } from "@/lib/cloudflare-models";
import { apiFetch } from "@/lib/api-client";
import {
  isResolutionLocked,
  isDurationLocked,
  bestAllowedResolution,
  bestAllowedDuration,
  minTierForResolution,
  minTierForDuration,
  modelLockReason,
  upgradeHint,
} from "@/lib/tier-limits";
import {
  SIZE_FIELD_KEYS,
  choicesFor,
  compareToolbarFieldKeys,
  composerFieldLabel,
  fieldPlacement,
  valueHint,
} from "@/lib/composer-fields";
import { applyImageStyle } from "@/lib/image-styles";
import { IMAGE_STYLE_PRESETS, PROMPT_MAX_LENGTH, type TierInfo } from "@/lib/constants";
import {
  PanelSection,
  PanelPromptField,
  PanelFieldList,
  PanelDropzone,
  ProviderModelPicker,
  PillSelect,
  FieldRow,
  CreditsSubmitPill,
  type PickerModel,
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
}) {
  const { toast } = useToast();
  const invalidateCredits = useInvalidateCredits();
  // Same ["usage"] query the generate workspace already runs, so this is a
  // cache read, not a second request. Only the balance is taken from it —
  // plan limits still arrive as the tierInfo prop.
  const usage = useUsage();
  const creditBalance = usage.data?.credit_balance;
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  // Image style is a composer-level control, not a model field: it folds into
  // the prompt on submit (see applyImageStyle) rather than travelling as a
  // parameter, because the backend builds parameters strictly from the model
  // registry and no image model here takes a generic style argument.
  const [style, setStyle] = useState<StyleOption>("None");

  const isVideoModel = config.category !== "text-to-image";
  const isImageModel = !isVideoModel;
  const imageRequired = config.image === "required";
  const hasImage = config.image !== "none";

  const defaultValues: Record<string, unknown> = { prompt: initialPrompt };
  for (const field of config.fields) {
    if (field.defaultValue !== undefined) defaultValues[field.key] = field.defaultValue;
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
  const blockedReason = lockedResolution
    ? upgradeHint(minTierForResolution(lockedResolution), lockedResolution)
    : lockedDuration !== undefined
      ? upgradeHint(
          minTierForDuration(durationOptionSeconds(lockedDuration as string)),
          durationOptionLabel(lockedDuration as string) + " clips",
        )
      : undefined;

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

  async function handleFile(file: File) {
    setUploading(true);
    setPreview(URL.createObjectURL(file));
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed.");
      setValue("image", json.url, { shouldValidate: true });
    } catch (err) {
      toast({ title: "Upload failed", description: (err as Error).message, variant: "error" });
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  const mutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiFetch(`${ENDPOINTS[mode]}${workspaceQuery()}`, {
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
  const durationCap = tierInfo ? Math.min(durationModelMax, tierInfo.maxDurationSeconds) : durationModelMax;
  const durationCapped = tierInfo ? durationCap < durationModelMax : false;

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

        {hasImage && (
          <PanelSection
            label={isVideoModel ? "Upload an image" : "Reference image"}
            hint={
              imageRequired
                ? "Required — JPG, PNG or WEBP. This image becomes the first frame."
                : "Optional — JPG, PNG or WEBP."
            }
          >
            <PanelDropzone
              label="Click or drag to upload"
              sublabel="JPG, PNG or WEBP"
              previewUrl={preview}
              uploading={uploading}
              onFile={handleFile}
              onRemove={() => {
                setPreview(null);
                setValue("image", undefined, { shouldValidate: true });
              }}
            />
            <FieldError>{!image ? (errors.image?.message as string | undefined) : undefined}</FieldError>
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
                    {durationCapped && (
                      <p className="mt-1.5 text-caption text-muted">
                        {upgradeHint(minTierForDuration(durationModelMax), `up to ${durationModelMax}s`)}
                      </p>
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
        <CreditsSubmitPill
          fullWidth
          credits={estimatedCredits}
          loading={mutation.isPending || busy || uploading}
          disabled={imageRequired && !image}
          balance={creditBalance}
          blockedReason={blockedReason}
        />
      </div>
    </form>
  );
}
