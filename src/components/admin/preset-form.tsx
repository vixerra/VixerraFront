"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Input, Textarea, Select, Label, FieldError } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { CLOUDFLARE_MODELS, getCloudflareModel, type DynamicField } from "@/lib/cloudflare-models";
import {
  PROMPT_MAX_LENGTH,
  SEEDANCE_MODEL_ID,
  SEEDANCE_RESOLUTIONS,
  SEEDANCE_ASPECT_RATIOS,
  SEEDANCE_OUTPUT_FORMATS,
  SEEDANCE2_MODEL_ID,
  SEEDANCE2_RESOLUTIONS,
  SEEDANCE2_ASPECT_RATIOS,
} from "@/lib/constants";
import { PRESET_CATEGORIES } from "@/lib/viral-presets";
import type { AdminPresetInput, AdminPresetRow } from "@/hooks/use-admin-data";

/**
 * Create/edit form for one preset.
 *
 * The parameter half is generated from whichever model is selected rather
 * than hardcoded, because the catalogue's models genuinely disagree about
 * their own options: duration is a number of seconds for Vidu and Pruna, the
 * string "6s" for Veo and "6" for Hailuo; resolutions run 480p/540p/720p/
 * 768p/1080p/4k depending on who you ask. A fixed duration+resolution form
 * would silently produce recipes that 400 the moment a user runs them, which
 * is the exact failure this whole change exists to remove.
 *
 * Switching models therefore rebuilds the fields and drops values the new
 * model doesn't recognise, keeping anything it does (both call it
 * "resolution" and both accept "720p" — no reason to make an operator retype
 * it). The server validates the result again regardless; this is the fast
 * feedback, not the guarantee.
 */

/** The two hand-written Seedance models predate the config-driven registry,
 *  so their fields are described here to give them the same form. Mirrors
 *  the parameter schemas in the backend's lib/presets.ts. */
const SEEDANCE_FIELDS: Record<string, DynamicField[]> = {
  [SEEDANCE_MODEL_ID]: [
    { key: "duration", cfParam: "duration", label: "Duration", type: "number", defaultValue: 5, min: 4, max: 30, helperText: "seconds (-1 = automatic)" },
    { key: "resolution", cfParam: "resolution", label: "Resolution", type: "select", options: [...SEEDANCE_RESOLUTIONS], defaultValue: "720p" },
    { key: "aspectRatio", cfParam: "aspect_ratio", label: "Aspect ratio", type: "select", options: [...SEEDANCE_ASPECT_RATIOS], defaultValue: "adaptive" },
    { key: "generateAudio", cfParam: "generate_audio", label: "Generate audio", type: "switch", defaultValue: true },
    { key: "watermark", cfParam: "watermark", label: "Watermark", type: "switch", defaultValue: false },
    { key: "useVirtualAvatar", cfParam: "use_virtual_avatar", label: "Virtual avatar mode", type: "switch", defaultValue: true },
    { key: "outputFormat", cfParam: "output_format", label: "Output format", type: "select", options: [...SEEDANCE_OUTPUT_FORMATS], defaultValue: "mp4" },
  ],
  [SEEDANCE2_MODEL_ID]: [
    { key: "duration", cfParam: "duration", label: "Duration", type: "number", defaultValue: 5, min: 4, max: 12, helperText: "seconds" },
    { key: "resolution", cfParam: "resolution", label: "Resolution", type: "select", options: [...SEEDANCE2_RESOLUTIONS], defaultValue: "720p" },
    { key: "aspectRatio", cfParam: "aspect_ratio", label: "Aspect ratio", type: "select", options: [...SEEDANCE2_ASPECT_RATIOS], defaultValue: "16:9" },
    { key: "cameraFixed", cfParam: "camera_fixed", label: "Fix camera position", type: "switch", defaultValue: false },
    { key: "generateAudio", cfParam: "generate_audio", label: "Generate audio", type: "switch", defaultValue: true },
    { key: "watermark", cfParam: "watermark", label: "Watermark", type: "switch", defaultValue: false },
    { key: "useVirtualAvatar", cfParam: "use_virtual_avatar", label: "Virtual avatar mode", type: "switch", defaultValue: true },
  ],
};

/** Every model a preset may name: the two Seedance ids plus every video
 *  model in the registry. Image models are excluded — the studio renders a
 *  video player, and the backend refuses them for the same reason. */
const MODEL_OPTIONS = [
  { id: SEEDANCE2_MODEL_ID, label: "Seedance 2.0 (ByteDance)" },
  { id: SEEDANCE_MODEL_ID, label: "Seedance 2.5 (ByteDance)" },
  ...CLOUDFLARE_MODELS.filter(
    (m) => m.category === "text-to-video" || m.category === "image-to-video",
  ).map((m) => ({ id: m.id, label: `${m.label} (${m.provider})` })),
];

const STYLE_MODEL_OPTIONS = CLOUDFLARE_MODELS.filter(
  (m) => m.category === "text-to-image" && m.image !== "none",
).map((m) => ({ id: m.id, label: `${m.label} (${m.provider})` }));

function fieldsForModel(modelId: string): DynamicField[] {
  return SEEDANCE_FIELDS[modelId] ?? getCloudflareModel(modelId)?.fields ?? [];
}

function defaultParameters(modelId: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fieldsForModel(modelId)) {
    if (field.defaultValue !== undefined) out[field.key] = field.defaultValue;
  }
  return out;
}

const EMPTY: AdminPresetInput = {
  slug: "",
  title: "",
  tagline: "",
  category: "Trending",
  previewUrl: "",
  badge: null,
  referenceSubject: "",
  prompt: "",
  model: SEEDANCE2_MODEL_ID,
  parameters: defaultParameters(SEEDANCE2_MODEL_ID),
  styleModel: null,
  stylePrompt: null,
  styleParameters: {},
  requiresImage: true,
  published: false,
  sortOrder: 0,
};

export function PresetForm({
  initial,
  pending,
  error,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: AdminPresetRow;
  pending: boolean;
  error: string | null;
  submitLabel: string;
  onSubmit: (value: AdminPresetInput) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState<AdminPresetInput>(() =>
    initial
      ? {
          slug: initial.slug,
          title: initial.title,
          tagline: initial.tagline,
          category: initial.category,
          previewUrl: initial.previewUrl,
          badge: initial.badge === "New" ? "New" : null,
          referenceSubject: initial.referenceSubject,
          prompt: initial.prompt,
          model: initial.model,
          parameters: initial.parameters ?? {},
          styleModel: initial.styleModel,
          stylePrompt: initial.stylePrompt,
          styleParameters: initial.styleParameters ?? {},
          requiresImage: initial.requiresImage,
          published: initial.published,
          sortOrder: initial.sortOrder,
        }
      : EMPTY,
  );

  // Kept beside the form value rather than in it: what gets SAVED is the
  // durable reference (`r2://<key>`), what gets SHOWN is a signed bucket URL
  // that expires. Submitting the playable one would write an expiry into the
  // catalogue, so the two never share a field.
  const [previewPlaybackUrl, setPreviewPlaybackUrl] = useState<string | null>(
    initial?.previewPlaybackUrl ?? null,
  );

  const set = <K extends keyof AdminPresetInput>(key: K, next: AdminPresetInput[K]) =>
    setValue((v) => ({ ...v, [key]: next }));

  const fields = useMemo(() => fieldsForModel(value.model), [value.model]);

  // Rebuild the parameter blob when the model changes: keep values the new
  // model also declares AND still accepts, fall back to its defaults for the
  // rest. A select value that isn't in the new model's option list is
  // dropped rather than carried over — carrying "720p" into Hailuo is
  // precisely the bug this form is meant to make impossible.
  const previousModel = useRef(value.model);
  useEffect(() => {
    if (previousModel.current === value.model) return;
    previousModel.current = value.model;

    setValue((v) => {
      const next = defaultParameters(v.model);
      for (const field of fieldsForModel(v.model)) {
        const carried = v.parameters[field.key];
        if (carried === undefined) continue;
        if (field.type === "select" && !(field.options ?? []).includes(String(carried))) continue;
        if (field.type === "number" && typeof carried !== "number") continue;
        if (field.type === "switch" && typeof carried !== "boolean") continue;
        next[field.key] = carried;
      }
      return { ...v, parameters: next };
    });
  }, [value.model]);

  const styleFields = useMemo(
    () => (value.styleModel ? fieldsForModel(value.styleModel) : []),
    [value.styleModel],
  );

  const previousStyleModel = useRef(value.styleModel);
  useEffect(() => {
    if (previousStyleModel.current === value.styleModel) return;
    previousStyleModel.current = value.styleModel;
    setValue((v) => ({
      ...v,
      styleParameters: v.styleModel ? defaultParameters(v.styleModel) : {},
    }));
  }, [value.styleModel]);

  const composedPromptLength =
    value.prompt.length + value.referenceSubject.length + PROMPT_SCAFFOLD_LENGTH;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title">
          <Input
            value={value.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Hair Flip Glow"
            required
          />
        </Field>
        <Field label="Slug" hint="Lowercase words joined by hyphens. Becomes /presets/<slug>.">
          <Input
            value={value.slug}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="hair-flip-glow"
            required
          />
        </Field>
      </div>

      <Field label="Tagline" hint="One line on the card — what the preset does to your image.">
        <Input
          value={value.tagline}
          onChange={(e) => set("tagline", e.target.value)}
          placeholder="Your portrait turns to camera and flips their hair in slow motion."
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Category">
          <Select value={value.category} onChange={(e) => set("category", e.target.value)}>
            {PRESET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Badge">
          <Select
            value={value.badge ?? ""}
            onChange={(e) => set("badge", e.target.value === "New" ? "New" : null)}
          >
            <option value="">None</option>
            <option value="New">New</option>
          </Select>
        </Field>
        <Field label="Sort order" hint="Ascending. Ties fall back to creation date.">
          <Input
            type="number"
            value={value.sortOrder}
            onChange={(e) => set("sortOrder", Number(e.target.value) || 0)}
            min={0}
          />
        </Field>
      </div>

      <PreviewUrlField
        value={value.previewUrl}
        playbackUrl={previewPlaybackUrl}
        onChange={(next) => {
          set("previewUrl", next.url);
          setPreviewPlaybackUrl(next.playbackUrl);
        }}
      />

      <Field label="Model" hint="Any video model in the catalogue. Changing it rebuilds the parameters below.">
        <Select value={value.model} onChange={(e) => set("model", e.target.value)}>
          {MODEL_OPTIONS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </Select>
      </Field>

      <div className="rounded-xl border border-line bg-surface-3 p-4">
        <p className="mb-3 text-label font-medium text-ink-soft">
          {MODEL_OPTIONS.find((m) => m.id === value.model)?.label ?? value.model} parameters
        </p>
        {fields.length === 0 ? (
          <p className="text-caption text-muted">This model exposes no adjustable parameters.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <ParameterField
                key={field.key}
                field={field}
                value={value.parameters[field.key]}
                onChange={(next) =>
                  set("parameters", { ...value.parameters, [field.key]: next })
                }
              />
            ))}
          </div>
        )}
      </div>

      <Field
        label="Reference subject"
        hint="What the uploaded image IS, phrased for the model. Completes “@image = ___”."
      >
        <Input
          value={value.referenceSubject}
          onChange={(e) => set("referenceSubject", e.target.value)}
          placeholder="the person this video is of"
          required
        />
      </Field>

      <Field
        label="Recipe"
        hint={`The locked prompt. Never shown to users. With the @image line prepended this will send ${composedPromptLength} of ${PROMPT_MAX_LENGTH} characters.`}
      >
        <Textarea
          value={value.prompt}
          onChange={(e) => set("prompt", e.target.value)}
          rows={10}
          className="font-mono text-caption"
          required
        />
      </Field>

      <div className="rounded-xl border border-line bg-surface-3 p-4">
        <p className="text-label font-medium text-ink-soft">Character stage (optional)</p>
        <p className="mt-1 mb-3 text-caption text-muted">
          Runs an image model over the upload before the video model sees it. Use it when the
          recipe should produce a drawn, rendered or otherwise synthetic character — that is
          what lets a portrait recipe run on a video model that refuses photographs of real
          people. An instruction that just reproduces the photo clears neither the provider&apos;s
          detector nor its terms, so write a real transformation.
        </p>

        <div className="space-y-4">
          <Field label="Image model" hint="Only models that can edit a supplied image are listed.">
            <Select
              value={value.styleModel ?? ""}
              onChange={(e) => set("styleModel", e.target.value || null)}
            >
              <option value="">None — animate the photo directly</option>
              {STYLE_MODEL_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>

          {value.styleModel && (
            <>
              <Field
                label="Conversion instruction"
                hint="What the upload becomes. Never shown to the user."
              >
                <Textarea
                  value={value.stylePrompt ?? ""}
                  onChange={(e) => set("stylePrompt", e.target.value || null)}
                  rows={4}
                  className="font-mono text-caption"
                  placeholder="Redraw the subject as a cel-shaded anime character, keeping their hairstyle, outfit and colouring recognisable. Flat illustrated shading, clean linework, plainly a drawing rather than a photograph."
                />
              </Field>

              {styleFields.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {styleFields.map((field) => (
                    <ParameterField
                      key={field.key}
                      field={field}
                      value={value.styleParameters[field.key]}
                      onChange={(next) =>
                        set("styleParameters", { ...value.styleParameters, [field.key]: next })
                      }
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <ToggleField
          label="Requires an image"
          hint="Off only for a recipe that works from the prompt alone."
          checked={value.requiresImage}
          onChange={(next) => set("requiresImage", next)}
        />
        <ToggleField
          label="Published"
          hint="Unpublished presets stay editable here but invisible to users."
          checked={value.published}
          onChange={(next) => set("published", next)}
        />
      </div>

      {error && <FieldError>{error}</FieldError>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** Length of the fixed scaffolding buildPresetPrompt wraps around the recipe
 *  ("@image = " + the instruction sentence + the newline), so the character
 *  counter above reflects what actually goes on the wire. Keep in step with
 *  buildPresetPrompt in the backend's lib/presets.ts. */
const PROMPT_SCAFFOLD_LENGTH = 285;

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-caption text-muted">{hint}</p>}
    </div>
  );
}

function ToggleField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Switch checked={checked} onCheckedChange={onChange} />
        <Label className="mb-0">{label}</Label>
      </div>
      <p className="max-w-xs text-caption text-muted">{hint}</p>
    </div>
  );
}

function ParameterField({
  field,
  value,
  onChange,
}: {
  field: DynamicField;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  if (field.type === "switch") {
    return (
      <div className="flex items-center gap-2 pt-6">
        <Switch checked={Boolean(value)} onCheckedChange={onChange} />
        <Label className="mb-0">{field.label}</Label>
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <Field label={field.label} hint={field.helperText}>
        <Select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </Field>
    );
  }

  if (field.type === "number") {
    return (
      <Field label={field.label} hint={field.helperText}>
        <Input
          type="number"
          value={value === undefined || value === null ? "" : String(value)}
          min={field.min}
          max={field.max}
          // Empty clears the key entirely rather than sending NaN — an
          // optional numeric parameter (a seed) has to be omittable.
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        />
      </Field>
    );
  }

  return (
    <Field label={field.label} hint={field.helperText}>
      <Input
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
      />
    </Field>
  );
}

/** The scheme the backend stores a bucket object under (lib/r2.ts). Such a
 *  value is a reference, not a URL — no element can load it. */
const R2_KEY_SCHEME = "r2://";

/**
 * The preview clip: upload one into the bucket, or paste a URL you host
 * elsewhere.
 *
 * Upload goes through the same /api/upload endpoint the app uses for
 * reference images — it accepts MP4/MOV up to 50MB and accepts an admin
 * session as well as a user one, so an operator doesn't have to also be
 * signed in as a customer to add a clip.
 *
 * What it keeps from that response is `ref` (`r2://<key>`), NOT the endpoint's
 * own proxy URL. The proxy streams the object back through the edge function,
 * which cuts the response off after a few KB — every preset stored that way
 * showed a dead player in the gallery. The bucket URL the server signs on
 * read comes straight from R2, with the Range support `<video>` wants.
 *
 * That reference can't be played by a `<video>`, so the signed URL rides
 * alongside it for the thumbnail below and travels no further.
 */
function PreviewUrlField({
  value,
  playbackUrl,
  onChange,
}: {
  value: string;
  playbackUrl: string | null;
  onChange: (next: { url: string; playbackUrl: string | null }) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Upload failed.");
      onChange({ url: json.ref ?? json.url, playbackUrl: json.playbackUrl ?? json.url ?? null });
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const storedInBucket = value.startsWith(R2_KEY_SCHEME);
  // A pasted URL plays as itself; an uploaded one only through its signature.
  const previewSrc = playbackUrl ?? (storedInBucket ? null : value || null);

  return (
    <div className="space-y-1.5">
      <Label>Preview video</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange({ url: e.target.value, playbackUrl: null })}
          placeholder="https://your-bucket.r2.dev/clip.mp4"
          required
        />
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="size-4" aria-hidden="true" />
          )}
          Upload
        </Button>
      </div>
      <p className="text-caption text-muted">
        Upload an MP4/MOV (max 50MB) to store it in the bucket, or paste a URL you host elsewhere.
        The clip shows the kind of shot the preset aims for — the gallery says so, so it does not
        have to be this preset&apos;s own output.
      </p>
      {storedInBucket && (
        <p className="text-caption text-muted">
          Stored in the bucket. The gallery streams it from there through a signed link, so this
          reference is what gets saved — leave it as is.
        </p>
      )}
      {uploadError && <FieldError>{uploadError}</FieldError>}
      {previewSrc && (
        <video
          key={previewSrc}
          src={previewSrc}
          className="mt-2 aspect-video w-48 rounded-lg border border-line object-cover"
          muted
          loop
          playsInline
          autoPlay
        />
      )}
    </div>
  );
}
