"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Package, Plus, Scissors, Trash2, Upload, User } from "lucide-react";
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
import {
  PRESET_CAST_MAX,
  PRESET_CATEGORIES,
  PRESET_REPLACE_MODEL_ID,
  PRESET_REPLACE_RESOLUTIONS,
  presetCast,
  type PresetCastKind,
  type PresetCastSlot,
} from "@/lib/viral-presets";
import { fetchVideoFile } from "@/lib/video-library";
import { measureMediaDuration } from "@/lib/media-duration";
import { VideoEditModal } from "@/components/video-library/video-edit-modal";
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
    // No virtual-avatar switch on 2.5 since 2026-09-21: the model moved to
    // kie.ai, whose schema has no use_virtual_avatar, so a preset setting it
    // would store a field the runner cannot send. 2.0 below lost it the same
    // way on 2026-10-08, along with its camera lock and watermark.
    { key: "outputFormat", cfParam: "output_format", label: "Output format", type: "select", options: [...SEEDANCE_OUTPUT_FORMATS], defaultValue: "mp4" },
  ],
  [SEEDANCE2_MODEL_ID]: [
    { key: "duration", cfParam: "duration", label: "Duration", type: "number", defaultValue: 5, min: 4, max: 12, helperText: "seconds" },
    { key: "resolution", cfParam: "resolution", label: "Resolution", type: "select", options: [...SEEDANCE2_RESOLUTIONS], defaultValue: "720p" },
    { key: "aspectRatio", cfParam: "aspect_ratio", label: "Aspect ratio", type: "select", options: [...SEEDANCE2_ASPECT_RATIOS], defaultValue: "16:9" },
    { key: "generateAudio", cfParam: "generate_audio", label: "Generate audio", type: "switch", defaultValue: true },
  ],
};

/** A replace preset's only setting. Duration isn't one: the output runs as
 *  long as the reference clip, which the server measures on save. Mirrors
 *  replaceParametersSchema in the backend's lib/presets.ts. */
const REPLACE_FIELDS: DynamicField[] = [
  { key: "resolution", cfParam: "resolution", label: "Resolution", type: "select", options: [...PRESET_REPLACE_RESOLUTIONS], defaultValue: "720p" },
];

/** Every model a preset may name: the replace model, the two Seedance ids
 *  plus every video model in the registry. Image models are excluded — the
 *  studio renders a video player, and the backend refuses them for the same
 *  reason. */
const MODEL_OPTIONS = [
  { id: PRESET_REPLACE_MODEL_ID, label: "Wan 3.0 — put the user into a clip (Alibaba)" },
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
  if (modelId === PRESET_REPLACE_MODEL_ID) return REPLACE_FIELDS;
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
  // New presets start as replace presets, the way the catalogue is meant to
  // go: the user's photo put into a clip rather than a photo brought to life.
  model: PRESET_REPLACE_MODEL_ID,
  parameters: defaultParameters(PRESET_REPLACE_MODEL_ID),
  styleModel: null,
  stylePrompt: null,
  styleParameters: {},
  referenceVideoUrl: null,
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
          referenceVideoUrl: initial.referenceVideoUrl ?? null,
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
  const [referencePlaybackUrl, setReferencePlaybackUrl] = useState<string | null>(
    initial?.referenceVideoPlaybackUrl ?? null,
  );

  const set = <K extends keyof AdminPresetInput>(key: K, next: AdminPresetInput[K]) =>
    setValue((v) => ({ ...v, [key]: next }));

  const replace = value.model === PRESET_REPLACE_MODEL_ID;
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
      // The cast isn't a model field, so it is carried by hand, and only to
      // the model that reads it.
      if (v.model === PRESET_REPLACE_MODEL_ID && v.parameters.cast) next.cast = v.parameters.cast;
      // A replace preset has nothing to swap in without the user's photo.
      const requiresImage = v.model === PRESET_REPLACE_MODEL_ID ? true : v.requiresImage;
      return { ...v, parameters: next, requiresImage };
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

  const cast = presetCast(value.parameters);
  const setCast = (next: PresetCastSlot[]) => set("parameters", { ...value.parameters, cast: next });
  const plainCast = cast.length === 1 && cast[0].kind === "person" && !cast[0].target;

  const direction = value.prompt.trim();
  const composedPromptLength = replace
    ? plainCast
      ? REPLACE_SCAFFOLD_LENGTH + (direction ? REPLACE_DIRECTION_PREFIX_LENGTH + direction.length : 0)
      : castPromptLength(cast, direction)
    : value.prompt.length + value.referenceSubject.length + PROMPT_SCAFFOLD_LENGTH;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        // Kept in state across a model switch so switching back doesn't lose
        // the upload, but only a replace preset sends one (the server would
        // drop it anyway).
        onSubmit({ ...value, referenceVideoUrl: replace ? value.referenceVideoUrl : null });
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
        <Field label="Sort order" hint="No longer used: the gallery shows the newest presets first.">
          <Input
            type="number"
            value={value.sortOrder}
            onChange={(e) => set("sortOrder", Number(e.target.value) || 0)}
            min={0}
          />
        </Field>
      </div>

      <VideoUrlField
        label="Preview video"
        value={value.previewUrl}
        playbackUrl={previewPlaybackUrl}
        onChange={(next) => {
          set("previewUrl", next.url);
          setPreviewPlaybackUrl(next.playbackUrl);
        }}
        trimmable
        hint={
          <>
            Upload an MP4/MOV (max 50MB) to store it in the bucket, or paste a URL you host
            elsewhere. The clip shows the kind of shot the preset aims for — the gallery says so,
            so it does not have to be this preset&apos;s own output.
          </>
        }
      />

      <Field
        label="Model"
        hint={
          replace
            ? "Wan 3.0 swaps the person in the user's photo into the reference video below, keeping the clip's scene, camera and movement."
            : "Any video model in the catalogue. Changing it rebuilds the parameters below."
        }
      >
        <Select value={value.model} onChange={(e) => set("model", e.target.value)}>
          {MODEL_OPTIONS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </Select>
      </Field>

      {replace && (
        <VideoUrlField
          label="Reference video"
          value={value.referenceVideoUrl ?? ""}
          playbackUrl={referencePlaybackUrl}
          onChange={(next) => {
            set("referenceVideoUrl", next.url || null);
            setReferencePlaybackUrl(next.playbackUrl);
          }}
          // The usual case: the clip on the card is the clip people want to
          // be in. Only a stored or absolute URL can be reused — kie.ai
          // fetches this one, and a path on our own site means nothing to it.
          copyFrom={
            value.previewUrl.startsWith(R2_KEY_SCHEME) || /^https?:\/\//i.test(value.previewUrl)
              ? { label: "Use preview video", url: value.previewUrl, playbackUrl: previewPlaybackUrl }
              : undefined
          }
          trimmable
          minSeconds={REPLACE_MIN_SECONDS}
          maxSeconds={REPLACE_MAX_SECONDS}
          hint={
            <>
              The clip whose people or products are replaced by the user&apos;s uploads.
              MP4/MOV, {REPLACE_MIN_SECONDS}–{REPLACE_MAX_SECONDS}s, max 50MB. A longer clip opens
              the trimmer: keep the stretch you want. It is measured when you save: its length is
              the output&apos;s length and sets the price. Its sound is kept on the result.
            </>
          }
        />
      )}

      {replace && (
        <CastEditor cast={cast} onChange={setCast} />
      )}

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

      {/* A replace preset's photo is always "the person going in", which
          the swap instruction already says. */}
      {!replace && (
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
      )}

      {replace ? (
        <Field
          label="Extra direction (optional)"
          hint={`Added after the built-in swap instruction ("replace the person in the clip with the person in the photo, keep everything else"). Never shown to users. This will send ${composedPromptLength} of ${PROMPT_MAX_LENGTH} characters.`}
        >
          <Textarea
            value={value.prompt}
            onChange={(e) => set("prompt", e.target.value)}
            rows={4}
            className="font-mono text-caption"
            placeholder="Video 1 shows the same person twice — replace both. / Dress them in the outfit from Image 1 instead."
          />
        </Field>
      ) : (
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
      )}

      <div className="rounded-xl border border-line bg-surface-3 p-4">
        <p className="text-label font-medium text-ink-soft">Character stage (optional)</p>
        {replace && cast.length > 1 && (
          <p className="mt-1 text-caption text-warning">
            Not available with a cast of several: the stage redraws one photo. Saving with both
            is refused.
          </p>
        )}
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
        {!replace && (
          <ToggleField
            label="Requires an image"
            hint="Off only for a recipe that works from the prompt alone."
            checked={value.requiresImage}
            onChange={(next) => set("requiresImage", next)}
          />
        )}
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

/** The same for a replace preset: buildReplacePrompt's "photo" instruction
 *  (backend lib/influencer-motion.ts), and the " Additional direction: "
 *  it puts before an operator's direction. Keep in step with it. */
const REPLACE_SCAFFOLD_LENGTH = 756;
const REPLACE_DIRECTION_PREFIX_LENGTH = 23;

/** Wan 3.0's clip limits for a replace preset (backend lib/presets.ts,
 *  measurePresetReferenceClip). */
const REPLACE_MIN_SECONDS = 3;
const REPLACE_MAX_SECONDS = 15;

/** The prompt a cast of several (or a product) sends, measured for the
 *  counter. A copy of buildCastReplacePrompt in the backend's
 *  lib/presets.ts: keep the sentences in step with it. */
function castPromptLength(cast: PresetCastSlot[], direction: string): number {
  const ordinals = ["first", "second", "third", "fourth"];
  const people = cast.filter((s) => s.kind === "person").length;
  const products = cast.length - people;
  let person = 0;
  let product = 0;
  const lines = cast.map((slot, i) => {
    const image = `@Image${i + 1} (Image ${i + 1})`;
    if (slot.kind === "person") {
      const nth = ordinals[person++] ?? "next";
      const target =
        slot.target ||
        (people > 1 ? `the ${nth} person (counting from the left at the start of the clip)` : "the main person");
      return `${image} replaces ${target}. It is a photo of one person: take their face, facial features, hair, skin tone and body shape exactly as shown, identical in every frame, and keep the outfit and accessories that person wears in Video 1.`;
    }
    const nth = ordinals[product++] ?? "next";
    const target = slot.target || (products > 1 ? `the ${nth} product shown` : "the product shown");
    return `${image} replaces ${target}. It is a product: reproduce it exactly, its shape, proportions, colors, materials, label, logo and printed text, at the size, position and angle the original has in every frame, held and handled exactly the same way.`;
  });
  const base = [
    "Video editing: in @Video1 (Video 1), replace each of the following with its reference image, one for one.",
    ...lines,
    "Keep everything else from Video 1 unchanged: the background, location, props, lighting, camera angle, framing and camera movement, and every person's body movement, gestures, head turns, expressions and timing.",
    "Each replacement sits naturally in the scene, lit by its light, with realistic shadows and contact. Anyone and anything not listed above stays exactly as it is. Photorealistic, no flicker, no face morphing, text and logos stay sharp and legible.",
  ].join(" ");
  return direction ? base.length + REPLACE_DIRECTION_PREFIX_LENGTH + direction.length : base.length;
}

const PERSON_TARGET_EXAMPLES = ["the woman on the left", "the man on the right", "the person in the back"];

/** One-click starting points for the common casts. */
const CAST_TEMPLATES: { label: string; cast: PresetCastSlot[] }[] = [
  { label: "1 person", cast: [{ kind: "person", label: "You", target: "" }] },
  {
    label: "Person + product",
    cast: [
      { kind: "person", label: "You", target: "" },
      { kind: "product", label: "Your product", target: "" },
    ],
  },
  { label: "Product only", cast: [{ kind: "product", label: "Your product", target: "" }] },
  {
    label: "2 people",
    cast: [
      { kind: "person", label: "Person 1", target: "the person on the left" },
      { kind: "person", label: "Person 2", target: "the person on the right" },
    ],
  },
];

/**
 * What a replace preset asks the user to upload, one slot per person or
 * product it replaces in the clip. Saved as `parameters.cast`; the uploads
 * reach the model as Image 1, Image 2... in this order.
 */
function CastEditor({ cast, onChange }: { cast: PresetCastSlot[]; onChange: (next: PresetCastSlot[]) => void }) {
  const update = (i: number, patch: Partial<PresetCastSlot>) =>
    onChange(cast.map((slot, j) => (j === i ? { ...slot, ...patch } : slot)));

  return (
    <div className="rounded-xl border border-line bg-surface-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-label font-medium text-ink-soft">Cast: what the user uploads</p>
          <p className="mt-1 max-w-prose text-caption text-muted">
            One slot per person or product to replace in the reference video. A product ad is a
            person and a product; a duo clip is two people. The label is what the user sees; the
            target tells the model what in the clip that upload replaces and is never shown.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CAST_TEMPLATES.map((t) => (
            <Button key={t.label} type="button" variant="secondary" size="sm" onClick={() => onChange(t.cast)}>
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      <ol className="mt-4 space-y-3">
        {cast.map((slot, i) => (
          <li key={i} className="grid gap-3 rounded-lg border border-line bg-surface-2 p-3 sm:grid-cols-[auto_9rem_1fr_1.4fr_auto] sm:items-end">
            <span className="flex size-9 items-center justify-center rounded-full bg-brand/15 text-caption font-bold text-brand-ink" title={`Image ${i + 1}`}>
              {slot.kind === "product" ? <Package className="size-4" aria-hidden="true" /> : <User className="size-4" aria-hidden="true" />}
              <span className="sr-only">Image {i + 1}</span>
            </span>
            <Field label={`Image ${i + 1} is a`}>
              <Select
                value={slot.kind}
                onChange={(e) => update(i, { kind: e.target.value as PresetCastKind })}
              >
                <option value="person">Person</option>
                <option value="product">Product</option>
              </Select>
            </Field>
            <Field label="Label for users">
              <Input
                value={slot.label}
                maxLength={40}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder={slot.kind === "product" ? "Your product" : "You"}
              />
            </Field>
            <Field label="Replaces (optional)">
              <Input
                value={slot.target ?? ""}
                maxLength={200}
                onChange={(e) => update(i, { target: e.target.value })}
                placeholder={slot.kind === "product" ? "the perfume bottle she holds" : PERSON_TARGET_EXAMPLES[i] ?? "the person in the back"}
              />
            </Field>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove image ${i + 1}`}
              disabled={cast.length === 1}
              onClick={() => onChange(cast.filter((_, j) => j !== i))}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ol>

      {cast.length < PRESET_CAST_MAX && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-3"
          onClick={() => onChange([...cast, { kind: "person", label: `Person ${cast.length + 1}`, target: "" }])}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add a slot
        </Button>
      )}
    </div>
  );
}

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
 * A preset clip — the preview, or a replace preset's reference video:
 * upload one into the bucket, or paste a URL you host elsewhere.
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
 *
 * `copyFrom` adds a button that fills the field from another clip already
 * in the form (the reference video from the preview).
 */
function VideoUrlField({
  label,
  hint,
  value,
  playbackUrl,
  onChange,
  copyFrom,
  trimmable,
  minSeconds,
  maxSeconds,
}: {
  label: string;
  hint: React.ReactNode;
  value: string;
  playbackUrl: string | null;
  onChange: (next: { url: string; playbackUrl: string | null }) => void;
  copyFrom?: { label: string; url: string; playbackUrl: string | null };
  /** Offers the crop-and-trim editor, on upload and on the stored clip. */
  trimmable?: boolean;
  minSeconds?: number;
  maxSeconds?: number;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // The clip open in the editor, and whether it is a new pick (cancelling
  // drops it) or the stored one (cancelling keeps it).
  const [editing, setEditing] = useState<{ file: File; seconds?: number; stored?: boolean } | null>(null);
  const [loadingClip, setLoadingClip] = useState(false);

  /** A picked file goes through the editor when the field trims; one past
   *  the slot's limit has to. */
  async function pick(file: File) {
    if (!trimmable) return void upload(file);
    const seconds = await measureMediaDuration(file);
    setEditing({ file, seconds });
  }

  /** The stored clip, downloaded into the editor. */
  async function trimStored() {
    if (!playbackUrl && !value) return;
    setLoadingClip(true);
    setUploadError(null);
    try {
      const file = await fetchVideoFile(playbackUrl ?? value, "clip.mp4");
      setEditing({ file, seconds: await measureMediaDuration(file), stored: true });
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setLoadingClip(false);
    }
  }

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
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2 sm:flex-nowrap">
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
            if (file) void pick(file);
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
        {trimmable && (playbackUrl || value) && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => void trimStored()}
            disabled={uploading || loadingClip}
          >
            {loadingClip ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Scissors className="size-4" aria-hidden="true" />
            )}
            Trim
          </Button>
        )}
        {copyFrom && copyFrom.url !== value && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => onChange({ url: copyFrom.url, playbackUrl: copyFrom.playbackUrl })}
            disabled={uploading}
          >
            {copyFrom.label}
          </Button>
        )}
      </div>
      <p className="text-caption text-muted">{hint}</p>
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
      {trimmable && (
        <VideoEditModal
          source={editing}
          minSeconds={minSeconds}
          maxSeconds={maxSeconds}
          onCancel={() => setEditing(null)}
          onSkip={() => {
            const source = editing;
            setEditing(null);
            // The stored clip as it is needs no new upload.
            if (source && !source.stored) void upload(source.file);
          }}
          onConfirm={(file) => {
            setEditing(null);
            void upload(file);
          }}
        />
      )}
    </div>
  );
}
