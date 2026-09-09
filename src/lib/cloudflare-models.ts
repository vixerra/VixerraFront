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

export type CloudflareModelConfig = {
  /** Exact Cloudflare model id, e.g. "recraft/recraftv4-1". First-party
   *  models need the "@cf/" prefix; partner models must NOT have it. */
  id: string;
  label: string;
  provider: string;
  description: string;
  category: "text-to-image" | "text-to-video" | "image-to-video";
  promptRequired: boolean;
  image: "none" | "optional" | "required";
  imageCfParam?: string;
  /** grok wants `{ url }` (its schema calls the field `image.url`), veo-3.1
   *  wants a raw base64-encoded image (fetched and re-encoded server-side,
   *  see generation-runner.ts), nano-banana-pro demands an array in
   *  `image_input`, and most others want a bare URL string. */
  imageParamShape?: "string" | "urlObject" | "base64" | "urlArray";
  /** Cloudflare param for a closing-frame reference image, for the models
   *  that accept one. runCloudflareJob already resolves the stored
   *  lastFrameImage to a signed URL for the Seedance path, so wiring it
   *  here just forwards that same value. */
  lastFrameCfParam?: string;
  /** Extra tunable params exposed in the dynamic form. */
  fields: DynamicField[];
  /** Params always sent as-is, not user-editable (e.g. a fixed operation). */
  staticParams?: Record<string, string | number | boolean>;
  /** Merged over staticParams when the request HAS an input image, and
   *  when it doesn't, respectively. FLUX 3 Video is a discriminated union
   *  on `mode`: "t2v" takes a prompt, "i2v" takes `keyframes` instead of
   *  `image`, and sending the wrong one is a 400. */
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
      { key: "n", cfParam: "n", label: "Number of images", type: "number", defaultValue: 1, min: 1, max: 4 },
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
  // The probe also reports `n` accepts up to 10, not 4 — but see the note on
  // seedream-4.5 below: this pipeline persists exactly one result URL, so any
  // n > 1 bills for images that are then dropped. Left at its existing bounds
  // rather than widened.
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
      { key: "n", cfParam: "n", label: "Number of images", type: "number", defaultValue: 1, min: 1, max: 4 },
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
  // Verified enum: resolution is "480p"|"720p" only — the 1080p option this
  // entry used to offer is not accepted by the model.
  {
    id: "bytedance/seedance-2.0-mini",
    label: "Seedance 2.0 Mini",
    provider: "ByteDance",
    description: "Compact & cost-efficient",
    category: "text-to-video",
    promptRequired: true,
    image: "optional",
    imageCfParam: "image",
    fields: [
      { key: "duration", cfParam: "duration", label: "Duration", type: "number", defaultValue: 5, min: 4, max: 12, helperText: "seconds" },
      { key: "resolution", cfParam: "resolution", label: "Resolution", type: "select", options: ["480p", "720p"], defaultValue: "720p" },
      { key: "aspectRatio", cfParam: "aspect_ratio", label: "Aspect ratio", type: "select", options: ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9", "9:21"], defaultValue: "16:9" },
      { key: "cameraFixed", cfParam: "camera_fixed", label: "Fix camera position", type: "switch", defaultValue: false },
      { key: "generateAudio", cfParam: "generate_audio", label: "Generate audio", type: "switch", defaultValue: true },
      { key: "watermark", cfParam: "watermark", label: "Watermark", type: "switch", defaultValue: false },
      { key: "useVirtualAvatar", cfParam: "use_virtual_avatar", label: "Virtual avatar mode", type: "switch", defaultValue: true },
      { key: "seed", cfParam: "seed", label: "Seed", type: "number" },
    ],
    outputPath: ["video"],
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
  // The operation discriminator is `_operation` (leading underscore), not
  // `operation` — the old spelling was rejected as an unsupported field.
  {
    id: "xai/grok-imagine-video",
    label: "Grok Imagine Video",
    provider: "xAI",
    description: "Native synchronized audio",
    category: "text-to-video",
    promptRequired: true,
    image: "optional",
    imageCfParam: "image",
    imageParamShape: "urlObject",
    fields: [
      { key: "duration", cfParam: "duration", label: "Duration", type: "number", defaultValue: 5, min: 1, max: 15, helperText: "seconds" },
      { key: "aspectRatio", cfParam: "aspect_ratio", label: "Aspect ratio", type: "select", options: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"], defaultValue: "16:9" },
      { key: "resolution", cfParam: "resolution", label: "Resolution", type: "select", options: ["480p", "720p"], defaultValue: "720p" },
    ],
    staticParams: { _operation: "generate" },
    outputUploadTarget: { cfParam: "output", urlKey: "upload_url", contentType: "video/mp4" },
    outputPath: ["video"],
    outputKind: "url",
  },
  {
    id: "xai/grok-imagine-video-1.5-preview",
    label: "Grok Imagine Video 1.5 Preview",
    provider: "xAI",
    description: "Next-gen quality improvements",
    category: "text-to-video",
    promptRequired: true,
    image: "optional",
    imageCfParam: "image",
    imageParamShape: "urlObject",
    fields: [
      { key: "duration", cfParam: "duration", label: "Duration", type: "number", defaultValue: 5, min: 1, max: 15, helperText: "seconds" },
      { key: "aspectRatio", cfParam: "aspect_ratio", label: "Aspect ratio", type: "select", options: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"], defaultValue: "16:9" },
      { key: "resolution", cfParam: "resolution", label: "Resolution", type: "select", options: ["480p", "720p"], defaultValue: "720p" },
    ],
    staticParams: { _operation: "generate" },
    outputUploadTarget: { cfParam: "output", urlKey: "upload_url", contentType: "video/mp4" },
    outputPath: ["video"],
    outputKind: "url",
  },
  // Verified as already correct: prompt, image_input, duration ("4s"/"6s"/
  // "8s"), aspect_ratio, resolution, generate_audio.
  {
    id: "google/veo-3.1",
    label: "Veo 3.1",
    provider: "Google",
    description: "Google's flagship video model, native audio & zero data retention",
    category: "text-to-video",
    promptRequired: true,
    image: "optional",
    imageCfParam: "image_input",
    imageParamShape: "base64",
    fields: [
      { key: "duration", cfParam: "duration", label: "Duration", type: "select", options: ["4s", "6s", "8s"], defaultValue: "6s" },
      { key: "resolution", cfParam: "resolution", label: "Resolution", type: "select", options: ["720p", "1080p"], defaultValue: "720p" },
      { key: "aspectRatio", cfParam: "aspect_ratio", label: "Aspect ratio", type: "select", options: ["16:9", "9:16", "1:1"], defaultValue: "16:9" },
      { key: "generateAudio", cfParam: "generate_audio", label: "Generate audio", type: "switch", defaultValue: true },
    ],
    outputPath: ["video"],
    outputKind: "url",
  },
  {
    id: "google/veo-3.1-fast",
    label: "Veo 3.1 Fast",
    provider: "Google",
    description: "Lower-latency Veo variant, same quality & native audio",
    category: "text-to-video",
    promptRequired: true,
    image: "optional",
    imageCfParam: "image_input",
    imageParamShape: "base64",
    fields: [
      { key: "duration", cfParam: "duration", label: "Duration", type: "select", options: ["4s", "6s", "8s"], defaultValue: "6s" },
      { key: "resolution", cfParam: "resolution", label: "Resolution", type: "select", options: ["720p", "1080p"], defaultValue: "720p" },
      { key: "aspectRatio", cfParam: "aspect_ratio", label: "Aspect ratio", type: "select", options: ["16:9", "9:16", "1:1"], defaultValue: "16:9" },
      { key: "generateAudio", cfParam: "generate_audio", label: "Generate audio", type: "switch", defaultValue: true },
    ],
    outputPath: ["video"],
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
];

export function getCloudflareModel(id: string): CloudflareModelConfig | undefined {
  return CLOUDFLARE_MODELS.find((m) => m.id === id);
}
