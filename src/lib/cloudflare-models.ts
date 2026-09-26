// Duplicated in aiVideo-backend/supabase/functions/api/lib/cloudflare-models.ts —
// keep both in sync.
// Config-driven registry for the Cloudflare Workers AI models that get a
// *generic* real-API integration (as opposed to the two bespoke Seedance
// 2.5/2.0 forms). Each entry describes a model's tunable fields well enough
// for:
//   - src/components/generate/dynamic-model-form.tsx to render a form
//   - src/lib/validation.ts's buildDynamicSchema() to validate it
//   - src/lib/generation-runner.ts's runCloudflareJob()
//     to build the exact Cloudflare `input` object and extract the result
//
// EVERY id, field name and enum below was verified live against
// POST /accounts/{id}/ai/run on 2026-08-29 by submitting a deliberately
// invalid field, which makes the API answer with the model's real field
// list and enum options without executing (and so without billing) the
// model. Do not "tidy" these values from memory or from docs — re-probe.
//
// The Vidu Q3 pair below are synchronous over /ai/run (they answer with a
// plain { video } URL), unlike the older Vidu endpoints that needed job
// polling — which is why they can live here.
//
// Deliberately excluded: the 6 FLUX.2 models (multipart/form-data + binary
// uploads), the 5 async job-polling models (RunwayML/Vidu/PixVerse), and
// hh1.1-r2v (needs 1-9 reference images, no multi-upload UI yet).
//
// Also excluded because the REST /ai/run endpoint physically cannot return
// their output — both answer `{"result":{}}` no matter what `Accept` header
// is sent, since they stream a raw image that only the Workers
// `env.AI.run()` binding can surface: @cf/leonardo/phoenix-1.0 and
// @cf/stabilityai/stable-diffusion-xl-base-1.0. They were previously listed
// here under bare (prefix-less) ids that 404'd, so they never worked.

export type DynamicFieldType = "text" | "number" | "select" | "switch";

export type DynamicField = {
  /** camelCase key used in our form state / saved generation parameters. */
  key: string;
  /** Exact Cloudflare input param name this maps to. */
  cfParam: string;
  /** Nests cfParam one level down, inside this object, for the providers
   *  that group options: MiniMax H3 Max takes
   *  `extra: { prompt_expansion_mode }` and refuses the bare field. */
  cfGroup?: string;
  label: string;
  type: DynamicFieldType;
  /** For "select" fields. */
  options?: readonly string[];
  /**
   * UI-only shortlist for a free-text field: values we have actually run
   * against the model, offered as a picker so the composer never has to ask
   * anyone to type a parameter by hand.
   *
   * Deliberately NOT `options`. `options` is a probed enum and the only
   * thing the provider accepts, so it is enforced by buildDynamicSchema.
   * This makes no such claim — the field stays free text on the wire and in
   * the schema, so a value outside the list is still perfectly valid. It
   * exists so "we know these work" can be expressed without inventing an
   * enum, which this file forbids.
   */
  suggestedValues?: readonly string[];
  defaultValue?: string | number | boolean;
  /** For "number" fields. */
  min?: number;
  max?: number;
  helperText?: string;
  /** Translates our canonical value to the exact wire value the provider
   *  wants, for the models whose enum spelling differs from ours (Alibaba
   *  wants "720P"; FLUX 3 Video calls the same tiers "hd"/"fhd"). Keeping
   *  our own value canonical and lowercase matters: credit-estimate.ts
   *  keys its per-second rate tables on "720p"/"1080p", so storing the
   *  provider's spelling would silently miss the rate lookup and bill the
   *  most expensive tier. */
  cfValueMap?: Record<string, string | number | boolean>;
};

/** Pixel bounds a provider documents for its input images, inclusive. The
 *  composer checks each pick against them before uploading: a request that
 *  breaks them is only refused once it reaches the provider, after the job
 *  was queued and charged (then refunded). */
export type ImageLimits = {
  minSide: number;
  maxSide: number;
  /** Width over height. */
  minAspect: number;
  maxAspect: number;
};

export type CloudflareModelConfig = {
  /** Exact Cloudflare model id, e.g. "recraft/recraftv4-1". First-party
   *  models need the "@cf/" prefix; partner models must NOT have it.
   *  On a runtime: "kie" entry this is OUR canonical id instead — what the
   *  row stores and what credit-estimate keys its rates on — while
   *  `kieModel` carries the provider's own spelling. */
  id: string;
  /** Which API actually runs this model. Absent means Cloudflare, which is
   *  every entry probed live against /ai/run. A "kie" entry is served by
   *  kie.ai's createTask/recordInfo pair (lib/kie-ai.ts) instead, and its
   *  field list comes from kie.ai's published docs — the probe rule at the
   *  top of this file cannot be applied to it. */
  runtime?: "cloudflare" | "kie";
  /** The model string kie.ai expects in createTask, e.g.
   *  "kling-2.6/text-to-video". Required when runtime is "kie". */
  kieModel?: string;
  /** The kie.ai model to run instead when the request carries an image, for
   *  a model kie.ai splits into separate text- and image-to-video tasks
   *  (Grok Imagine Video). Absent means kieModel takes both. */
  kieImageModel?: string;
  /** Which kie.ai API carries the model. Absent means the market
   *  createTask/recordInfo pair; "veo" is Veo 3.1's own /api/v1/veo
   *  generate/record-info pair (see lib/kie-ai.ts). */
  kieApi?: "veo";
  label: string;
  provider: string;
  description: string;
  category: "text-to-image" | "text-to-video" | "image-to-video";
  promptRequired: boolean;
  image: "none" | "optional" | "required";
  /** How the prompt and images travel. Absent means as named params (the
   *  prompt under `prompt`, the image under imageCfParam), which is every
   *  entry but one. "content" is the typed list MiniMax H3 Max takes
   *  instead, refusing a top-level `prompt` outright:
   *    content: [{ type: "text", text }, { type: "image_url", image_url: { url }, role }]
   *  On such an entry imageCfParam and lastFrameCfParam name each image's
   *  `role` in that list rather than a param, and imageParamShape is unused. */
  inputShape?: "content";
  imageCfParam?: string;
  /** Some models want `{ url }`, some a raw base64-encoded image (fetched and
   *  re-encoded server-side, see generation-runner.ts), nano-banana-pro
   *  demands an array in `image_input`, and most others want a bare URL
   *  string. */
  imageParamShape?: "string" | "urlObject" | "base64" | "urlArray";
  /** Cloudflare param for a closing-frame reference image, for the models
   *  that accept one. The composer collects it as `lastFrameImage`, the name
   *  the Seedance forms use, and the runner resolves it to a signed URL and
   *  forwards it here, only ever beside an opening frame. */
  lastFrameCfParam?: string;
  /** Extra reference images, for the models that take a list of them. The
   *  composer collects them as `referenceImages`; buildProviderInput puts
   *  them on the wire. */
  referenceImages?: {
    /** The provider's own cap on that list, as its docs state it. */
    max: number;
    /** The param the list goes in, or on an inputShape "content" entry the
     *  role each item carries. When it is imageCfParam itself (Nano Banana
     *  Pro's image_input, Grok's image_urls), the references extend the main
     *  image's array and that image takes one of the `max` slots. */
    cfParam: string;
    /** The provider takes references or a first/last frame, never both
     *  (MiniMax H3 Max, Seedance 2.0 Mini): the composer offers one mode or
     *  the other and the schema refuses the mix. Without it, references are
     *  extra images that need the main one. */
    exclusiveWithFrames?: boolean;
    /** Field values at which the provider takes no references (Grok Imagine
     *  Video accepts a single image at 1080p). */
    unavailableWhen?: Record<string, string>;
    /** Shown with the uploads, for a provider with its own way of pointing
     *  at an image from the prompt. */
    hint?: string;
    /** Bounds on the references alone, for a provider that documents them
     *  for that list only. Absent means imageLimits applies. */
    limits?: ImageLimits;
  };
  /** Bounds on every image the model receives, where its provider documents
   *  them. */
  imageLimits?: ImageLimits;
  /** Extra tunable params exposed in the dynamic form. */
  fields: DynamicField[];
  /** Params always sent as-is, not user-editable (e.g. a fixed operation).
   *  An array here is shared by every request this isolate serves, hence
   *  readonly. */
  staticParams?: Record<string, string | number | boolean | readonly unknown[]>;
  /** Merged over staticParams when the request HAS an input image, and
   *  when it doesn't, respectively, and over the fields as well: what they
   *  set is decided by the image, not by the form. FLUX 3 Video is a
   *  discriminated union on `mode`: "t2v" takes a prompt, "i2v" takes
   *  `keyframes` instead of `image`, and sending the wrong one is a 400.
   *  MiniMax H3 Max refuses any ratio but "adaptive" beside a first frame. */
  imageStaticParams?: Record<string, string | number | boolean>;
  noImageStaticParams?: Record<string, string | number | boolean>;
  /** Some providers refuse to host the generated file and instead demand a
   *  URL to upload it to — xAI enforces exactly this for Grok video on
   *  Zero Data Retention teams ("ZDR teams must provide output.upload_url").
   *  When set, the runner mints a pre-signed R2 PUT URL, passes it under
   *  `{ [cfParam]: { [urlKey]: url } }`, and persists that object as the
   *  result instead of re-downloading one from the provider. */
  outputUploadTarget?: { cfParam: string; urlKey: string; contentType: string };
  /** Path into the response (relative to `json.result ?? json`, matching the
   *  existing runCloudflareVideoModel convention) where the result lives. */
  outputPath: string[];
  /** Tried if outputPath comes back empty — e.g. grok-imagine-image can
   *  return `images[0]` instead of `image` once `n` > 1. */
  fallbackOutputPath?: string[];
  outputKind: "url" | "base64";
  /** MIME type for the `data:` URI built from a base64 result. Lucid Origin
   *  returns JPEG bytes, not PNG. */
  outputMimeType?: string;
  /** Every clip comes back with a soundtrack and there is no switch for it,
   *  which a field list alone can't say. The model landing pages
   *  (model-seo.ts, frontend) read audio support off this or off an audio
   *  switch field. */
  alwaysHasAudio?: boolean;
};

export const CLOUDFLARE_MODELS: CloudflareModelConfig[] = [
  // ---------- text-to-image ----------
  // Verified field list: prompt, size, style, substyle, controls.colors,
  // controls.background_color.rgb. There is NO `image` param — the previous
  // entry advertised image-to-image support that 400s.
  //
  // size/style/substyle stay free text on purpose. Re-probed 2026-08-30 with
  // a deliberately invalid value on each: unlike the xAI and ByteDance models,
  // Cloudflare accepted all three without complaint, so it does not validate
  // them and there is no enum to read off the API. Recraft's own API does have
  // one, but writing it from memory or from docs is exactly what this file
  // forbids — turning these into selects needs values obtained from the
  // provider, not guessed.
  //
  // That non-validation is also why `size` carries `suggestedValues`: a typo
  // here is NOT rejected the way it would be on a model with a real enum, it
  // just travels on to Recraft, so asking anyone to type "1024x1024" by hand
  // was the worst place in the catalog to do it. The two listed values are
  // the ones this trio already ships as its own defaults — no enum is claimed
  // or invented, and the field stays free text, so a probe that turns up the
  // real list can widen it (or promote it to `options`) without anything else
  // having to change. style/substyle stay open text: they have no shortlist
  // to draw on that would not be a guess.
  {
    id: "recraft/recraftv4-1",
    label: "Recraft v4.1",
    provider: "Recraft",
    description: "Fast, cost-efficient with style controls",
    category: "text-to-image",
    promptRequired: true,
    image: "none",
    fields: [
      { key: "size", cfParam: "size", label: "Size", type: "text", defaultValue: "1024x1024", suggestedValues: ["1024x1024", "2048x2048"] },
      { key: "style", cfParam: "style", label: "Style", type: "text", helperText: "Optional visual style" },
      { key: "substyle", cfParam: "substyle", label: "Substyle", type: "text", helperText: "Optional sub-style variant" },
    ],
    outputPath: ["image"],
    outputKind: "url",
  },
  {
    id: "recraft/recraftv4-1-pro",
    label: "Recraft v4.1 Pro",
    provider: "Recraft",
    description: "High-resolution 2048px+ output",
    category: "text-to-image",
    promptRequired: true,
    image: "none",
    fields: [
      { key: "size", cfParam: "size", label: "Size", type: "text", defaultValue: "2048x2048", suggestedValues: ["1024x1024", "2048x2048"] },
      { key: "style", cfParam: "style", label: "Style", type: "text", helperText: "Optional visual style" },
      { key: "substyle", cfParam: "substyle", label: "Substyle", type: "text", helperText: "Optional sub-style variant" },
    ],
    outputPath: ["image"],
    outputKind: "url",
  },
  {
    id: "recraft/recraftv4-1-vector",
    label: "Recraft v4.1 Vector",
    provider: "Recraft",
    description: "Production-ready SVG vector graphics",
    category: "text-to-image",
    promptRequired: true,
    image: "none",
    fields: [
      { key: "size", cfParam: "size", label: "Size", type: "text", defaultValue: "1024x1024", suggestedValues: ["1024x1024", "2048x2048"] },
      { key: "style", cfParam: "style", label: "Style", type: "text", helperText: "Optional visual style" },
      { key: "substyle", cfParam: "substyle", label: "Substyle", type: "text", helperText: "Optional sub-style variant" },
    ],
    outputPath: ["image"],
    outputKind: "url",
  },
  // First-party model: needs the "@cf/" prefix (the bare id 404s with
  // "Model not found"). Returns base64 JPEG bytes at result.image, not a URL.
  {
    id: "@cf/leonardo/lucid-origin",
    label: "Lucid Origin",
    provider: "Leonardo",
    description: "Highly adaptable and prompt-responsive",
    category: "text-to-image",
    promptRequired: true,
    image: "none",
    fields: [],
    outputPath: ["image"],
    outputKind: "base64",
    outputMimeType: "image/jpeg",
  },
  {
    id: "google/nano-banana-2-lite",
    label: "Nano Banana 2 Lite",
    provider: "Google",
    description: "Google's fastest Gemini image generation model",
    category: "text-to-image",
    promptRequired: true,
    image: "none",
    fields: [],
    outputPath: ["image"],
    outputKind: "url",
  },
  {
    id: "google/nano-banana-pro",
    label: "Nano Banana Pro",
    provider: "Google",
    description: "Google's highest-fidelity Gemini image model, up to 4K",
    category: "text-to-image",
    promptRequired: true,
    image: "optional",
    imageCfParam: "image_input",
    imageParamShape: "urlArray",
    fields: [
      { key: "aspectRatio", cfParam: "aspect_ratio", label: "Aspect ratio", type: "select", options: ["1:1", "3:2", "2:3", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"], defaultValue: "1:1" },
      { key: "imageSize", cfParam: "image_size", label: "Resolution", type: "select", options: ["1K", "2K", "4K"], defaultValue: "2K" },
      { key: "outputFormat", cfParam: "output_format", label: "Output format", type: "select", options: ["jpg", "png", "webp"], defaultValue: "png" },
    ],
    // image_input takes up to 3 images (Cloudflare's published schema, read
    // 2026-09-18): the upload and two references. IMAGE_PROMPT_COST_USD
    // prices all three.
    referenceImages: { max: 3, cfParam: "image_input" },
    // Unlike the Seedream trio, which answer with `images: [...]`, this one
    // returns a single scalar `image` URL — hence outputPath stays ["image"].
    outputPath: ["image"],
    outputKind: "url",
  },
  // Verified live: returns a URL at result.result.image.
  {
    id: "openai/gpt-image-2",
    label: "GPT Image 2",
    provider: "OpenAI",
    description: "OpenAI's image model with quality tiers",
    category: "text-to-image",
    promptRequired: true,
    image: "none",
    fields: [
      { key: "size", cfParam: "size", label: "Size", type: "select", options: ["1024x1024", "1024x1536", "1536x1024", "auto"], defaultValue: "1024x1024" },
      { key: "quality", cfParam: "quality", label: "Quality", type: "select", options: ["low", "medium", "high", "auto"], defaultValue: "medium" },
    ],
    outputPath: ["image"],
    fallbackOutputPath: ["images", "0"],
    outputKind: "url",
  },
  {
    id: "xai/grok-imagine-image",
    label: "Grok Imagine",
    provider: "xAI",
    description: "Configurable aspect ratio and resolution",
    category: "text-to-image",
    promptRequired: true,
    image: "none",
    fields: [
      { key: "aspectRatio", cfParam: "aspect_ratio", label: "Aspect ratio", type: "select", options: ["1:1", "3:4", "4:3", "9:16", "16:9", "2:3", "3:2", "9:19.5", "19.5:9", "9:20", "20:9", "1:2", "2:1", "auto"], defaultValue: "16:9" },
      { key: "resolution", cfParam: "resolution", label: "Resolution", type: "select", options: ["1k", "2k"], defaultValue: "1k" },
    ],
    // Our xAI account is on Zero Data Retention, and ZDR teams are refused
    // response_format: "url" outright ("Zero Data Retention teams do not
    // have access to URL format as it requires storing the generated
    // images") — the same policy that forces outputUploadTarget on Grok
    // video. Probed 2026-09-07: the schema accepts only "url" | "b64_json",
    // so b64_json it is, and the result comes back as raw JPEG bytes.
    staticParams: { response_format: "b64_json" },
    outputPath: ["image"],
    fallbackOutputPath: ["images", "0"],
    outputKind: "base64",
    outputMimeType: "image/jpeg",
  },
  // Re-probed 2026-08-30. Both xAI image models share one schema, and three
  // of its fields were wrong here: aspect_ratio and resolution are real enums
  // (resolution is "1k"|"2k", NOT a WIDTHxHEIGHT string — the old helper text
  // suggested "1024x1024", which the API rejects outright), and there is a
  // `quality` field ("low"|"medium"|"high") that was not exposed at all. It is
  // wired up on the Quality variant only, pinned to "high": adding it to the
  // fast variant would change what that model costs us while it stays in the
  // cheap image bucket in credit-estimate.ts.
  //
  // The probe also reports an `n` (1-10 images per call). Neither xAI model
  // exposes it, so the provider's default of one image is what runs: this
  // pipeline persists exactly one result URL (see the note on seedream-4.5
  // below), so any n > 1 would bill for images that are then dropped.
  //
  // Its schema names the image field `image.url`, i.e. a nested { url }
  // object — a bare string 400s.
  {
    id: "xai/grok-imagine-image-quality",
    label: "Grok Imagine Quality",
    provider: "xAI",
    description: "Higher-fidelity, supports image editing",
    category: "text-to-image",
    promptRequired: true,
    image: "optional",
    imageCfParam: "image",
    imageParamShape: "urlObject",
    fields: [
      { key: "quality", cfParam: "quality", label: "Quality", type: "select", options: ["low", "medium", "high"], defaultValue: "high" },
      { key: "aspectRatio", cfParam: "aspect_ratio", label: "Aspect ratio", type: "select", options: ["1:1", "3:4", "4:3", "9:16", "16:9", "2:3", "3:2", "9:19.5", "19.5:9", "9:20", "20:9", "1:2", "2:1", "auto"], defaultValue: "16:9" },
      { key: "resolution", cfParam: "resolution", label: "Resolution", type: "select", options: ["1k", "2k"], defaultValue: "2k" },
    ],
    // b64_json for the same Zero Data Retention reason as the fast variant
    // above — both xAI image models share one schema and one policy.
    staticParams: { response_format: "b64_json" },
    outputPath: ["image"],
    fallbackOutputPath: ["images", "0"],
    outputKind: "base64",
    outputMimeType: "image/jpeg",
  },

  // Probed live, and it differs from ByteDance's published schema: it also
  // accepts `watermark` (boolean), and `size` is validated as 1K | 2K |
  // WIDTHxHEIGHT rather than being a free-form string. Unlike its 4.5 and
  // 5-lite siblings it takes `image` as a bare URL (or data: URI) string,
  // not an array. All three answer with `images: [...]`, so the result is
  // at images.0 rather than a scalar field.
  {
    id: "bytedance/seedream-5-pro",
    label: "Seedream 5 Pro",
    provider: "ByteDance",
    description: "ByteDance's flagship image model at 1K or 2K",
    category: "text-to-image",
    promptRequired: true,
    image: "optional",
    imageCfParam: "image",
    fields: [
      { key: "size", cfParam: "size", label: "Size", type: "select", options: ["1K", "2K"], defaultValue: "2K" },
      { key: "watermark", cfParam: "watermark", label: "Watermark", type: "switch", defaultValue: false },
    ],
    outputPath: ["images", "0"],
    outputKind: "url",
  },
  // 4.5 and 5-lite share a shape: `image_input` is strictly an array (a bare
  // string is rejected) that both then ignore — see the note on 4.5 below,
  // which is why neither declares an image any more. Both can batch-generate
  // via sequential_image_generation. We pin that to "disabled": this pipeline
  // persists exactly one result URL, so a batch would bill the user for
  // images we then silently drop. 4.5's disable_safety_checker is
  // deliberately not exposed — the provider's checker stays on.
  {
    id: "bytedance/seedream-4.5",
    label: "Seedream 4.5",
    provider: "ByteDance",
    description: "Up to 4K with aspect-ratio control",
    category: "text-to-image",
    promptRequired: true,
    // Probed live 2026-09-02: `image_input` is in this model's schema and a
    // well-formed array is accepted without complaint — and then ignored. The
    // same reference that nano-banana-pro and seedream-5-pro reproduce
    // faithfully (tested as a data: URI and as an https URL the provider itself
    // hosts, at every aspect_ratio including "match_input_image") comes back
    // here as an unrelated invention. A reference slot that silently drops the
    // reference is worse than no slot at all — the generation still succeeds and
    // still bills — so as far as this app is concerned the model takes no image.
    // That also keeps it out of STUDIO_IMAGE_MODELS, whose whole premise is
    // "keep my product and my talent".
    image: "none",
    fields: [
      { key: "size", cfParam: "size", label: "Size", type: "select", options: ["2K", "4K"], defaultValue: "2K" },
      { key: "aspectRatio", cfParam: "aspect_ratio", label: "Aspect ratio", type: "select", options: ["match_input_image", "1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"], defaultValue: "1:1" },
    ],
    staticParams: { sequential_image_generation: "disabled" },
    outputPath: ["images", "0"],
    outputKind: "url",
  },
  {
    id: "bytedance/seedream-5-lite",
    label: "Seedream 5 Lite",
    provider: "ByteDance",
    description: "Faster Seedream 5, 2K/3K with PNG or JPEG output",
    category: "text-to-image",
    promptRequired: true,
    // Ignores `image_input` exactly like its 4.5 sibling — same live probe, same
    // day, same unrelated output. See the note there.
    image: "none",
    fields: [
      { key: "size", cfParam: "size", label: "Size", type: "select", options: ["2K", "3K"], defaultValue: "2K" },
      { key: "aspectRatio", cfParam: "aspect_ratio", label: "Aspect ratio", type: "select", options: ["match_input_image", "1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"], defaultValue: "1:1" },
      { key: "outputFormat", cfParam: "output_format", label: "Output format", type: "select", options: ["png", "jpeg"], defaultValue: "png" },
    ],
    staticParams: { sequential_image_generation: "disabled" },
    outputPath: ["images", "0"],
    outputKind: "url",
  },

  // ---------- text-to-video (no required image) ----------
  // On kie.ai since 2026-09-13 (bytedance/seedance-2-mini, fields from
  // docs.kie.ai/market/bytedance/seedance-2-mini): Cloudflare billed it at
  // about twice kie's rate. The move cost three things Cloudflare's schema
  // had and kie's doesn't — camera_fixed, seed and watermark. In exchange:
  // 4-15s (was 4-12) and an "adaptive" aspect ratio, but no 9:21.
  {
    id: "bytedance/seedance-2.0-mini",
    runtime: "kie",
    kieModel: "bytedance/seedance-2-mini",
    label: "Seedance 2.0 Mini",
    provider: "ByteDance",
    description: "Runs on kie.ai — compact & cost-efficient, 4 to 15s",
    category: "text-to-video",
    promptRequired: true,
    image: "optional",
    imageCfParam: "first_frame_url",
    lastFrameCfParam: "last_frame_url",
    fields: [
      { key: "duration", cfParam: "duration", label: "Duration", type: "number", defaultValue: 5, min: 4, max: 15, helperText: "seconds" },
      { key: "resolution", cfParam: "resolution", label: "Resolution", type: "select", options: ["480p", "720p"], defaultValue: "720p" },
      { key: "aspectRatio", cfParam: "aspect_ratio", label: "Aspect ratio", type: "select", options: ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9", "adaptive"], defaultValue: "16:9" },
      { key: "generateAudio", cfParam: "generate_audio", label: "Generate audio", type: "switch", defaultValue: true },
    ],
    // Reference images or first/last frames, never both: kie documents them
    // as mutually exclusive scenarios, with up to 9 reference_image_urls
    // (docs.kie.ai/market/bytedance/seedance-2-mini, read 2026-09-18). Its
    // reference videos and audio aren't exposed. `limits` are the pixel
    // bounds the same page gives the reference images; it states none for
    // the frames.
    referenceImages: {
      max: 9,
      cfParam: "reference_image_urls",
      exclusiveWithFrames: true,
      limits: { minSide: 300, maxSide: 6000, minAspect: 0.4, maxAspect: 2.5 },
    },
    outputPath: [],
    outputKind: "url",
  },
  // Discriminated union on `mode`: "t2v" (prompt) vs "i2v" (keyframes).
  // It calls the resolution tiers "hd"/"fhd", rejects `seed` outright, and
  // its aspect_ratio list has "auto"/"2:1" but no "9:21".
  {
    id: "black-forest-labs/flux-3-video",
    label: "Flux 3 Video",
    provider: "Black Forest Labs",
    description: "First FLUX video model, native audio",
    category: "text-to-video",
    promptRequired: true,
    image: "optional",
    imageCfParam: "keyframes",
    fields: [
      { key: "duration", cfParam: "duration", label: "Duration", type: "number", defaultValue: 5, min: 5, max: 20, helperText: "seconds" },
      {
        key: "resolution",
        cfParam: "resolution",
        label: "Resolution",
        type: "select",
        options: ["720p", "1080p"],
        defaultValue: "720p",
        cfValueMap: { "720p": "hd", "1080p": "fhd" },
      },
      { key: "aspectRatio", cfParam: "aspect_ratio", label: "Aspect ratio", type: "select", options: ["auto", "21:9", "2:1", "16:9", "4:3", "1:1", "3:4", "9:16"], defaultValue: "16:9" },
      { key: "generateAudio", cfParam: "generate_audio", label: "Generate audio", type: "switch", defaultValue: true },
      { key: "draft", cfParam: "draft", label: "Draft mode (fast preview)", type: "switch", defaultValue: false },
    ],
    noImageStaticParams: { mode: "t2v" },
    imageStaticParams: { mode: "i2v" },
    outputPath: ["video"],
    outputKind: "url",
  },
  // On kie.ai since 2026-09-13 (fields from docs.kie.ai/market/grok-imagine/
  // text-to-video and image-to-video): Cloudflare billed it at 3-4x kie's
  // rate. kie splits it into two tasks, picked per request by kieImageModel.
  // Durations are 6-30s there (Cloudflare took 1-15), 1080p is new, and 4:3 /
  // 3:4 are gone. `mode` is pinned to "normal": "spicy" is kie's explicit
  // setting and is refused for uploaded images anyway. Duration goes out as
  // a number, as kie's image-to-video README (kie.ai model page, 2026-09-13)
  // types it and sends it. nsfw_checker is pinned off, by choice: kie's
  // content filter is not wanted here (2026-09-13), and this model's README
  // lists true as the default, so leaving it unset could switch it on.
  {
    id: "xai/grok-imagine-video",
    runtime: "kie",
    kieModel: "grok-imagine/text-to-video",
    kieImageModel: "grok-imagine/image-to-video",
    label: "Grok Imagine Video",
    provider: "xAI",
    description: "Runs on kie.ai — native synchronized audio, 6 to 30s up to 1080p",
    category: "text-to-video",
    promptRequired: true,
    image: "optional",
    imageCfParam: "image_urls",
    imageParamShape: "urlArray",
    staticParams: { mode: "normal", nsfw_checker: false },
    fields: [
      { key: "duration", cfParam: "duration", label: "Duration", type: "number", defaultValue: 6, min: 6, max: 30, helperText: "seconds" },
      { key: "aspectRatio", cfParam: "aspect_ratio", label: "Aspect ratio", type: "select", options: ["16:9", "9:16", "1:1", "3:2", "2:3"], defaultValue: "16:9" },
      { key: "resolution", cfParam: "resolution", label: "Resolution", type: "select", options: ["480p", "720p", "1080p"], defaultValue: "720p" },
    ],
    // Up to 7 images in image_urls, the upload first, each named in the
    // prompt by position; a single one at 1080p (docs.kie.ai/market/
    // grok-imagine/image-to-video, read 2026-09-18).
    referenceImages: {
      max: 7,
      cfParam: "image_urls",
      unavailableWhen: { resolution: "1080p" },
      hint: "Refer to each image in the prompt as @image1, @image2 and so on, in upload order.",
    },
    // xAI generates the soundtrack with the picture; kie has no switch for it.
    alwaysHasAudio: true,
    outputPath: [],
    outputKind: "url",
  },
  // On kie.ai since 2026-09-13 (grok-imagine-video-1-5-preview, fields from
  // docs.kie.ai/market/grok-imagine/1-5-preview): Cloudflare billed it at
  // ~6.5x kie's rate. One task takes text or an image. kie also accepts
  // 1080p, but lists no price for it on this model, so it isn't offered;
  // "auto" is new and 4:3 / 3:4 are gone. nsfw_checker is pinned off for the
  // same reason as the stable model above.
  {
    id: "xai/grok-imagine-video-1.5-preview",
    runtime: "kie",
    kieModel: "grok-imagine-video-1-5-preview",
    label: "Grok Imagine Video 1.5 Preview",
    provider: "xAI",
    description: "Runs on kie.ai — next-gen quality improvements",
    category: "text-to-video",
    promptRequired: true,
    image: "optional",
    imageCfParam: "image_urls",
    imageParamShape: "urlArray",
    staticParams: { nsfw_checker: false },
    fields: [
      { key: "duration", cfParam: "duration", label: "Duration", type: "number", defaultValue: 5, min: 1, max: 15, helperText: "seconds" },
      { key: "aspectRatio", cfParam: "aspect_ratio", label: "Aspect ratio", type: "select", options: ["16:9", "9:16", "1:1", "3:2", "2:3", "auto"], defaultValue: "16:9" },
      { key: "resolution", cfParam: "resolution", label: "Resolution", type: "select", options: ["480p", "720p"], defaultValue: "720p" },
    ],
    // Up to 7 images in image_urls (docs.kie.ai/market/grok-imagine/
    // 1-5-preview, read 2026-09-18). Its single-image limit applies at
    // 1080p, which this entry doesn't offer.
    referenceImages: { max: 7, cfParam: "image_urls" },
    alwaysHasAudio: true,
    outputPath: [],
    outputKind: "url",
  },
  // Both Veo 3.1 models on kie.ai since 2026-09-13: Cloudflare billed them
  // at ~2.5-3x kie's per-clip price. They run on kie's own /api/v1/veo pair
  // (kieApi: "veo"), whose fields come from docs.kie.ai/old-model/veo3-api/
  // generate-veo-3-video — see lib/kie-ai.ts for why that page and not the
  // market one. What changed from Cloudflare:
  //   - no audio switch: kie ships every Veo clip with its soundtrack;
  //   - 4K is new, 1:1 is gone ("auto" crops to 16:9 or 9:16 from the image);
  //   - duration keeps its "4s"/"6s"/"8s" spelling in our params (old rows and
  //     durationSecondsOf read it) and goes out as the integer kie wants;
  //   - the image goes as a URL in imageUrls instead of base64. kie reads a
  //     second entry there as the last frame, which isn't wired up;
  //   - the ratio goes as `aspectRatio`. The doc says aspect_ratio, but kie's
  //     own playground (kie.ai/veo-3-1, read 2026-09-13) sends aspectRatio,
  //     camelCase like every other field on this endpoint.
  {
    id: "google/veo-3.1",
    runtime: "kie",
    kieApi: "veo",
    kieModel: "veo3",
    label: "Veo 3.1",
    provider: "Google",
    description: "Runs on kie.ai — Google's flagship video model with native audio, up to 4K",
    category: "text-to-video",
    promptRequired: true,
    image: "optional",
    imageCfParam: "imageUrls",
    imageParamShape: "urlArray",
    // Optional per the docs (kie infers it from imageUrls), but the playground
    // always sends it, so this does too.
    noImageStaticParams: { generationType: "TEXT_2_VIDEO" },
    imageStaticParams: { generationType: "FIRST_AND_LAST_FRAMES_2_VIDEO" },
    fields: [
      { key: "duration", cfParam: "duration", label: "Duration", type: "select", options: ["4s", "6s", "8s"], defaultValue: "6s", cfValueMap: { "4s": 4, "6s": 6, "8s": 8 } },
      { key: "resolution", cfParam: "resolution", label: "Resolution", type: "select", options: ["720p", "1080p", "4k"], defaultValue: "720p" },
      { key: "aspectRatio", cfParam: "aspectRatio", label: "Aspect ratio", type: "select", options: ["16:9", "9:16", "auto"], defaultValue: "16:9", cfValueMap: { auto: "Auto" } },
    ],
    // kie ships every Veo clip with its soundtrack (see above).
    alwaysHasAudio: true,
    outputPath: [],
    outputKind: "url",
  },
  {
    id: "google/veo-3.1-fast",
    runtime: "kie",
    kieApi: "veo",
    kieModel: "veo3_fast",
    label: "Veo 3.1 Fast",
    provider: "Google",
    description: "Runs on kie.ai — lower-latency Veo variant with native audio, up to 4K",
    category: "text-to-video",
    promptRequired: true,
    image: "optional",
    imageCfParam: "imageUrls",
    imageParamShape: "urlArray",
    // Optional per the docs (kie infers it from imageUrls), but the playground
    // always sends it, so this does too.
    noImageStaticParams: { generationType: "TEXT_2_VIDEO" },
    imageStaticParams: { generationType: "FIRST_AND_LAST_FRAMES_2_VIDEO" },
    fields: [
      { key: "duration", cfParam: "duration", label: "Duration", type: "select", options: ["4s", "6s", "8s"], defaultValue: "6s", cfValueMap: { "4s": 4, "6s": 6, "8s": 8 } },
      { key: "resolution", cfParam: "resolution", label: "Resolution", type: "select", options: ["720p", "1080p", "4k"], defaultValue: "720p" },
      { key: "aspectRatio", cfParam: "aspectRatio", label: "Aspect ratio", type: "select", options: ["16:9", "9:16", "auto"], defaultValue: "16:9", cfValueMap: { auto: "Auto" } },
    ],
    // kie ships every Veo clip with its soundtrack (see above).
    alwaysHasAudio: true,
    outputPath: [],
    outputKind: "url",
  },

  // MiniMax's schema: duration is a 6|10 enum rather than a range, the
  // resolution tiers are spelled with a capital P, and additionalProperties
  // is false — anything not listed here is a hard 400. We keep our own
  // values canonical ("6", "768p") and translate on the wire, so the credit
  // rate table still matches.
  //
  // Its declared output is { task_id, status?, video? } with only task_id
  // required — the shape of an async job API. Should Cloudflare ever answer
  // before the render finishes, runCloudflareModel surfaces that status
  // verbatim rather than a generic "no result" error.
  {
    id: "minimax/hailuo-2.3",
    label: "Hailuo 2.3",
    provider: "MiniMax",
    description: "MiniMax Hailuo 2.3, 6s or 10s at up to 1080p",
    category: "text-to-video",
    promptRequired: true,
    image: "optional",
    imageCfParam: "first_frame_image",
    fields: [
      { key: "duration", cfParam: "duration", label: "Duration", type: "select", options: ["6", "10"], defaultValue: "6", helperText: "seconds", cfValueMap: { "6": 6, "10": 10 } },
      { key: "resolution", cfParam: "resolution", label: "Resolution", type: "select", options: ["768p", "1080p"], defaultValue: "768p", cfValueMap: { "768p": "768P", "1080p": "1080P" } },
      { key: "promptOptimizer", cfParam: "prompt_optimizer", label: "Optimize prompt", type: "switch", defaultValue: true },
      { key: "fastPretreatment", cfParam: "fast_pretreatment", label: "Fast pretreatment", type: "switch", defaultValue: false },
    ],
    outputPath: ["video"],
    outputKind: "url",
  },

  // MiniMax H3 Max, fal's speed-tuned post-train of H3. Probed live
  // 2026-09-18, and shaped nothing like Hailuo above:
  //   - the prompt and the image travel as typed items of one `content`
  //     list (inputShape), and a top-level `prompt` is refused;
  //   - the prompt-expansion setting sits in a nested `extra` (cfGroup);
  //   - the result comes back as `task: { status, content: { url } }`.
  // /ai/run still answers only once the render is done: every sample on
  // Cloudflare's model page comes back "succeeded", 6 to 71s after it was
  // created. A task that fails upstream answers 200 with status "failed"
  // and MiniMax's own { code, message }, which runCloudflareModel surfaces.
  //
  // The ratio depends on the input. Beside a first frame Cloudflare refuses
  // anything but "adaptive" ("image-to-video requires adaptive ratio",
  // probed 2026-09-18), so imageStaticParams pins it and the pick only
  // applies to text-only runs. Those get concrete ratios only: Cloudflare's
  // validation lets a text-only "adaptive" through, but MiniMax's API
  // reference (video-generation-v2-create) says it is refused upstream, a
  // failure that would only surface at execution.
  //
  // Reference images (role reference_image, up to 9) and first/last frames
  // are two modes MiniMax refuses to mix, hence exclusiveWithFrames. The
  // references don't appear to move the price: Cloudflare's two-reference
  // sample reports total_seconds equal to the output length. Reference
  // videos and audio (3 each) are not exposed, since their input seconds
  // (usage.input_seconds, input_audio_seconds) may be billed at a rate we
  // don't have. callback_url is moot while the call blocks.
  //
  // Every clip carries a soundtrack, with no switch for it: both of
  // Cloudflare's sample outputs hold a ~195 kbps AAC track.
  {
    id: "minimax/h3-max",
    label: "H3 Max",
    provider: "MiniMax",
    description: "MiniMax's fast video model, 5 to 15s at 480p or 768p with native audio",
    category: "text-to-video",
    promptRequired: true,
    image: "optional",
    inputShape: "content",
    imageCfParam: "first_frame",
    lastFrameCfParam: "last_frame",
    imageStaticParams: { ratio: "adaptive" },
    fields: [
      { key: "duration", cfParam: "duration", label: "Duration", type: "number", defaultValue: 5, min: 5, max: 15, helperText: "seconds" },
      { key: "resolution", cfParam: "resolution", label: "Resolution", type: "select", options: ["480p", "768p"], defaultValue: "768p", cfValueMap: { "480p": "480P", "768p": "768P" } },
      { key: "aspectRatio", cfParam: "ratio", label: "Aspect ratio", type: "select", options: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"], defaultValue: "16:9", helperText: "Ignored when a reference image is supplied" },
      { key: "promptExpansion", cfParam: "prompt_expansion_mode", cfGroup: "extra", label: "Prompt expansion", type: "select", options: ["disabled", "balanced", "quality"], defaultValue: "balanced" },
    ],
    alwaysHasAudio: true,
    referenceImages: { max: 9, cfParam: "reference_image", exclusiveWithFrames: true },
    // MiniMax's bounds on every image_url (API reference, video-generation-
    // v2-create), and Cloudflare enforces them: a 342x105 upload came back
    // "expected each side in [256, 5760]" (2026-09-18).
    imageLimits: { minSide: 256, maxSide: 5760, minAspect: 0.4, maxAspect: 2.5 },
    outputPath: ["task", "content", "url"],
    outputKind: "url",
  },

  // Two things to know before touching this entry.
  //
  // 1. Pruna ships `disable_safety_filter` defaulting to TRUE — the model's
  //    safety filter is off unless you say otherwise. We pin it to false as
  //    a static param so the filter stays on, and deliberately don't expose
  //    a toggle for it (same stance as seedream-4.5's safety checker).
  // 2. Its `additionalProperties` is permissive ({}), not false, so unknown
  //    fields are ACCEPTED rather than rejected. Never schema-probe this
  //    model with a junk field — the request would execute and bill a real
  //    video. Guard a probe with an invalid enum value instead.
  //
  // `audio` is not exposed: there is no audio upload anywhere in the
  // pipeline yet. Supplying it would also make `duration` a no-op.
  {
    id: "pruna/p-video",
    label: "P-Video",
    provider: "Pruna",
    description: "1-20s at 720p/1080p, 24 or 48 fps, optional audio track",
    category: "text-to-video",
    promptRequired: true,
    image: "optional",
    imageCfParam: "image",
    lastFrameCfParam: "last_frame_image",
    fields: [
      { key: "duration", cfParam: "duration", label: "Duration", type: "number", defaultValue: 5, min: 1, max: 20, helperText: "seconds" },
      { key: "resolution", cfParam: "resolution", label: "Resolution", type: "select", options: ["720p", "1080p"], defaultValue: "720p" },
      { key: "fps", cfParam: "fps", label: "Frames per second", type: "select", options: ["24", "48"], defaultValue: "24", cfValueMap: { "24": 24, "48": 48 } },
      { key: "aspectRatio", cfParam: "aspect_ratio", label: "Aspect ratio", type: "select", options: ["16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "1:1"], defaultValue: "16:9", helperText: "Ignored when a reference image is supplied" },
      { key: "draft", cfParam: "draft", label: "Draft mode (fast preview)", type: "switch", defaultValue: false },
      { key: "saveAudio", cfParam: "save_audio", label: "Include audio", type: "switch", defaultValue: true },
      { key: "promptUpsampling", cfParam: "prompt_upsampling", label: "Enhance prompt", type: "switch", defaultValue: true },
      { key: "seed", cfParam: "seed", label: "Seed", type: "number" },
    ],
    staticParams: { disable_safety_filter: false },
    outputPath: ["video"],
    outputKind: "url",
  },

  // Vidu's Q3 pair share one input schema; only the speed/quality tier
  // differs. `start_image` is the opening frame and `end_image` the closing
  // one — the latter is only valid alongside the former, which the schema
  // does not enforce, so generation-runner.ts gates it on hasImage.
  {
    id: "vidu/q3-pro",
    label: "Vidu Q3 Pro",
    provider: "Vidu",
    description: "Vidu Q3 at up to 1080p with synced audio",
    category: "text-to-video",
    promptRequired: true,
    image: "optional",
    imageCfParam: "start_image",
    lastFrameCfParam: "end_image",
    fields: [
      { key: "duration", cfParam: "duration", label: "Duration", type: "number", defaultValue: 5, min: 1, max: 16, helperText: "seconds" },
      { key: "resolution", cfParam: "resolution", label: "Resolution", type: "select", options: ["540p", "720p", "1080p"], defaultValue: "720p" },
      { key: "aspectRatio", cfParam: "aspect_ratio", label: "Aspect ratio", type: "select", options: ["16:9", "9:16", "3:4", "4:3", "1:1"], defaultValue: "16:9", helperText: "Ignored when a reference image is supplied" },
      { key: "audio", cfParam: "audio", label: "Generate audio", type: "switch", defaultValue: true },
    ],
    outputPath: ["video"],
    outputKind: "url",
  },
  {
    id: "vidu/q3-turbo",
    label: "Vidu Q3 Turbo",
    provider: "Vidu",
    description: "Faster, cheaper Vidu Q3 variant",
    category: "text-to-video",
    promptRequired: true,
    image: "optional",
    imageCfParam: "start_image",
    lastFrameCfParam: "end_image",
    fields: [
      { key: "duration", cfParam: "duration", label: "Duration", type: "number", defaultValue: 5, min: 1, max: 16, helperText: "seconds" },
      { key: "resolution", cfParam: "resolution", label: "Resolution", type: "select", options: ["540p", "720p", "1080p"], defaultValue: "720p" },
      { key: "aspectRatio", cfParam: "aspect_ratio", label: "Aspect ratio", type: "select", options: ["16:9", "9:16", "3:4", "4:3", "1:1"], defaultValue: "16:9", helperText: "Ignored when a reference image is supplied" },
      { key: "audio", cfParam: "audio", label: "Generate audio", type: "switch", defaultValue: true },
    ],
    outputPath: ["video"],
    outputKind: "url",
  },

  // ---------- image-to-video (image required) ----------
  // Both Alibaba models share one schema: image, prompt, negative_prompt,
  // resolution, duration, seed, watermark. They have NO aspect_ratio (the
  // old entry sent one, which is what 400'd every request), and spell the
  // resolution tiers with a capital P.
  {
    id: "alibaba/hh1.1-i2v",
    label: "HappyHorse 1.1 — Live",
    provider: "Alibaba",
    description: "Smoother motion, improved close-ups",
    category: "image-to-video",
    promptRequired: false,
    image: "required",
    imageCfParam: "image",
    fields: [
      { key: "duration", cfParam: "duration", label: "Duration", type: "number", defaultValue: 5, min: 3, max: 15, helperText: "seconds" },
      {
        key: "resolution",
        cfParam: "resolution",
        label: "Resolution",
        type: "select",
        options: ["720p", "1080p"],
        defaultValue: "720p",
        cfValueMap: { "720p": "720P", "1080p": "1080P" },
      },
      { key: "negativePrompt", cfParam: "negative_prompt", label: "Negative prompt", type: "text", helperText: "What to avoid" },
      { key: "watermark", cfParam: "watermark", label: "Watermark", type: "switch", defaultValue: false },
      { key: "seed", cfParam: "seed", label: "Seed", type: "number" },
    ],
    outputPath: ["video"],
    outputKind: "url",
  },
  {
    id: "alibaba/wan-2.7-i2v",
    label: "Wan 2.7",
    provider: "Alibaba",
    description: "Wan 2.7 image-to-video",
    category: "image-to-video",
    promptRequired: false,
    image: "required",
    imageCfParam: "image",
    fields: [
      { key: "duration", cfParam: "duration", label: "Duration", type: "number", defaultValue: 5, min: 3, max: 15, helperText: "seconds" },
      {
        key: "resolution",
        cfParam: "resolution",
        label: "Resolution",
        type: "select",
        options: ["720p", "1080p"],
        defaultValue: "720p",
        cfValueMap: { "720p": "720P", "1080p": "1080P" },
      },
      { key: "negativePrompt", cfParam: "negative_prompt", label: "Negative prompt", type: "text", helperText: "What to avoid" },
      { key: "watermark", cfParam: "watermark", label: "Watermark", type: "switch", defaultValue: false },
      { key: "seed", cfParam: "seed", label: "Seed", type: "number" },
    ],
    outputPath: ["video"],
    outputKind: "url",
  },

  // ---------- Kling, on kie.ai ----------
  // Not Cloudflare models: these run through kie.ai's createTask/recordInfo
  // pair (runtime: "kie", see lib/kie-ai.ts), so the probe rule at the top of
  // this file does not apply to them. Every field, enum and default below
  // comes from kie.ai's published model docs (docs.kie.ai/market/kling/*,
  // read 2026-09-12), and the rates in credit-estimate.ts come from kie.ai's
  // own pricing table on the same day.
  //
  // What is deliberately NOT exposed: multi_prompt / elements /
  // kling_elements (arrays of objects with mutually exclusive rules the
  // dynamic form cannot describe) and Kling 3.0's paired first/last frame,
  // which the API takes as two entries of one image_urls array rather than
  // the separate parameter lastFrameCfParam models.
  {
    id: "kling/3.0",
    runtime: "kie",
    kieModel: "kling-3.0/video",
    label: "Kling 3.0",
    provider: "Kling",
    description: "Runs on kie.ai — up to 4K with native audio, optional reference image",
    category: "text-to-video",
    promptRequired: true,
    image: "optional",
    imageCfParam: "image_urls",
    imageParamShape: "urlArray",
    // Both are in the input's `required` list even for a single-shot run,
    // although the docs call multi_shots optional: without it createTask
    // answers "multi_shots cannot be empty" (2026-09-26). multi_prompt sits
    // after it in that list and only takes effect when multi_shots is true.
    staticParams: { multi_shots: false, multi_prompt: [] },
    fields: [
      // The API spells its quality tiers std/pro/4K. We keep resolutions
      // canonical so credit-estimate's rate table stays keyed like every
      // other model's, and translate on the wire.
      { key: "resolution", cfParam: "mode", label: "Resolution", type: "select", options: ["720p", "1080p", "4k"], defaultValue: "1080p", cfValueMap: { "720p": "std", "1080p": "pro", "4k": "4K" } },
      { key: "aspectRatio", cfParam: "aspect_ratio", label: "Aspect ratio", type: "select", options: ["16:9", "9:16", "1:1"], defaultValue: "16:9" },
      { key: "duration", cfParam: "duration", label: "Duration", type: "select", options: ["3", "5", "10", "15"], defaultValue: "5", helperText: "seconds" },
      { key: "audio", cfParam: "sound", label: "Native audio", type: "switch", defaultValue: false },
    ],
    // Unused on this runtime: kie.ai always answers with
    // resultJson.resultUrls, which checkKieAiTask reads. Kept because the
    // type demands it and an entry without it would read as an oversight.
    outputPath: [],
    outputKind: "url",
  },
  {
    id: "kling/3.0-omni",
    runtime: "kie",
    kieModel: "kling-3.0-omni/text-to-video",
    label: "Kling 3.0 Omni",
    provider: "Kling",
    description: "Runs on kie.ai — 3 to 15s, up to 4K with native audio",
    category: "text-to-video",
    promptRequired: true,
    image: "none",
    // customize_multi_shots defaults to TRUE on this model, and then demands
    // a multi_prompt array we never send. Pinned false so a single-prompt
    // request is a valid one.
    staticParams: { customize_multi_shots: false },
    fields: [
      { key: "resolution", cfParam: "resolution", label: "Resolution", type: "select", options: ["720p", "1080p", "4k"], defaultValue: "720p" },
      { key: "aspectRatio", cfParam: "aspect_ratio", label: "Aspect ratio", type: "select", options: ["16:9", "9:16", "1:1"], defaultValue: "16:9" },
      { key: "duration", cfParam: "duration", label: "Duration", type: "number", defaultValue: 5, min: 3, max: 15, helperText: "seconds" },
      { key: "audio", cfParam: "audio", label: "Native audio", type: "switch", defaultValue: false },
    ],
    outputPath: [],
    outputKind: "url",
  },
  {
    id: "kling/3.0-turbo",
    runtime: "kie",
    kieModel: "kling/v3-turbo-text-to-video",
    label: "Kling 3.0 Turbo",
    provider: "Kling",
    description: "Runs on kie.ai — faster Kling 3.0 at 720p or 1080p",
    category: "text-to-video",
    promptRequired: true,
    image: "none",
    fields: [
      { key: "resolution", cfParam: "resolution", label: "Resolution", type: "select", options: ["720p", "1080p"], defaultValue: "720p" },
      { key: "aspectRatio", cfParam: "aspect_ratio", label: "Aspect ratio", type: "select", options: ["16:9", "9:16", "1:1"], defaultValue: "16:9" },
      // This one spells its duration with the unit attached ("5s"), unlike
      // every sibling. Stored canonically as seconds, translated on the wire.
      { key: "duration", cfParam: "duration", label: "Duration", type: "select", options: ["3", "5", "10", "15"], defaultValue: "5", helperText: "seconds", cfValueMap: { "3": "3s", "5": "5s", "10": "10s", "15": "15s" } },
    ],
    outputPath: [],
    outputKind: "url",
  },
  {
    id: "kling/2.6",
    runtime: "kie",
    kieModel: "kling-2.6/text-to-video",
    label: "Kling 2.6",
    provider: "Kling",
    description: "Runs on kie.ai — 5s or 10s, optional native audio",
    category: "text-to-video",
    promptRequired: true,
    image: "none",
    // sound is a required field on 2.6, so it has to be on the wire even
    // when the switch was never touched. The field below overrides it.
    staticParams: { sound: false },
    fields: [
      { key: "aspectRatio", cfParam: "aspect_ratio", label: "Aspect ratio", type: "select", options: ["1:1", "16:9", "9:16"], defaultValue: "1:1" },
      { key: "duration", cfParam: "duration", label: "Duration", type: "select", options: ["5", "10"], defaultValue: "5", helperText: "seconds" },
      { key: "audio", cfParam: "sound", label: "Native audio", type: "switch", defaultValue: false },
    ],
    outputPath: [],
    outputKind: "url",
  },
  {
    id: "kling/2.6-image",
    runtime: "kie",
    kieModel: "kling-2.6/image-to-video",
    label: "Kling 2.6 Image",
    provider: "Kling",
    description: "Runs on kie.ai — animates one image, 5s or 10s with optional audio",
    category: "image-to-video",
    promptRequired: true,
    image: "required",
    imageCfParam: "image_urls",
    imageParamShape: "urlArray",
    staticParams: { sound: false },
    fields: [
      { key: "duration", cfParam: "duration", label: "Duration", type: "select", options: ["5", "10"], defaultValue: "5", helperText: "seconds" },
      { key: "audio", cfParam: "sound", label: "Native audio", type: "switch", defaultValue: false },
    ],
    outputPath: [],
    outputKind: "url",
  },
  {
    id: "kling/2.1-pro",
    runtime: "kie",
    kieModel: "kling/v2-1-pro",
    label: "Kling 2.1 Pro",
    provider: "Kling",
    description: "Runs on kie.ai — image to video with end-frame control",
    category: "image-to-video",
    promptRequired: true,
    image: "required",
    imageCfParam: "image_url",
    // The one Kling here with a separate closing-frame parameter, so the
    // end frame the composer already collects is forwarded rather than
    // dropped — see buildProviderInput.
    lastFrameCfParam: "tail_image_url",
    fields: [
      { key: "duration", cfParam: "duration", label: "Duration", type: "select", options: ["5", "10"], defaultValue: "5", helperText: "seconds" },
      { key: "negativePrompt", cfParam: "negative_prompt", label: "Negative prompt", type: "text", helperText: "What to avoid" },
      { key: "cfgScale", cfParam: "cfg_scale", label: "Prompt adherence", type: "number", defaultValue: 0.5, min: 0, max: 1, helperText: "0 loose, 1 strict" },
    ],
    outputPath: [],
    outputKind: "url",
  },
];

export function getCloudflareModel(id: string): CloudflareModelConfig | undefined {
  return CLOUDFLARE_MODELS.find((m) => m.id === id);
}

/** How many images the composer's reference list may hold. A list that
 *  shares the main image's param gives one of the provider's slots to that
 *  image. */
export function referenceImageSlots(config: CloudflareModelConfig): number {
  const refs = config.referenceImages;
  if (!refs) return 0;
  return refs.cfParam === config.imageCfParam ? refs.max - 1 : refs.max;
}
