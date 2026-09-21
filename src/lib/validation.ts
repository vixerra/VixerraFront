// DUPLIQUÉ dans aiVideo-backend/src/lib/validation.ts — garder synchronisé.
import { z } from "zod";
import {
  VIDEO_MODELS,
  IMAGE_MODELS,
  VIDEO_DURATIONS,
  VIDEO_RESOLUTIONS,
  VIDEO_FPS,
  VIDEO_ASPECT_RATIOS,
  IMAGE_RESOLUTIONS,
  IMAGE_ASPECT_RATIOS,
  IMAGE_STYLE_PRESETS,
  MOTION_INTENSITIES,
  CAMERA_MOVEMENTS,
  PROMPT_MAX_LENGTH,
  SEEDANCE_DURATION_MIN,
  SEEDANCE_DURATION_MAX,
  SEEDANCE_DURATION_AUTO,
  SEEDANCE_RESOLUTIONS,
  SEEDANCE_ASPECT_RATIOS,
  SEEDANCE_OUTPUT_FORMATS,
  SEEDANCE_REFERENCE_IMAGES_MAX,
  SEEDANCE_REFERENCE_VIDEOS_MAX,
  SEEDANCE_REFERENCE_AUDIOS_MAX,
  SEEDANCE2_DURATION_MIN,
  SEEDANCE2_DURATION_MAX,
  SEEDANCE2_RESOLUTIONS,
  SEEDANCE2_ASPECT_RATIOS,
  SEEDANCE2_REFERENCE_IMAGES_MAX,
} from "@/lib/constants";
import { referenceImageSlots, type CloudflareModelConfig } from "@/lib/cloudflare-models";

const videoModelIds = VIDEO_MODELS.map((m) => m.id) as [string, ...string[]];
const imageModelIds = IMAGE_MODELS.map((m) => m.id) as [string, ...string[]];

const oneOf = <T extends number>(values: readonly T[], label: string) =>
  z.number().refine((v) => (values as readonly number[]).includes(v), {
    error: `Unsupported ${label}.`,
  });

export const registerSchema = z.object({
  name: z.string().trim().min(2, { error: "Name must be at least 2 characters." }).max(100),
  email: z.email({ error: "Enter a valid email address." }).trim().toLowerCase(),
  password: z
    .string()
    .min(8, { error: "Use at least 8 characters." })
    .regex(/[a-zA-Z]/, { error: "Include at least one letter." })
    .regex(/[0-9]/, { error: "Include at least one number." }),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }).trim().toLowerCase(),
  password: z.string().min(1, { error: "Password is required." }),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  avatarUrl: z.union([z.url(), z.literal("")]).optional(),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, { error: "Use at least 8 characters." })
    .regex(/[a-zA-Z]/, { error: "Include at least one letter." })
    .regex(/[0-9]/, { error: "Include at least one number." }),
});
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

export const apiKeyCreateSchema = z.object({
  name: z.string().trim().min(1).max(60),
});

export const collectionCreateSchema = z.object({
  name: z.string().trim().min(1, { error: "Name is required." }).max(100),
  description: z.string().trim().max(500).optional(),
});

export const collectionUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  isPublic: z.boolean().optional(),
});

export const collectionAddItemsSchema = z.object({
  generationIds: z.array(z.string()).min(1),
});

export const textToVideoSchema = z.object({
  prompt: z.string().trim().min(10, { error: "Prompt must be at least 10 characters." }).max(1000),
  model: z.enum(videoModelIds),
  duration: oneOf(VIDEO_DURATIONS, "duration"),
  resolution: z.enum(VIDEO_RESOLUTIONS),
  aspectRatio: z.enum(VIDEO_ASPECT_RATIOS),
  fps: oneOf(VIDEO_FPS, "frame rate").default(24),
  seed: z.number().int().optional(),
});
export type TextToVideoInput = z.infer<typeof textToVideoSchema>;

// Seedance 2.5's own parameter set — confirmed via Cloudflare's input JSON
// schema, deliberately separate from textToVideoSchema above since the
// allowed values (and even which fields exist) genuinely differ.
// fps and camera_fixed aren't included: both are effectively constants for
// this model (fps is a literal 24; camera_fixed is documented as "not
// currently supported by the provider, has no effect"), so there's nothing
// for the user to choose — the server fills them in when calling Cloudflare.
export const seedanceVideoSchema = z
  .object({
    prompt: z.string().trim().max(PROMPT_MAX_LENGTH).optional(),
    image: z.string().min(1).optional(),
    lastFrameImage: z.string().min(1).optional(),
    // The three multimodal reference lists. Unlike 2.0's single
    // referenceVideo, none of these are exclusive with image/lastFrameImage:
    // the provider documents them as guiding "multimodal video generation,
    // editing, or extension", i.e. they travel alongside whatever frame
    // references are set.
    //
    // An empty array is accepted here but never stored or sent as one: the
    // composer sends undefined, the API normalises [] to absent when storing,
    // and drops an empty list again before building the provider payload.
    // Absent is what the provider wants — [] is a different statement.
    referenceImages: z
      .array(z.string().min(1))
      .max(SEEDANCE_REFERENCE_IMAGES_MAX, {
        error: `Up to ${SEEDANCE_REFERENCE_IMAGES_MAX} reference images.`,
      })
      .optional(),
    // Total duration across the list is capped at
    // SEEDANCE_REFERENCE_MEDIA_MAX_SECONDS by the provider. Not checkable
    // here — the API has no video toolchain — so this composer measures
    // each file as it's picked. Only the count is enforced server-side.
    referenceVideos: z
      .array(z.string().min(1))
      .max(SEEDANCE_REFERENCE_VIDEOS_MAX, {
        error: `Up to ${SEEDANCE_REFERENCE_VIDEOS_MAX} reference videos.`,
      })
      .optional(),
    referenceAudios: z
      .array(z.string().min(1))
      .max(SEEDANCE_REFERENCE_AUDIOS_MAX, {
        error: `Up to ${SEEDANCE_REFERENCE_AUDIOS_MAX} reference audio clips.`,
      })
      .optional(),
    duration: z
      .number()
      .refine(
        (v) => v === SEEDANCE_DURATION_AUTO || (Number.isInteger(v) && v >= SEEDANCE_DURATION_MIN && v <= SEEDANCE_DURATION_MAX),
        { error: `Duration must be ${SEEDANCE_DURATION_MIN}-${SEEDANCE_DURATION_MAX}s, or -1 for automatic.` },
      )
      .default(5),
    resolution: z.enum(SEEDANCE_RESOLUTIONS).default("720p"),
    aspectRatio: z.enum(SEEDANCE_ASPECT_RATIOS).default("adaptive"),
    generateAudio: z.boolean().default(true),
    watermark: z.boolean().default(false),
    // False since 2026-09-21, and matching the API's own copy: 2.5's provider
    // has no use_virtual_avatar field any more. The refine at the bottom
    // explains what that costs.
    useVirtualAvatar: z.boolean().default(false),
    outputFormat: z.enum(SEEDANCE_OUTPUT_FORMATS).default("mp4"),
    seed: z.number().int().min(-9007199254740991).max(9007199254740991).optional(),
  })
  // A prompt is optional as soon as ANY reference is attached — 2.5 accepts
  // audio-only input, with no image and no video, which is why the audio
  // list counts here too.
  .refine(
    (data) =>
      Boolean(data.prompt?.trim()) ||
      Boolean(data.image) ||
      Boolean(data.referenceImages?.length) ||
      Boolean(data.referenceVideos?.length) ||
      Boolean(data.referenceAudios?.length),
    {
      error: "Add a prompt, or a reference image, video or audio clip.",
      path: ["prompt"],
    },
  )
  .refine((data) => !data.lastFrameImage || Boolean(data.image), {
    error: "Add a start frame before setting an end frame.",
    path: ["lastFrameImage"],
  })
  // Everything below follows one fact: since 2026-09-21 every Seedance 2.5
  // request runs on kie.ai, at every resolution (see usesKieAi in
  // aiVideo-backend's generation-runner.ts — Cloudflare's single blocking
  // call couldn't outlive an Edge Function invocation). These rules describe
  // kie.ai's schema, so they must keep matching that routing.
  //
  // The reference lists are no longer refused at 1080p: kie.ai documents all
  // three for this model (docs.kie.ai/market/bytedance/seedance-2-5, read
  // 2026-09-21), and 1080p reference runs are the thing that rule used to
  // cost us. What it documents instead is that the three input modes —
  // first frame, first-and-last frame, multimodal reference — cannot be
  // combined. Cloudflare's integration took a frame and a list together, so
  // this exclusivity is new, and refusing it here keeps it a free error at
  // submit time instead of a billed run that ignored half its input.
  .refine(
    (data) =>
      !(data.image || data.lastFrameImage) ||
      !(
        data.referenceImages?.length ||
        data.referenceVideos?.length ||
        data.referenceAudios?.length
      ),
    {
      error:
        "Seedance 2.5 takes either start/end frames or reference files, not both. Remove one of the two.",
      path: ["referenceImages"],
    },
  )
  // Three switches Cloudflare's shape carried that kie.ai's has no field
  // for. Refused rather than dropped on the way to the provider: a run
  // billed for a watermark it didn't apply is the failure mode this file
  // exists to prevent. The composer stopped sending all three for 2.5 the
  // same day — see seedance-video-form.tsx.
  .refine((data) => !data.watermark, {
    error: "Seedance 2.5 can't watermark on its current provider. Turn the watermark off.",
    path: ["watermark"],
  })
  // The escape hatch for AI-generated characters that ByteDance's face
  // detector reads as real people — gone with the move, so a reference set
  // that trips the detector now has no way past it on 2.5. It is why this
  // field defaulted to true here (FORCED_ON_FIELD_KEYS in composer-fields.ts
  // pins it on wherever it still exists); on 2.5 it defaults to false now
  // because the provider has nowhere to put it.
  .refine((data) => !data.useVirtualAvatar, {
    error:
      "Virtual avatar isn't available on Seedance 2.5's current provider. Turn it off, or use Seedance 2.0.",
    path: ["useVirtualAvatar"],
  })
  .refine((data) => data.seed === undefined, {
    error: "Seedance 2.5 doesn't take a seed on its current provider. Remove it, or use Seedance 2.0.",
    path: ["seed"],
  });
export type SeedanceVideoInput = z.infer<typeof seedanceVideoSchema>;

// Seedance 2.0's own parameter set — see SEEDANCE2_* in constants.ts for why
// this is a separate schema rather than reusing seedanceVideoSchema: no -1
// "auto" duration, a different resolution/aspect-ratio enum, a real
// cameraFixed toggle, and no outputFormat choice.
export const seedance2VideoSchema = z
  .object({
    prompt: z.string().trim().max(PROMPT_MAX_LENGTH).optional(),
    image: z.string().min(1).optional(),
    lastFrameImage: z.string().min(1).optional(),
    // Motion/style source — the clip the generation is conditioned on. The
    // provider bills this mode off its own, higher per-second table (see
    // estimateVideoCredits' hasReferenceVideo), and the model reads a video
    // reference in place of a frame reference rather than alongside one, so
    // it is exclusive with image/lastFrameImage instead of combinable.
    referenceVideo: z.string().min(1).optional(),
    // Subject references — the people or objects that must stay recognisable
    // across the clip. Additive: they combine with any of the media inputs
    // above, since they answer "who appears", not "what the shot looks like".
    referenceImages: z
      .array(z.string().min(1))
      .max(SEEDANCE2_REFERENCE_IMAGES_MAX, {
        error: `Up to ${SEEDANCE2_REFERENCE_IMAGES_MAX} character references.`,
      })
      .optional(),
    duration: z
      .number()
      .int()
      .min(SEEDANCE2_DURATION_MIN, {
        error: `Duration must be ${SEEDANCE2_DURATION_MIN}-${SEEDANCE2_DURATION_MAX}s.`,
      })
      .max(SEEDANCE2_DURATION_MAX, {
        error: `Duration must be ${SEEDANCE2_DURATION_MIN}-${SEEDANCE2_DURATION_MAX}s.`,
      })
      .default(5),
    resolution: z.enum(SEEDANCE2_RESOLUTIONS).default("720p"),
    aspectRatio: z.enum(SEEDANCE2_ASPECT_RATIOS).default("16:9"),
    cameraFixed: z.boolean().default(false),
    generateAudio: z.boolean().default(true),
    watermark: z.boolean().default(false),
    useVirtualAvatar: z.boolean().default(true),
    seed: z.number().int().min(-9007199254740991).max(9007199254740991).optional(),
  })
  .refine(
    (data) => Boolean(data.prompt?.trim()) || Boolean(data.image) || Boolean(data.referenceVideo),
    { error: "Add a prompt, a reference image or a reference video.", path: ["prompt"] },
  )
  .refine((data) => !data.lastFrameImage || Boolean(data.image), {
    error: "Add a start frame before setting an end frame.",
    path: ["lastFrameImage"],
  })
  .refine((data) => !data.referenceVideo || (!data.image && !data.lastFrameImage), {
    error: "A reference video can't be combined with a reference image or keyframes.",
    path: ["referenceVideo"],
  });
export type Seedance2VideoInput = z.infer<typeof seedance2VideoSchema>;

export const imageToVideoSchema = z.object({
  imageUrl: z.string().min(1, { error: "An uploaded image is required." }),
  prompt: z.string().trim().max(500).optional().default(""),
  model: z.enum(videoModelIds),
  duration: oneOf(VIDEO_DURATIONS, "duration"),
  resolution: z.enum(VIDEO_RESOLUTIONS),
  motionIntensity: z.enum(MOTION_INTENSITIES).default("medium"),
  cameraMovement: z.enum(CAMERA_MOVEMENTS).default("subtle"),
  seed: z.number().int().optional(),
});
export type ImageToVideoInput = z.infer<typeof imageToVideoSchema>;

export const textToImageSchema = z.object({
  prompt: z.string().trim().min(5, { error: "Prompt must be at least 5 characters." }).max(500),
  negativePrompt: z.string().trim().max(500).optional(),
  model: z.enum(imageModelIds),
  resolution: z.enum(IMAGE_RESOLUTIONS),
  aspectRatio: z.enum(IMAGE_ASPECT_RATIOS),
  style: z.enum(IMAGE_STYLE_PRESETS).optional(),
  seed: z.number().int().optional(),
});
export type TextToImageInput = z.infer<typeof textToImageSchema>;

// Builds a Zod schema from a CloudflareModelConfig (see cloudflare-models.ts)
// — used by both the dynamic generation form and the API routes for the
// generic-registry live models (Recraft, Leonardo, xAI, Stability, the
// non-Seedance ByteDance/Alibaba/FLUX video models, etc). One schema per
// request instead of one hand-written schema per model, since that pattern
// doesn't scale to a 15+ model catalog with this much parameter variance.
export function buildDynamicSchema(config: CloudflareModelConfig) {
  const shape: Record<string, z.ZodTypeAny> = {
    prompt: config.promptRequired
      ? z.string().trim().min(1, { error: "Prompt is required." }).max(PROMPT_MAX_LENGTH)
      : z.string().trim().max(PROMPT_MAX_LENGTH).optional(),
  };

  if (config.image !== "none") {
    shape.image =
      config.image === "required"
        ? z.string().min(1, { error: "A reference image is required." })
        : z.string().min(1).optional();
    // A closing frame and extra references, for the entries that say where
    // they go on the wire (lastFrameCfParam, referenceImages).
    if (config.lastFrameCfParam) shape.lastFrameImage = z.string().min(1).optional();
    const slots = referenceImageSlots(config);
    if (slots > 0) {
      const shared = config.referenceImages?.cfParam === config.imageCfParam;
      shape.referenceImages = z
        .array(z.string().min(1))
        .max(slots, { error: shared ? `Up to ${slots} more images.` : `Up to ${slots} reference images.` })
        .optional();
    }
  }

  for (const field of config.fields) {
    let base: z.ZodTypeAny;
    switch (field.type) {
      case "number": {
        let n = z.number();
        if (field.min !== undefined) n = n.min(field.min);
        if (field.max !== undefined) n = n.max(field.max);
        base = n;
        break;
      }
      case "switch":
        base = z.boolean();
        break;
      case "select":
        base = z.enum(field.options as [string, ...string[]]);
        break;
      default:
        base = z.string().trim();
    }
    shape[field.key] =
      field.defaultValue !== undefined ? base.default(field.defaultValue as never) : base.optional();
  }

  // The pairing rules, refused here so they fail for free at submit rather
  // than at execution, after billing — as the Seedance schemas do.
  const refs = config.referenceImages;
  const blockedAt = refs?.unavailableWhen;
  const hasReferences = (data: Record<string, unknown>) =>
    Array.isArray(data.referenceImages) && data.referenceImages.length > 0;
  return z
    .object(shape)
    .refine((data) => !data.lastFrameImage || Boolean(data.image), {
      error: "Add a start frame before setting an end frame.",
      path: ["lastFrameImage"],
    })
    .refine(
      (data) =>
        !hasReferences(data) ||
        (refs?.exclusiveWithFrames ? !data.image && !data.lastFrameImage : Boolean(data.image)),
      {
        error: refs?.exclusiveWithFrames
          ? "Use reference images or a first/last frame, not both."
          : "Add the main image before adding more.",
        path: ["referenceImages"],
      },
    )
    .refine(
      (data) =>
        !hasReferences(data) ||
        !blockedAt ||
        !Object.entries(blockedAt).every(([key, value]) => data[key] === value),
      {
        error: `Only one image is allowed at ${Object.values(blockedAt ?? {}).join(", ")}.`,
        path: ["referenceImages"],
      },
    );
}
export type DynamicModelInput = Record<string, unknown>;
