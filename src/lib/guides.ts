// Long-form guides at /guides.
//
// The site is otherwise almost entirely visual, which gives a crawler very
// little to read and nothing to rank on beyond the brand name. These pages
// exist to carry the written half: what the models do, how to choose between
// them, and what the words in a prompt are actually for.
//
// Same accuracy rule as model-seo.ts — anything a guide states about a model,
// a plan or a limit has to be true of this app today. Plan facts are pulled
// from TIER_INFO at render time (see planFacts below) rather than typed into
// the copy, so a pricing change can't leave a guide lying.
//
// Body copy is a small block list rather than raw HTML: it keeps the source
// readable, keeps heading levels consistent for the outline a crawler builds,
// and means no page here can inject markup. Inline links use a markdown-ish
// [label](/href), parsed in guide-body.tsx.

import { TIER_INFO } from "@/lib/constants";

export type GuideBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "note"; text: string };

export type GuidePost = {
  slug: string;
  title: string;
  /** <title> and H1 can differ — the H1 gets to be longer. */
  metaTitle: string;
  description: string;
  /** ISO date. Shown, and used as the sitemap's lastModified. */
  published: string;
  updated?: string;
  readingMinutes: number;
  /** Short lead paragraph, shown under the H1 and reused as the card blurb. */
  excerpt: string;
  body: GuideBlock[];
  /** Model landing pages this guide is about, cross-linked in a footer block. */
  relatedModelSlugs: string[];
};

const FREE_CREDITS = TIER_INFO.free.monthlyCredits;
const STARTER = TIER_INFO.starter;
const CREATOR = TIER_INFO.creator;
const STUDIO = TIER_INFO.studio;

export const GUIDE_POSTS: GuidePost[] = [
  // -------------------------------------------------------------------------
  {
    slug: "photo-to-ai-video",
    title: "How to turn a photo into an AI video",
    metaTitle: "How to turn a photo into an AI video (2026 guide)",
    description:
      "A practical guide to image-to-video: which models really read a reference photo, how to write a motion-only prompt, and how to stop a subject drifting.",
    published: "2026-09-08",
    readingMinutes: 7,
    excerpt:
      "Image-to-video is the most reliable way to get an AI video of something specific — your product, your face, your artwork — because the model starts from a picture instead of guessing what you meant. Here is how to do it well.",
    relatedModelSlugs: ["happyhorse-1-1", "wan-2-7", "seedance-2-5", "vidu-q3-pro"],
    body: [
      {
        type: "p",
        text: "Text-to-video is impressive and unpredictable. You describe a scene, the model invents everything in it, and the thing you get back is a plausible interpretation rather than the shot you had in mind. That is fine for a mood piece and useless when the video has to contain your actual product.",
      },
      {
        type: "p",
        text: "Image-to-video removes most of that uncertainty. You give the model a still — a photograph, a render, a piece of artwork — and the prompt stops describing *what exists* and starts describing *what happens*. The subject is settled before generation begins.",
      },
      { type: "h2", text: "Pick a model that actually reads the image" },
      {
        type: "p",
        text: "Not every model that accepts an upload uses it. Some providers list an image field in their schema, take the file, and then generate as though you had sent nothing — the request succeeds, you get billed, and your product is not in the video. On [Vixerra](/models) the model pages state this explicitly: the reference-image row on each one says *Required*, *Optional* or *Not used*.",
      },
      {
        type: "p",
        text: "Three broad groups are worth knowing about:",
      },
      {
        type: "ul",
        items: [
          "**Image-required models.** [HappyHorse 1.1](/generate/happyhorse-1-1) and [Wan 2.7](/generate/wan-2-7) have no text-only mode at all. The still you upload is the subject, and the prompt only directs motion. These are the safest choice when fidelity to the source photo matters more than anything else.",
          "**Image-optional models with strong reference handling.** [Seedance 2.5](/generate/seedance-2-5) holds a subject's identity across a long take from a single reference; [Seedance 2.0](/generate/seedance-2-0) takes up to four subject references at once, which is what you want when a clip has to feature more than one recurring person or object.",
          "**First-and-last-frame models.** [Vidu Q3 Pro](/generate/vidu-q3-pro) and [P-Video](/generate/p-video) accept both an opening and a closing image. That turns the generation into an in-between: you supply where the shot starts and where it ends, and the model fills the motion.",
        ],
      },
      { type: "h2", text: "Start from a better still" },
      {
        type: "p",
        text: "Everything about the output is downstream of the input. A model cannot invent detail that was never in the source, and it will happily invent detail that was ambiguous in it.",
      },
      {
        type: "ol",
        items: [
          "**Use the highest resolution you have.** A phone photo straight from the camera roll beats the same photo after a messaging app has recompressed it.",
          "**Crop to the aspect ratio you want out.** Models that take a reference image usually ignore the aspect-ratio parameter and follow the image instead. Crop to 9:16 before uploading if the result is going on TikTok.",
          "**Keep the subject unobstructed.** A hand across a product label, a face half out of frame, motion blur on the thing that matters — all of these give the model licence to redraw the ambiguous part.",
          "**Prefer even, directional light.** Hard mixed lighting is the most common cause of features drifting between frames.",
        ],
      },
      { type: "h2", text: "Write a motion prompt, not a scene prompt" },
      {
        type: "p",
        text: "This is where most first attempts go wrong. People upload a photograph of a bottle and then write the prompt they would have written for text-to-video: *a matte black perfume bottle on a mirrored plinth, studio lighting, luxury advertisement*. The model now has two descriptions of the subject — the image and the sentence — and where they disagree, it compromises. The bottle changes shape.",
      },
      {
        type: "p",
        text: "Describe only what changes. Assume the model can already see everything else:",
      },
      {
        type: "ul",
        items: [
          "*Slow push in on the subject, background falling out of focus, everything else held still.*",
          "*The subject smiles slowly and turns their head toward the camera, hair moving slightly.*",
          "*The camera cranes up and back to reveal the wider room.*",
        ],
      },
      {
        type: "p",
        text: "Camera vocabulary is worth learning because it is unusually well understood by these models: *push in*, *pull back*, *pan left*, *tilt down*, *orbit*, *crane up*, *handheld follow*, *locked off*. So are motion qualifiers — *slow*, *gentle*, *sudden*, *continuous* — which do more work than any adjective about the subject.",
      },
      { type: "h3", text: "Use the negative prompt to hold things still" },
      {
        type: "p",
        text: "Both Alibaba image-to-video models take a negative prompt, and on an animation job its most useful job is suppression rather than aesthetics. *Background people moving, camera shake, text appearing, hands changing shape* is a more effective negative prompt than *low quality, blurry*.",
      },
      { type: "h2", text: "Keep clips short, then join them" },
      {
        type: "p",
        text: "Drift accumulates. A face that is perfect for two seconds may be subtly wrong by eight, because each frame is conditioned on the last. If a shot only needs three seconds, ask for three seconds — it is cheaper, faster, and more likely to hold.",
      },
      {
        type: "p",
        text: "For anything longer, generate several short clips from the same reference image and cut them together rather than asking for one long take. The exception is [Seedance 2.5](/generate/seedance-2-5), which is built for long single takes and is the model to reach for when a shot genuinely has to run without a cut.",
      },
      { type: "h2", text: "A workable process" },
      {
        type: "ol",
        items: [
          "Pick the still and crop it to your delivery ratio.",
          "Draft on a cheap model first — [Seedance 2.0 Mini](/generate/seedance-2-0-mini) or [Vidu Q3 Turbo](/generate/vidu-q3-turbo) — to find out whether the motion idea works at all.",
          "Rewrite the prompt so it describes only motion and camera.",
          "Re-run the same prompt on the model you actually want to deliver from.",
          "Generate two or three takes; motion is stochastic and the second take is often the good one.",
        ],
      },
      {
        type: "note",
        text: `Every generation costs credits based on the model, resolution and duration, and the exact cost is shown before you press generate. New accounts get ${FREE_CREDITS} credits to experiment with — see [pricing](/pricing) for what the paid plans include.`,
      },
      { type: "h2", text: "Common failure modes" },
      {
        type: "ul",
        items: [
          "**The subject morphs.** Usually too long a duration, or a prompt that re-describes the subject. Shorten the clip and strip the subject description out of the prompt.",
          "**Nothing moves.** The prompt described a state rather than an action. *A calm lake at dawn* gives a still image with grain; *mist drifting across a calm lake at dawn, reeds moving in the foreground* gives a video.",
          "**The wrong thing moves.** Add the unwanted motion to the negative prompt, or lock the camera if the model supports it — [Seedance 2.0](/generate/seedance-2-0) has a genuine fixed-camera mode.",
          "**The upload was ignored.** Check the model's reference-image row. Some models accept a file and use nothing from it.",
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    slug: "seedance-2-5-vs-veo-3-1",
    title: "Seedance 2.5 vs Veo 3.1: which AI video model should you use?",
    metaTitle: "Seedance 2.5 vs Veo 3.1 — AI video model comparison",
    description:
      "Seedance 2.5 and Veo 3.1 compared: clip length, resolution, audio, reference control, data retention — and which jobs each one actually wins.",
    published: "2026-09-08",
    readingMinutes: 8,
    excerpt:
      "Both generate video with sound from a written prompt. They are good at genuinely different things, and picking the wrong one is the most common reason a generation disappoints.",
    relatedModelSlugs: ["seedance-2-5", "veo-3-1", "veo-3-1-fast", "seedance-2-0"],
    body: [
      {
        type: "p",
        text: "Seedance 2.5 and Veo 3.1 are the two flagship video models on [Vixerra](/models), and the question of which to use comes up constantly. The short answer: Seedance wins on length and on keeping a specific subject consistent; Veo wins on physical plausibility and on data handling. The longer answer is below.",
      },
      { type: "h2", text: "Clip length is the biggest single difference" },
      {
        type: "p",
        text: "[Veo 3.1](/generate/veo-3-1) generates fixed-length clips — you pick from a short list of durations, and every generation lands exactly on one of them. That predictability is genuinely useful when you are cutting to a grid or budgeting credits, but it puts a hard ceiling on a single take.",
      },
      {
        type: "p",
        text: "[Seedance 2.5](/generate/seedance-2-5) runs far longer from one generation, and it also offers an adaptive duration where the model chooses the length the prompt implies. If the shot you want is a continuous performance — a dance, a walk-and-talk, a long product reveal — Seedance is the only one of the two that can do it without cutting.",
      },
      { type: "h3", text: "Why length matters more than it sounds" },
      {
        type: "p",
        text: "Joining two AI clips is not free. Even from the same prompt and the same seed, two generations differ in lighting, background detail and subject proportions, so the cut between them reads as a cut. A single long take avoids that problem entirely. If continuity across a shot is the point, generate it as one clip.",
      },
      { type: "h2", text: "Both generate audio, in different ways" },
      {
        type: "p",
        text: "This is a real change from the previous generation of video models, where you generated silent footage and scored it afterwards. Both models here produce a soundtrack together with the picture, which is why footsteps land on the footfall and lip movement lines up with speech.",
      },
      {
        type: "p",
        text: "Veo's audio is the more consistent of the two on ambience and effects — room tone, weather, traffic. Seedance is the stronger choice when the audio has to track a performance closely over a long take, because it is generating that whole take at once.",
      },
      { type: "h2", text: "Reference control: Seedance's advantage" },
      {
        type: "p",
        text: "Veo 3.1 accepts an optional reference image as the opening frame. Seedance 2.5 does something more useful: it holds a subject's identity from the reference across the entire clip, which is what makes it viable for product film where the product must remain recognisably itself.",
      },
      {
        type: "p",
        text: "If you need more than one recurring subject, [Seedance 2.0](/generate/seedance-2-0) takes up to four subject references at once and adds a genuine fixed-camera mode — the pick for packshots and turntables where any camera drift ruins the shot.",
      },
      { type: "h2", text: "Data retention: Veo's advantage" },
      {
        type: "p",
        text: "Veo 3.1 runs under zero data retention. Nothing you send is kept. For agency and brand work that is often not a preference but a contractual requirement, and it settles the question on its own regardless of what the footage looks like.",
      },
      { type: "h2", text: "Speed and cost" },
      {
        type: "p",
        text: "Longer clips at higher resolutions cost more, on every model — credit cost scales with the compute a generation actually consumes, and the exact figure is shown before you submit. In practice that makes Seedance's long takes the more expensive generations on the platform, and short Veo clips comparatively cheap.",
      },
      {
        type: "p",
        text: "[Veo 3.1 Fast](/generate/veo-3-1-fast) is worth knowing about here: same prompts, same durations, same audio, noticeably lower latency. Iterate on Fast, deliver on standard Veo. For Seedance, the equivalent draft tier is [Seedance 2.0 Mini](/generate/seedance-2-0-mini), the cheapest video model in the catalog.",
      },
      { type: "h2", text: "Which to pick" },
      { type: "h3", text: "Choose Seedance 2.5 when" },
      {
        type: "ul",
        items: [
          "The shot has to run longer than a few seconds without a cut.",
          "A specific product, face or set has to stay recognisably itself throughout.",
          "You are working from a reference image and fidelity to it is the point.",
          "You want the model to choose a duration that fits the action.",
        ],
      },
      { type: "h3", text: "Choose Veo 3.1 when" },
      {
        type: "ul",
        items: [
          "The footage must not be retained or used for training.",
          "The scene depends on physical plausibility — liquids, fabric, crowds, vehicles.",
          "You want predictable clip lengths for a timeline you are cutting to.",
          "Ambient sound design matters as much as the picture.",
        ],
      },
      { type: "h2", text: "The honest answer: run both" },
      {
        type: "p",
        text: "The same prompt produces meaningfully different results on these two models, and which one is better for *your* shot is not reliably predictable from a comparison table. Both are on the same account and the same credit balance here, so the practical move is to run your real prompt on both once and let the output decide.",
      },
      {
        type: "note",
        text: `New accounts start with ${FREE_CREDITS} credits and no credit card. Watermark-free video and a commercial licence begin at the ${STARTER.label} plan ($${STARTER.priceMonthly}/month) — see [pricing](/pricing).`,
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    slug: "ai-video-generator-no-watermark",
    title: "AI video generators without a watermark: what to look for in 2026",
    metaTitle: "AI video generator with no watermark — 2026 guide",
    description:
      "Why AI video tools add watermarks, what a watermark-free export really requires, and how licensing, resolution caps and credits fit together.",
    published: "2026-09-08",
    readingMinutes: 6,
    excerpt:
      "\"No watermark\" is the most searched-for feature in AI video and the least precisely defined. Here is what it actually means, and what to check before you commit a campaign to a tool.",
    relatedModelSlugs: ["seedance-2-5", "veo-3-1", "flux-3-video", "hailuo-2-3"],
    body: [
      {
        type: "p",
        text: "Almost every AI video tool watermarks its free output. That is a business decision rather than a technical limit: the watermark is what stops a free tier from being a complete product, and removing it is the first thing nearly every paid plan sells.",
      },
      {
        type: "p",
        text: "The confusing part is that \"no watermark\" gets used to mean at least three different things. Before choosing a tool, work out which one is being promised.",
      },
      { type: "h2", text: "Three things \"no watermark\" can mean" },
      { type: "h3", text: "1. No overlay burned into the picture" },
      {
        type: "p",
        text: "The literal reading: no logo in the corner of the frame. This is the one people mean when they search for it, and the one a paid plan usually removes.",
      },
      { type: "h3", text: "2. No provider-side watermark on the model's own output" },
      {
        type: "p",
        text: "Several video models take a watermark parameter of their own, independent of the platform running them. A tool can strip its own overlay and still pass a provider watermark flag through. Worth checking that the model-level toggle exists and is off.",
      },
      { type: "h3", text: "3. A licence that lets you actually use the footage" },
      {
        type: "p",
        text: "The one that matters most and gets checked least. A clean-looking export you are not licensed to use commercially is not usable for client work. Watermark removal and commercial licensing are separate things, and on most platforms — including this one — they arrive on the same plan but for different reasons.",
      },
      {
        type: "note",
        text: `On Vixerra, watermark-free video and a commercial licence both start at the ${STARTER.label} plan ($${STARTER.priceMonthly}/month). The ${TIER_INFO.free.label} plan watermarks video and does not include a commercial licence — it is there to try the models, not to ship with.`,
      },
      { type: "h2", text: "What else to check alongside the watermark" },
      { type: "h3", text: "Resolution ceiling" },
      {
        type: "p",
        text: `A watermark-free 480p clip is still not deliverable. Look at the resolution the plan actually permits, not the resolution the model supports — the two are often different. Here, ${STARTER.label} and ${CREATOR.label} allow up to ${STARTER.maxResolution}, and ${STUDIO.label} goes to ${STUDIO.maxResolution}.`,
      },
      { type: "h3", text: "Clip length ceiling" },
      {
        type: "p",
        text: `Plans cap duration as well as resolution, and duration is where the compute cost lives. ${STARTER.label} allows clips up to ${STARTER.maxDurationSeconds} seconds; ${CREATOR.label} and ${STUDIO.label} go to ${STUDIO.maxDurationSeconds}. A model that can generate a 30-second take is no help on a plan that stops at five.`,
      },
      { type: "h3", text: "How the pricing unit works" },
      {
        type: "p",
        text: "Per-generation pricing is misleading on its own, because a 4-second 480p clip and a 20-second 1080p clip are not remotely the same amount of compute. A credit system that prices each generation by model, resolution and duration — and shows you the number before you submit — is more predictable than a flat \"200 videos a month\" claim that quietly means 200 short, low-resolution ones.",
      },
      { type: "h3", text: "Whether you can get the file out" },
      {
        type: "p",
        text: "Check that finished video downloads as a plain MP4 rather than being locked into an in-app player or a share link. Everything generated here exports as MP4 (MOV on the models that offer it), and images as standard PNG or JPEG.",
      },
      { type: "h2", text: "Do not remove watermarks from other people's output" },
      {
        type: "p",
        text: "There is a genre of tool that offers to strip watermarks from video you did not generate. Leave it alone. A watermark on someone else's footage is a licensing signal, and removing it does not grant you a licence — it just removes the evidence that you did not have one. The legitimate version of \"no watermark\" is generating the footage yourself on a plan that includes clean export and commercial rights.",
      },
      { type: "h2", text: "A short checklist" },
      {
        type: "ol",
        items: [
          "Does the paid plan remove the overlay, and is that stated rather than implied?",
          "Does it come with a commercial licence?",
          "What resolution and clip length does the plan itself allow?",
          "Is generation priced by actual compute, with the cost shown before you commit?",
          "Can you download a standard file?",
          "Which models are included — one house model, or a real catalog you can pick from?",
        ],
      },
      {
        type: "p",
        text: "On that last point: model choice matters more than it looks. [Veo 3.1](/generate/veo-3-1) is a different tool from [Seedance 2.5](/generate/seedance-2-5), which is different again from [Flux 3 Video](/generate/flux-3-video). A platform that gives you [all of them on one balance](/models) means a disappointing generation is a model change rather than a new subscription.",
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    slug: "ai-ad-creative-guide",
    title: "How to create ad creative with AI",
    metaTitle: "How to create ad creative with AI — a practical guide",
    description:
      "A working process for AI ad creative: keeping the real product in frame, getting readable copy into an image, and rendering each placement natively.",
    published: "2026-09-08",
    readingMinutes: 8,
    excerpt:
      "The hard part of AI ad creative is not making something that looks good. It is making something that contains your actual product, with legible copy, in the right shape for the placement.",
    relatedModelSlugs: ["gpt-image-2", "seedance-2-0", "seedance-2-5", "nano-banana-pro"],
    body: [
      {
        type: "p",
        text: "Generic AI imagery is easy and nearly worthless for advertising. What a campaign needs is the specific product, recognisable, with the brand's copy readable in frame, delivered in three or four aspect ratios. Each of those is a solvable problem, and each needs a different part of the toolkit.",
      },
      { type: "h2", text: "Problem 1: keeping the real product in frame" },
      {
        type: "p",
        text: "A model asked to invent a bottle of face serum invents a plausible one. It will not be yours. The fix is to supply the product as a reference image and pick a model that genuinely uses it.",
      },
      {
        type: "ul",
        items: [
          "For **video**, [Seedance 2.0](/generate/seedance-2-0) takes up to four subject references and can lock the camera — the combination that makes a clean product turntable possible. [Seedance 2.5](/generate/seedance-2-5) holds a single subject across a longer take.",
          "For **images**, [Seedream 5 Pro](/generate/seedream-5-pro) and [Grok Imagine Quality](/generate/grok-imagine-image-quality) both edit from a supplied reference. Several other image models accept an upload and ignore it, so check the reference-image row on the model page before relying on one.",
        ],
      },
      {
        type: "p",
        text: "Then write the prompt as direction rather than description. The image already says what the product looks like; the prompt should say where it is, how it is lit, and what the camera does. Re-describing the product in words is what causes it to drift away from the reference.",
      },
      { type: "h2", text: "Problem 2: readable copy in the image" },
      {
        type: "p",
        text: "Text rendering is the sharpest quality difference between image models right now. Most of them approximate letterforms convincingly at a glance and fall apart on inspection, which is fine for a background and fatal for packaging.",
      },
      {
        type: "p",
        text: "[GPT Image 2](/generate/gpt-image-2) is the model to use when words are in the frame — packaging copy, signage, ingredient lists, headline lockups. Ask for the exact string you want in quotes, keep it short, and specify where it sits: *the words \"COLD BREW\" printed in bold sans-serif across the lower third of the can*.",
      },
      {
        type: "note",
        text: "Even the best text rendering is not typesetting. For anything where the wordmark must be exact — a logo, a legal line, a price — generate the image without it and set the type over the top afterwards.",
      },
      { type: "h2", text: "Problem 3: one idea, five placements" },
      {
        type: "p",
        text: "A campaign needs a 9:16 for Stories and Reels, a 1:1 for feed, a 16:9 for YouTube, and often a wide banner. Cropping one render down to all of them loses the composition every time.",
      },
      {
        type: "p",
        text: "Two better approaches:",
      },
      {
        type: "ol",
        items: [
          "**Generate each ratio natively.** Run the same prompt at each aspect ratio the model offers. [Nano Banana Pro](/generate/nano-banana-pro) has the widest set of ratios in the image catalog; [Grok Imagine](/generate/grok-imagine-image) covers the extreme wide and tall crops most models skip.",
          "**Generate large, then crop deliberately.** Render at high resolution with headroom around the subject and cut each placement by hand. Slower, but it keeps a single composition recognisable across the set.",
        ],
      },
      { type: "h2", text: "A production process that works" },
      {
        type: "ol",
        items: [
          "**Write the brief as a shot, not a mood.** \"Product on wet slate, hard side light from the left, shallow depth of field, cool palette\" beats \"premium, modern, aspirational\".",
          "**Draft cheap.** [Nano Banana 2 Lite](/generate/nano-banana-2-lite) for images, [Seedance 2.0 Mini](/generate/seedance-2-0-mini) for video. Find the composition before spending flagship credits.",
          "**Lock the still first.** Get the hero image right, then animate it — an image-to-video pass from an approved still is far more predictable than generating video from scratch.",
          "**Render the finals natively per ratio.**",
          "**Set type on top.** Headline, logo and legal in your design tool, not in the prompt.",
        ],
      },
      { type: "h2", text: "What to keep out of the prompt" },
      {
        type: "ul",
        items: [
          "**Brand names of other companies.** Asking for the look of a named competitor's campaign produces derivative work and legal exposure. Describe the lighting and composition you admire instead.",
          "**Real people who have not agreed to it.** Use your own talent, with a release, as a reference image.",
          "**Claims.** \"Clinically proven\" rendered onto a pack shot is a regulatory problem, not a design one.",
          "**Everything at once.** Prompts that specify twenty things get roughly half of them. Specify the five that matter and let the model handle the rest.",
        ],
      },
      { type: "h2", text: "Where the workflow lives" },
      {
        type: "p",
        text: `The marketing studio and the editing studio — upload a product and talent shot, generate ad-ready output from a style, then trim, caption, add music and export a finished MP4 — are on the ${CREATOR.label} and ${STUDIO.label} plans, along with publishing straight to TikTok, Instagram, YouTube and Facebook. Generation and your gallery are on every plan. See [pricing](/pricing) for the full comparison.`,
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    slug: "text-to-video-guide",
    title: "Text to video: the complete guide",
    metaTitle: "Text to video AI — the complete guide (2026)",
    description:
      "How text-to-video models work in practice, how to structure a prompt, what duration and resolution really cost, and how to choose a model.",
    published: "2026-09-08",
    readingMinutes: 10,
    excerpt:
      "Everything that matters about generating video from a written prompt: how to structure one, which parameters change the result, what they cost, and how to pick a model.",
    relatedModelSlugs: ["seedance-2-5", "veo-3-1", "flux-3-video", "grok-imagine-video"],
    body: [
      {
        type: "p",
        text: "Text to video is exactly what it sounds like: you write a description, and a model generates a video clip from it. What is less obvious is how much of the result is determined by things other than the words — duration, resolution, aspect ratio, and above all which model you picked.",
      },
      { type: "h2", text: "How a generation actually goes" },
      {
        type: "ol",
        items: [
          "You write a prompt and set parameters — duration, resolution, aspect ratio, whether to generate audio.",
          "The request is queued and the model renders the clip. Most finish in well under a minute; longer and higher-resolution clips take proportionally longer.",
          "You get back a video file — MP4, or MOV on the models that offer it — together with the prompt and parameters that produced it, so a good result can be reproduced.",
        ],
      },
      {
        type: "p",
        text: "Generation is stochastic. The same prompt run twice gives two different clips. That is not a defect to work around; it is the reason generating three takes and picking one is the normal workflow rather than a sign something went wrong.",
      },
      { type: "h2", text: "How to structure a prompt" },
      {
        type: "p",
        text: "A prompt that works reads like a shot description from a treatment, not like a search query. Four components, roughly in this order:",
      },
      {
        type: "ul",
        items: [
          "**Subject** — who or what is in frame, and what they are doing. *A boxy 1980s four-wheel-drive rally car comes through a long left-hander.*",
          "**Setting** — where, and when. *A night stage of a gravel rally, in the pines.*",
          "**Camera** — the shot itself. *Low tracking shot from the outside of the corner, held.*",
          "**Light and mood** — *headlights raking the trunks, gravel spray backlit by the follow car.*",
        ],
      },
      { type: "h3", text: "Things that reliably help" },
      {
        type: "ul",
        items: [
          "**Verbs over adjectives.** *Dust lifting off the boards* is worth more than *dusty, atmospheric*.",
          "**One camera move per clip.** A prompt asking for a push-in, a whip pan and a crane in three seconds gets none of them cleanly.",
          "**Real lighting vocabulary.** *Backlit*, *hard key from the left*, *practical lamps*, *golden hour*, *overcast* — these are understood precisely.",
          "**A stated duration in the parameters, not in the prompt.** Writing \"a 30-second clip\" in the prompt does nothing; the duration parameter does.",
        ],
      },
      { type: "h3", text: "Things that reliably do not" },
      {
        type: "ul",
        items: [
          "Stacking quality words — *4k, ultra realistic, masterpiece, best quality*. Resolution is a parameter. The rest is noise.",
          "Negative instructions in the positive prompt. *No text* often produces text. Use the negative prompt field on models that have one.",
          "Twenty specific requirements. Models satisfy roughly the first handful and improvise the rest.",
        ],
      },
      { type: "h2", text: "The parameters that change the result" },
      { type: "h3", text: "Duration" },
      {
        type: "p",
        text: "The single biggest driver of both cost and quality. Longer clips cost more because they are more compute, and they drift more because each frame is conditioned on the last. Ask for the length you need and no more. Models differ enormously here: some generate one-second cuts, [Seedance 2.5](/generate/seedance-2-5) runs long single takes, and [Flux 3 Video](/generate/flux-3-video) has the widest range of the registry models.",
      },
      { type: "h3", text: "Resolution" },
      {
        type: "p",
        text: "Draft at the lowest resolution the model offers and deliver at the highest your plan allows. Composition, motion and timing are all judgeable at 480p, and re-running a working prompt at 1080p is cheaper than discovering at 1080p that the composition was wrong.",
      },
      { type: "h3", text: "Aspect ratio" },
      {
        type: "p",
        text: "Generate natively in the ratio you will publish in. Cropping 16:9 down to 9:16 throws away most of the frame and usually the subject with it. Note that models which accept a reference image generally follow the image's shape and ignore this parameter — crop the reference first.",
      },
      { type: "h3", text: "Audio" },
      {
        type: "p",
        text: "Most current video models generate a soundtrack together with the picture rather than as a separate pass, which is why the sound lines up with the motion. If you are going to replace the audio in an edit anyway, turning it off is usually the cheaper generation.",
      },
      { type: "h2", text: "Choosing a model" },
      {
        type: "p",
        text: "There is no overall best one. There are models that win specific jobs:",
      },
      {
        type: "ul",
        items: [
          "**Long single takes, consistent subject** — [Seedance 2.5](/generate/seedance-2-5).",
          "**Physical plausibility, zero data retention** — [Veo 3.1](/generate/veo-3-1), with [Veo 3.1 Fast](/generate/veo-3-1-fast) for iteration.",
          "**Locked-off product shots at high resolution** — [Seedance 2.0](/generate/seedance-2-0).",
          "**Very short cuts for fast-cut edits** — [Grok Imagine Video](/generate/grok-imagine-video).",
          "**Wide cinematic framing with a cheap draft mode** — [Flux 3 Video](/generate/flux-3-video).",
          "**Terse prompts you would rather not write out** — [Hailuo 2.3](/generate/hailuo-2-3), which expands them for you.",
          "**Frame-rate control and reproducible seeds** — [P-Video](/generate/p-video).",
          "**Animating a still you already have** — [HappyHorse 1.1](/generate/happyhorse-1-1) or [Wan 2.7](/generate/wan-2-7).",
        ],
      },
      {
        type: "p",
        text: "The [full catalog](/models) lists every one with its real specifications and example prompts.",
      },
      { type: "h2", text: "What it costs" },
      {
        type: "p",
        text: `Generation is billed in credits, and the cost of a clip scales with the compute it consumes — model, resolution and duration. The exact figure is shown before you submit, so nothing is a surprise. A new account gets ${FREE_CREDITS} credits with no credit card; ${STARTER.label} is $${STARTER.priceMonthly}/month with ${STARTER.monthlyCredits.toLocaleString("en-US")} credits, watermark-free export and a commercial licence. Full detail is on [pricing](/pricing).`,
      },
      { type: "h2", text: "A first session that will go well" },
      {
        type: "ol",
        items: [
          "Pick one shot you actually want. Not a montage — one shot.",
          "Write it as subject, setting, camera, light. Four sentences at most.",
          "Generate it at the lowest resolution and shortest duration on a cheap model.",
          "Read what came back against what you asked for, and change one thing.",
          "Repeat twice. Then re-run the working prompt on the model and settings you want to deliver from.",
        ],
      },
    ],
  },
];

const BY_SLUG = new Map(GUIDE_POSTS.map((post) => [post.slug, post]));

export function guideBySlug(slug: string): GuidePost | undefined {
  return BY_SLUG.get(slug);
}

/** Newest first, which is the order the index and the sitemap both want. */
export function sortedGuides(): GuidePost[] {
  return [...GUIDE_POSTS].sort((a, b) => (a.published < b.published ? 1 : -1));
}

export function guideDate(post: GuidePost) {
  return post.updated ?? post.published;
}
