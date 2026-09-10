// Editorial copy for the per-model landing pages at /generate/[model].
//
// Two rules, both inherited from cloudflare-models.ts's "never invent a
// value" stance:
//
//  1. Every *number* on a model page (durations, resolutions, aspect ratios,
//     audio, reference-image support) is derived at render time from the
//     registry or from the Seedance constants — see modelSpecs() below.
//     Nothing here restates a spec, so a registry change can't leave a stale
//     claim behind on a public page.
//  2. What lives in this file is positioning, not measurement: what a model
//     is for and what to point it at. No benchmark scores, no rankings, no
//     "best in class" claims we can't stand behind.
//
// Slugs are hand-written rather than derived from the id. They are public
// URLs, so they have to stay stable even if a provider renames a model, and
// a derived slug would have produced "recraftv4-1" and "hh1.1-i2v".

import {
  CLOUDFLARE_MODELS,
  getCloudflareModel,
  type CloudflareModelConfig,
} from "@/lib/cloudflare-models";
import {
  IMAGE_MODELS,
  VIDEO_MODELS,
  SEEDANCE_MODEL_ID,
  SEEDANCE_DURATION_MIN,
  SEEDANCE_DURATION_MAX,
  SEEDANCE_RESOLUTIONS,
  SEEDANCE_ASPECT_RATIOS,
  SEEDANCE_OUTPUT_FORMATS,
  SEEDANCE2_MODEL_ID,
  SEEDANCE2_DURATION_MIN,
  SEEDANCE2_DURATION_MAX,
  SEEDANCE2_RESOLUTIONS,
  SEEDANCE2_ASPECT_RATIOS,
  SEEDANCE2_REFERENCE_IMAGES_MAX,
} from "@/lib/constants";

export type ModelPageContent = {
  /** URL segment under /generate. Must never equal an existing static
   *  segment of the app router's /generate tree ("image", "image-to-video"),
   *  which would shadow the real workspace route. */
  slug: string;
  /** Catalog id, exactly as the API expects it. */
  id: string;
  /** One line under the H1, and the seed for the meta description. */
  tagline: string;
  /** Two or three sentences of body copy. */
  intro: string;
  strengths: string[];
  useCases: string[];
  /** Shown as text on the page (not just encoded into a link) so the page
   *  has something for a crawler to read, and deep-linked into the composer. */
  prompts: string[];
};

export const MODEL_PAGES: ModelPageContent[] = [
  // ---------------------------------------------------------------- video
  {
    slug: "seedance-2-5",
    id: SEEDANCE_MODEL_ID,
    tagline: "Long-form AI video with reference control and native audio",
    intro:
      "Seedance 2.5 is the longest-running video model on Vixlens, and the one to reach for when a shot has to hold. Give it a reference image and it keeps the same face, product or set across the whole clip instead of redrawing them shot to shot, with a soundtrack generated alongside the picture rather than dubbed on afterwards.",
    strengths: [
      "Holds a subject's identity across a long take from a single reference still",
      "Audio is generated with the picture, so footsteps and dialogue land on frame",
      "Aspect ratios from cinematic 21:9 down to vertical 9:16 without recropping",
      "Adaptive duration lets the model choose the length the prompt actually needs",
    ],
    useCases: [
      "Product films that have to show the real product, unchanged, end to end",
      "Story beats too long for the 5-to-10-second ceiling most models stop at",
      "Talking-head and performance clips where the audio has to match the motion",
    ],
    prompts: [
      "A night stage of a gravel rally — a boxy 1980s four-wheel-drive rally car comes through a long left-hander in the pines, headlights raking the trunks, gravel spray backlit by the follow car",
      "A flamenco dancer alone in a dark practice room, driving a long footwork sequence until dust lifts off the boards and hangs in the light",
      "A 30-second commercial for a pair of hand-welted leather boots, one unbroken low tracking shot held at ankle height as they cross wet cobblestones",
    ],
  },
  {
    slug: "seedance-2-0",
    id: SEEDANCE2_MODEL_ID,
    tagline: "4K AI video with a lockable camera and multi-subject references",
    intro:
      "Seedance 2.0 trades Seedance 2.5's length for resolution and control. It takes up to four subject references — the people and objects that must stay recognisable — and it can lock the camera outright, which is what makes a clean product turntable or a static interview frame possible instead of the drifting handheld look most models default to.",
    strengths: [
      "Up to four subject reference images, so a cast or a product line stays consistent",
      "A real fixed-camera mode for locked-off shots",
      "The widest resolution range of any video model here, topping out at 4K",
      "Native audio generated with the clip",
    ],
    useCases: [
      "Packshots and turntables that need an absolutely still frame",
      "Campaign sets where the same two or three characters recur across clips",
      "Delivery at 4K for large-format or downstream reframing",
    ],
    prompts: [
      "Locked-off macro shot on a matte-black perfume bottle rotating slowly on a mirrored plinth, single hard key light from the left, deep shadow falloff, no camera movement",
      "Two friends catching up on a lazy Sunday afternoon in a cozy, lived-in apartment, warm window light, gentle handheld drift",
      "A falcon launching from a gloved hand in the Arabian desert at golden hour, dust kicked up by the wingbeat, slow motion",
    ],
  },
  {
    slug: "seedance-2-0-mini",
    id: "bytedance/seedance-2.0-mini",
    tagline: "The cheapest way to test a video idea before committing credits",
    intro:
      "Seedance 2.0 Mini is the draft pass. It runs the same family of prompts as the full Seedance models at a fraction of the cost, which makes it the right place to find out whether a shot idea works at all before spending a flagship generation on it.",
    strengths: [
      "The lowest credit cost of any video model on Vixlens",
      "Fixed-camera toggle and native audio, same as its larger sibling",
      "A virtual-avatar mode for presenter-style clips",
      "Accepts an optional reference image",
    ],
    useCases: [
      "Storyboarding a sequence before rendering the final version at full quality",
      "High-volume social cuts where turnaround matters more than resolution",
      "Testing prompt wording cheaply until the shot description is right",
    ],
    prompts: [
      "A man dancing alone in a tiled subway underpass, one fluorescent tube flickering overhead",
      "Overhead shot of hands assembling a breakfast bowl on a marble counter, morning light, shallow depth of field",
      "A neon-lit ramen counter at 2am, steam rising, the camera pushing slowly past empty stools",
    ],
  },
  {
    slug: "veo-3-1",
    id: "google/veo-3.1",
    tagline: "Google's flagship video model, with synchronized audio and zero data retention",
    intro:
      "Veo 3.1 is Google's flagship text-to-video model and the strongest option here for scenes with real physical logic — weight, contact, and light behaving the way they should. It generates a synchronized soundtrack with the picture, and runs under zero data retention, so nothing you send is kept to train on.",
    strengths: [
      "Native audio generated in sync with the picture, including ambience and effects",
      "Zero data retention on every request",
      "Consistent 1080p delivery at fixed, predictable clip lengths",
      "Takes an optional reference image as the opening frame",
    ],
    useCases: [
      "Brand work where the footage cannot be used as training data",
      "Physically grounded action — liquids, fabric, crowds, vehicles",
      "Finished 1080p social spots that need sound out of the box",
    ],
    prompts: [
      "First-person view soaring low over a medieval battlefield at dawn, gliding past clashing knights in armor, arrows whipping overhead, wind rushing in your ears",
      "A barista pulling an espresso shot in a quiet cafe, crema forming in the cup, the grinder still whirring in the background",
      "Storm surf breaking over a basalt headland in slow motion, spray backlit by low sun, gulls holding position in the wind",
    ],
  },
  {
    slug: "veo-3-1-fast",
    id: "google/veo-3.1-fast",
    tagline: "Veo 3.1 quality at lower latency, for iterating on a shot",
    intro:
      "Veo 3.1 Fast is the low-latency variant of Google's flagship. It takes the same prompts, the same clip lengths and the same audio generation, and returns them sooner — the version to work in while a shot is still changing, before the final render.",
    strengths: [
      "Noticeably shorter turnaround than standard Veo 3.1",
      "Same synchronized audio generation",
      "Same resolutions and clip lengths, so a draft maps 1:1 onto the final",
      "Optional reference image as the first frame",
    ],
    useCases: [
      "Iterating on prompt wording before a final Veo 3.1 pass",
      "Client review rounds where turnaround beats the last few percent of quality",
      "Batch-generating variations of one concept",
    ],
    prompts: [
      "A cyclist threading through morning traffic in Tokyo, handheld follow shot, rain on the asphalt",
      "Close on a chef torching the sugar crust on a creme brulee, flame reflected in the ramekin",
      "A dog shaking off water in slow motion on a lakeside dock at sunrise",
    ],
  },
  {
    slug: "flux-3-video",
    id: "black-forest-labs/flux-3-video",
    tagline: "Black Forest Labs' first video model, with a fast draft mode",
    intro:
      "Flux 3 Video is the first video model from Black Forest Labs, the team behind the FLUX image family, and it carries the same look into motion. It generates audio natively and ships a draft mode that renders a rough version quickly, so you can judge a composition before paying for the full-quality pass.",
    strengths: [
      "Draft mode for a fast, cheap preview of the same prompt",
      "The longest single-shot duration range of the registry video models",
      "Native audio generated with the clip",
      "Ultra-wide 21:9 and 2:1 framing alongside the usual social ratios",
    ],
    useCases: [
      "Wide cinematic establishing shots",
      "Exploring a look quickly in draft, then committing to the full render",
      "Longer single takes without cutting between generations",
    ],
    prompts: [
      "An empty desert highway at blue hour, heat shimmer over the asphalt, a single road sign ticking past the lens, 21:9",
      "Slow dolly through an abandoned greenhouse, shafts of dusty light, ferns overgrowing the benches",
      "A lighthouse beam sweeping across fog on a rocky shore, waves breaking in the foreground",
    ],
  },
  {
    slug: "grok-imagine-video",
    id: "xai/grok-imagine-video",
    tagline: "xAI's video model with native synchronized audio",
    intro:
      "Grok Imagine Video is xAI's video model, built to generate the soundtrack alongside the picture rather than as a separate step. Its duration range is unusually wide at the short end, which makes it a good fit for the one- and two-second cuts that social edits are actually built from.",
    strengths: [
      "Native synchronized audio",
      "Clips as short as a single second, for cut-driven edits",
      "Portrait, square and landscape framing from the same prompt",
      "Accepts an optional reference image",
    ],
    useCases: [
      "Fast-cut social edits assembled from many short generations",
      "Reaction shots and stingers",
      "Vertical-first content for TikTok, Reels and Shorts",
    ],
    prompts: [
      "A skateboard landing hard on concrete, one second, close on the wheels, grit spraying",
      "A vinyl record dropping onto a turntable and the needle settling into the groove",
      "Neon sign flickering on above a rain-slick doorway, vertical framing",
    ],
  },
  {
    slug: "grok-imagine-video-1-5",
    id: "xai/grok-imagine-video-1.5-preview",
    tagline: "The next-generation Grok Imagine video model, in preview",
    intro:
      "Grok Imagine Video 1.5 is xAI's next-generation video model, available here in preview. It takes the same inputs as the current release with improvements to motion and detail — worth running side by side with the stable model on the same prompt to see which one your shot prefers.",
    strengths: [
      "Quality improvements over the current Grok Imagine Video release",
      "Same short-clip range and framing options, so prompts port straight across",
      "Native synchronized audio",
      "Optional reference image",
    ],
    useCases: [
      "A/B testing a prompt against the stable Grok Imagine Video model",
      "Detail-heavy shots that the current release struggles with",
      "Early access to next-generation output for experimental work",
    ],
    prompts: [
      "Macro shot of ink dispersing in water, backlit, high contrast against black",
      "A hawk banking hard over a canyon rim, feathers catching the light",
      "Hands folding origami on a dark tabletop, single overhead spotlight",
    ],
  },
  {
    slug: "hailuo-2-3",
    id: "minimax/hailuo-2.3",
    tagline: "MiniMax Hailuo 2.3, with built-in prompt optimization",
    intro:
      "Hailuo 2.3 is MiniMax's video model, and the one that does the most work on your behalf: its prompt optimizer rewrites a short description into something more specific before generating. That makes it forgiving of a one-line prompt, and a good default when you would rather describe the idea than direct the shot.",
    strengths: [
      "Built-in prompt optimizer that expands terse prompts before generating",
      "Two fixed clip lengths, so cost is predictable",
      "1080p delivery",
      "Optional first-frame image",
    ],
    useCases: [
      "Working from short, plain-language descriptions rather than written-out shot lists",
      "Predictable per-clip budgeting on fixed durations",
      "Animating a still as the opening frame",
    ],
    prompts: [
      "A fox crossing a snowy field at dusk",
      "Coffee being poured into a glass cup, slow motion",
      "A city skyline timelapse from day into night",
    ],
  },
  {
    slug: "p-video",
    id: "pruna/p-video",
    tagline: "The most tunable video model here — frame rate, length and draft mode",
    intro:
      "P-Video from Pruna exposes more of the render than anything else in the catalog: frame rate as well as duration and resolution, a draft mode for cheap previews, a seed for reproducible output, and a closing-frame reference so a clip can be made to land on a specific image.",
    strengths: [
      "Selectable frame rate, including 48fps for slow-motion conform",
      "Opening and closing frame references, so a clip starts and ends where you want",
      "Seed control for reproducible generations",
      "Draft mode for a fast preview before the full render",
    ],
    useCases: [
      "Transitions between two known images",
      "Slow-motion footage that will be conformed in an edit",
      "Reproducing an earlier generation exactly by reusing its seed",
    ],
    prompts: [
      "A paper plane launched from a rooftop, following it down between buildings until it lands on a windowsill",
      "Time-lapse of storm clouds building over wheat fields, 48fps, wide",
      "A candle being lit in a dark room, the flame steadying, camera slowly pushing in",
    ],
  },
  {
    slug: "vidu-q3-pro",
    id: "vidu/q3-pro",
    tagline: "Vidu Q3 at up to 1080p with synced audio and end-frame control",
    intro:
      "Vidu Q3 Pro is the higher-quality half of the Vidu Q3 pair. It accepts both an opening and a closing frame, which turns it from a text-to-video model into something closer to an in-betweener: give it where the shot starts and where it ends, and it fills the motion between them.",
    strengths: [
      "Start and end frame references for controlled transitions",
      "Synced audio generated with the clip",
      "Resolutions down to 540p when a draft is enough",
      "A wide duration range for a single take",
    ],
    useCases: [
      "Morphing one product shot into another",
      "Animating between two key illustrations",
      "Finished 1080p clips with sound, in one pass",
    ],
    prompts: [
      "A luxury sneaker rising out of an unbranded box in bullet-time as the camera orbits, ending on a hero shot against flat neon green",
      "A closed hardcover book opening itself, pages fanning, settling on an illustrated spread",
      "Sunrise over a still lake, mist burning off the surface, reeds moving in the foreground",
    ],
  },
  {
    slug: "vidu-q3-turbo",
    id: "vidu/q3-turbo",
    tagline: "The faster, cheaper Vidu Q3 variant",
    intro:
      "Vidu Q3 Turbo runs the same schema as Q3 Pro — same start and end frame references, same audio, same duration range — tuned for speed and cost instead of maximum fidelity. Draft in Turbo, finish in Pro.",
    strengths: [
      "Faster and cheaper than Vidu Q3 Pro on identical inputs",
      "Same start and end frame references",
      "Synced audio",
      "Prompts port to Q3 Pro unchanged",
    ],
    useCases: [
      "Drafting a transition before rendering it on Q3 Pro",
      "Volume social output on a credit budget",
      "Quick client-facing animatics",
    ],
    prompts: [
      "A cartoon intro: three animal characters bounding into frame one after another and freezing into a title card",
      "A paint roller sweeping across a bare wall, revealing a deep green finish",
      "Overhead shot of a hand sliding a phone across a wooden desk into the light",
    ],
  },
  {
    slug: "happyhorse-1-1",
    id: "alibaba/hh1.1-i2v",
    tagline: "Alibaba's image-to-video model, tuned for faces and close-ups",
    intro:
      "HappyHorse 1.1 animates a still you upload — there is no text-only mode. It is tuned for smoother motion and better close-up work than its predecessor, which makes it the one to use when the subject is a face and the failure mode you care about is drifting features.",
    strengths: [
      "Built for image-to-video: the uploaded still is the subject, not a hint",
      "Improved close-up handling and smoother motion",
      "A negative prompt for steering away from unwanted motion",
      "1080p delivery",
    ],
    useCases: [
      "Bringing a portrait or headshot to life",
      "Animating an illustration or a rendered still",
      "Adding subtle motion to an existing product photograph",
    ],
    prompts: [
      "The subject smiles slowly and turns their head toward the camera, hair moving slightly",
      "Gentle parallax push into the scene, dust motes drifting through the light",
      "The subject blinks and looks off to the left as if hearing something",
    ],
  },
  {
    slug: "wan-2-7",
    id: "alibaba/wan-2.7-i2v",
    tagline: "Alibaba Wan 2.7 image-to-video, from a single still",
    intro:
      "Wan 2.7 is Alibaba's image-to-video model: upload a still and describe the motion you want out of it. Like HappyHorse it requires an image, and it takes a negative prompt, which is the practical lever for keeping unwanted movement out of a shot.",
    strengths: [
      "Animates any uploaded still, with the prompt describing motion only",
      "Negative prompt support for suppressing unwanted movement",
      "1080p delivery",
      "Seed control for reproducible results",
    ],
    useCases: [
      "Turning a catalog photograph into a short looping clip",
      "Adding camera movement to flat artwork",
      "Reviving archive stills for social",
    ],
    prompts: [
      "Slow push in on the subject, background falling out of focus, everything else held still",
      "Wind moving through the trees behind the subject while the subject stays motionless",
      "The camera cranes up and back to reveal the wider room",
    ],
  },

  // ---------------------------------------------------------------- image
  {
    slug: "gpt-image-2",
    id: "openai/gpt-image-2",
    tagline: "OpenAI's image model, and the one to trust with text in the frame",
    intro:
      "GPT Image 2 is OpenAI's image model and the default choice on Vixlens when the picture contains words. Packaging copy, signage, UI mockups and dense small lettering come out readable rather than approximated, and its quality tiers let you spend more only on the renders that matter.",
    strengths: [
      "Legible text rendering, including small type and multi-line layouts",
      "Low, medium and high quality tiers, so drafts cost less than finals",
      "Square, portrait and landscape sizes, plus an automatic option",
      "Strong material and lighting realism for product work",
    ],
    useCases: [
      "Packaging and label mockups with real, readable copy",
      "Ad creative where the headline has to sit inside the image",
      "Product photography with correct colour and logo reproduction",
    ],
    prompts: [
      "High-end skincare bottle floating on a swirl of cream texture, macro, soft pink palette, readable ingredient list on the label",
      "A vintage enamel travel poster for the Dolomites, bold sans-serif lettering, four-colour print look",
      "Flat-lay of a matte black coffee bag on concrete with the roast date and origin printed clearly on the front",
    ],
  },
  {
    slug: "nano-banana-pro",
    id: "google/nano-banana-pro",
    tagline: "Google's highest-fidelity Gemini image model, up to 4K",
    intro:
      "Nano Banana Pro is the top of Google's Gemini image line and the highest-resolution image model on Vixlens. It accepts a reference image as well as a prompt, offers the widest set of aspect ratios in the catalog, and writes out JPEG, PNG or WebP directly.",
    strengths: [
      "Output up to 4K",
      "Reference image accepted alongside the prompt",
      "Ten aspect ratios, from 21:9 through to 9:16",
      "Direct JPEG, PNG or WebP output — no re-encoding step",
    ],
    useCases: [
      "Large-format print and billboard artwork",
      "Hero images that will be cropped several ways from one render",
      "Editing or extending an existing image using it as the reference",
    ],
    prompts: [
      "An architectural render of a concrete and glass pavilion at dusk, interior lights on, reflecting pool in the foreground, 21:9",
      "Editorial still life of ceramics on a linen backdrop, north light, muted earth palette, 4K",
      "A dense city map illustrated in the style of a mid-century transit poster",
    ],
  },
  {
    slug: "nano-banana-2-lite",
    id: "google/nano-banana-2-lite",
    tagline: "Google's fastest Gemini image model",
    intro:
      "Nano Banana 2 Lite is the speed tier of Google's Gemini image family. There is nothing to configure — a prompt goes in and an image comes back — which makes it the right model for generating many options quickly and picking one to re-render properly.",
    strengths: [
      "The fastest image turnaround in the catalog",
      "No parameters to tune: prompt in, image out",
      "Low credit cost per generation",
      "Google's Gemini image quality at the draft tier",
    ],
    useCases: [
      "Generating a wide spread of concepts before choosing a direction",
      "Placeholder and comp imagery during design work",
      "High-volume thumbnails and social variants",
    ],
    prompts: [
      "A single ripe pomegranate cut open on a dark slate surface, dramatic side light",
      "Isometric illustration of a tiny rooftop apartment with plants and a bicycle",
      "A watercolour of a fishing village in the rain, loose wet-on-wet washes",
    ],
  },
  {
    slug: "recraft-v4-1",
    id: "recraft/recraftv4-1",
    tagline: "Fast, cost-efficient image generation with real style controls",
    intro:
      "Recraft v4.1 is built for design work rather than one-off pictures. Alongside the prompt it takes a style and a substyle, which is how you get a set of images that actually look like they belong to the same brand instead of a collection of unrelated renders.",
    strengths: [
      "Style and substyle parameters for consistent output across a set",
      "Low cost per image",
      "Square and high-resolution square sizes",
      "The base tier of the Recraft family — Pro and Vector share its controls",
    ],
    useCases: [
      "Icon and illustration sets that have to match each other",
      "Brand-consistent imagery across a campaign",
      "Fast, cheap exploration inside a fixed visual style",
    ],
    prompts: [
      "A set of line-art icons for a travel app: passport, boarding pass, suitcase, window seat",
      "Flat vector illustration of a team working around a table, muted brand palette",
      "A minimal editorial spot illustration about remote work, two colours only",
    ],
  },
  {
    slug: "recraft-v4-1-pro",
    id: "recraft/recraftv4-1-pro",
    tagline: "High-resolution Recraft, at 2048px and above",
    intro:
      "Recraft v4.1 Pro is the same model and the same style controls as the base tier, rendering at 2048px by default. Use it once a direction is settled and the artwork has to survive being placed at full size.",
    strengths: [
      "2048px output by default",
      "Identical style and substyle controls to Recraft v4.1",
      "Prompts and styles port over from the base tier unchanged",
      "Suited to print and large on-screen placement",
    ],
    useCases: [
      "Final artwork after drafting on Recraft v4.1",
      "Print collateral and posters",
      "Hero imagery that will be seen at full width",
    ],
    prompts: [
      "A detailed cutaway illustration of a mechanical watch movement, technical but warm, 2048px",
      "Poster artwork for a jazz festival, bold shapes, three-colour risograph look",
      "An illustrated map of a mountain trail network with labelled peaks",
    ],
  },
  {
    slug: "recraft-v4-1-vector",
    id: "recraft/recraftv4-1-vector",
    tagline: "The only model here that outputs production-ready SVG",
    intro:
      "Recraft v4.1 Vector generates SVG, not pixels. That means logos, icons and illustrations that scale to any size, open in a vector editor, and can be recoloured after the fact — the one model in this catalog whose output is genuinely editable downstream.",
    strengths: [
      "True SVG output, editable in any vector tool",
      "Resolution independent — the same file works as a favicon or a billboard",
      "Style and substyle controls shared with the rest of the Recraft family",
      "Small file sizes for the web",
    ],
    useCases: [
      "Logo and wordmark exploration",
      "Icon sets that need to be recoloured per theme",
      "Illustrations destined for a design system",
    ],
    prompts: [
      "A geometric logo mark for a climbing gym: an abstract peak formed from three overlapping triangles, single colour",
      "A 12-icon set for a finance dashboard, consistent stroke weight, rounded caps",
      "A flat vector badge for an artisan bakery, circular lockup with wheat motif",
    ],
  },
  {
    slug: "seedream-5-pro",
    id: "bytedance/seedream-5-pro",
    tagline: "ByteDance's flagship image model, with reference-image support",
    intro:
      "Seedream 5 Pro is the flagship of ByteDance's image line and the only Seedream variant here that genuinely reads a reference image — the others accept one and ignore it. That makes it the Seedream to use when the output has to resemble something you already have.",
    strengths: [
      "Reference image is actually used, unlike the 4.5 and 5 Lite variants",
      "1K or 2K output",
      "An explicit watermark toggle",
      "ByteDance's strongest image quality in the catalog",
    ],
    useCases: [
      "Producing variations on an existing image or art direction",
      "Product imagery that must match a supplied reference",
      "Final-quality stills at 2K",
    ],
    prompts: [
      "A ceramic mug on a windowsill in hard morning light, matching the palette and grain of the reference photograph",
      "Portrait of a woman in a linen jacket against a plaster wall, natural light, editorial",
      "A plated dessert shot from a low three-quarter angle, restaurant lighting, 2K",
    ],
  },
  {
    slug: "seedream-4-5",
    id: "bytedance/seedream-4.5",
    tagline: "Seedream at up to 4K with aspect-ratio control",
    intro:
      "Seedream 4.5 is the high-resolution member of the Seedream family, reaching 4K with a full set of aspect ratios. It is text-to-image only in practice — its schema lists an image field, but the model ignores what you upload, so treat the prompt as the whole brief.",
    strengths: [
      "Up to 4K output",
      "Nine aspect ratios including 21:9 and 9:16",
      "Strong photographic realism",
      "Predictable, prompt-driven results with no reference to manage",
    ],
    useCases: [
      "Wallpapers, backdrops and large-format stills",
      "Vertical hero images for mobile-first layouts",
      "Photoreal scenes built entirely from a written description",
    ],
    prompts: [
      "An empty cinema auditorium lit only by the screen, deep red seats, wide 21:9",
      "A misty pine forest at first light, layered depth, cool palette, 4K",
      "Vertical shot of a spiral staircase looking straight up, brutalist concrete, 9:16",
    ],
  },
  {
    slug: "seedream-5-lite",
    id: "bytedance/seedream-5-lite",
    tagline: "Faster Seedream 5, with PNG or JPEG output",
    intro:
      "Seedream 5 Lite is the quicker, cheaper Seedream 5 variant, rendering at 2K or 3K and writing PNG or JPEG directly. Like Seedream 4.5 it does not act on an uploaded reference, so it is best treated as a pure text-to-image model.",
    strengths: [
      "Faster and cheaper than Seedream 5 Pro",
      "2K or 3K output",
      "Choice of PNG or JPEG straight from the model",
      "Full aspect-ratio control",
    ],
    useCases: [
      "Drafting compositions before a Seedream 5 Pro final",
      "Bulk imagery for listings and catalogs",
      "Web-ready JPEGs without a conversion step",
    ],
    prompts: [
      "A retro diner counter at night, chrome and red vinyl, neon spill through the window",
      "Overhead flat-lay of art supplies on a paint-spattered desk",
      "A single sailboat on flat water at dusk, minimal composition, wide horizon",
    ],
  },
  {
    slug: "grok-imagine-image",
    id: "xai/grok-imagine-image",
    tagline: "xAI's image model, with batch generation and wide framing options",
    intro:
      "Grok Imagine generates up to four images from one prompt in a single request, across an unusually wide set of aspect ratios — including the extreme 20:9 and 1:2 crops that most models do not offer. It is the efficient way to see several takes on an idea at once.",
    strengths: [
      "Up to four images per request",
      "Fourteen aspect ratios, including extreme wide and tall crops",
      "1K or 2K resolution",
      "Fast enough for exploratory batches",
    ],
    useCases: [
      "Generating several variations before choosing a direction",
      "Banner and skyscraper formats that need unusual crops",
      "Mood boards built from one prompt",
    ],
    prompts: [
      "A lone figure walking a salt flat under an enormous sky, extreme wide 20:9",
      "Cutaway of a cross-section of geological strata, illustrated, tall 1:2",
      "A vintage racing motorcycle against a whitewashed wall, hard midday shadow",
    ],
  },
  {
    slug: "grok-imagine-image-quality",
    id: "xai/grok-imagine-image-quality",
    tagline: "The higher-fidelity Grok Imagine, with image editing",
    intro:
      "Grok Imagine Quality adds two things to the base model: explicit quality tiers, and a reference image the model actually edits from. That makes it the Grok variant to use when you are refining an existing picture rather than generating one from scratch.",
    strengths: [
      "Image editing from an uploaded reference",
      "Low, medium and high quality tiers",
      "Up to four images per request",
      "The same wide set of aspect ratios as the base model",
    ],
    useCases: [
      "Editing or restyling an image you already have",
      "Final renders after batching drafts on the base model",
      "Producing several high-fidelity options in one request",
    ],
    prompts: [
      "Restyle the uploaded photograph as a 1970s film still, warm grain, slight halation",
      "Replace the background of the reference product shot with a seamless studio sweep",
      "A brass desk lamp on an oak desk, high quality, warm practical lighting",
    ],
  },
  {
    slug: "lucid-origin",
    id: "@cf/leonardo/lucid-origin",
    tagline: "Leonardo's highly adaptable, prompt-responsive image model",
    intro:
      "Lucid Origin from Leonardo is the model that follows instructions most literally. There is nothing to configure beyond the prompt, so the way to steer it is to write more precisely — which makes it a good place to learn what your prompt is actually asking for.",
    strengths: [
      "Follows detailed prompts closely",
      "Adapts across illustration, photography and graphic styles",
      "No parameters to tune",
      "Runs on Cloudflare's own infrastructure",
    ],
    useCases: [
      "Complex scenes with many stated requirements",
      "Style exploration across very different looks",
      "Learning to write more precise prompts",
    ],
    prompts: [
      "A cluttered watchmaker's bench seen from above: loupe, tweezers, three open movements, brass filings, warm lamp from the upper left, shallow depth of field",
      "A storm-lit prairie with a single red barn at centre-left, wheat bending right, dark anvil cloud above",
      "A cross-section illustration of a submarine, labelled compartments, technical drawing style",
    ],
  },
];

const BY_SLUG = new Map(MODEL_PAGES.map((m) => [m.slug, m]));
const BY_ID = new Map(MODEL_PAGES.map((m) => [m.id, m]));

export function modelPageBySlug(slug: string): ModelPageContent | undefined {
  return BY_SLUG.get(slug);
}

/** The public URL for a model, when it has a landing page. */
export function modelPageHref(id: string): string | undefined {
  const page = BY_ID.get(id);
  return page ? `/generate/${page.slug}` : undefined;
}

// ---------------------------------------------------------------------------
// Facts, read off the catalog rather than restated here.

export type ModelCatalogEntry = {
  id: string;
  label: string;
  provider: string;
  description: string;
  category: CloudflareModelConfig["category"];
};

export function modelCatalogEntry(id: string): ModelCatalogEntry | undefined {
  const config = getCloudflareModel(id);
  if (config) {
    return {
      id: config.id,
      label: config.label,
      provider: config.provider,
      description: config.description,
      category: config.category,
    };
  }
  // The two bespoke Seedance flagships aren't registry entries — they live
  // in VIDEO_MODELS with their own hand-wired routes.
  const listed = [...VIDEO_MODELS, ...IMAGE_MODELS].find((m) => m.id === id);
  if (!listed) return undefined;
  return {
    id: listed.id,
    label: listed.label,
    provider: listed.provider,
    description: listed.description,
    category: IMAGE_MODELS.some((m) => m.id === id) ? "text-to-image" : "text-to-video",
  };
}

export type ModelSpec = { label: string; value: string };

function fieldSpec(config: CloudflareModelConfig, key: string): string | undefined {
  const field = config.fields.find((f) => f.key === key);
  if (!field) return undefined;
  if (field.type === "select" && field.options?.length) return field.options.join(", ");
  if (field.type === "number" && field.min !== undefined && field.max !== undefined) {
    return `${field.min}–${field.max}s`;
  }
  if (field.suggestedValues?.length) return field.suggestedValues.join(", ");
  if (field.defaultValue !== undefined) return String(field.defaultValue);
  return undefined;
}

const IMAGE_SUPPORT_LABEL: Record<CloudflareModelConfig["image"], string> = {
  none: "Not used",
  optional: "Optional",
  required: "Required",
};

/**
 * The spec table shown on a model page. Every row is derived — from the
 * Seedance constants for the two bespoke models, and from the probed field
 * definitions in cloudflare-models.ts for everything else — so a registry
 * change updates the public page instead of leaving a stale claim behind.
 */
export function modelSpecs(id: string): ModelSpec[] {
  if (id === SEEDANCE_MODEL_ID) {
    return [
      { label: "Duration", value: `${SEEDANCE_DURATION_MIN}–${SEEDANCE_DURATION_MAX}s, or adaptive` },
      { label: "Resolution", value: SEEDANCE_RESOLUTIONS.join(", ") },
      { label: "Aspect ratios", value: SEEDANCE_ASPECT_RATIOS.join(", ") },
      { label: "Audio", value: "Generated with the clip" },
      { label: "Reference image", value: "Optional" },
      { label: "Output format", value: SEEDANCE_OUTPUT_FORMATS.join(", ").toUpperCase() },
    ];
  }
  if (id === SEEDANCE2_MODEL_ID) {
    return [
      { label: "Duration", value: `${SEEDANCE2_DURATION_MIN}–${SEEDANCE2_DURATION_MAX}s` },
      { label: "Resolution", value: SEEDANCE2_RESOLUTIONS.join(", ") },
      { label: "Aspect ratios", value: SEEDANCE2_ASPECT_RATIOS.join(", ") },
      { label: "Audio", value: "Generated with the clip" },
      { label: "Reference images", value: `Up to ${SEEDANCE2_REFERENCE_IMAGES_MAX}` },
      { label: "Fixed camera", value: "Supported" },
    ];
  }

  const config = getCloudflareModel(id);
  if (!config) return [];

  const specs: ModelSpec[] = [];
  const duration = fieldSpec(config, "duration");
  if (duration) specs.push({ label: "Duration", value: duration });

  const resolution =
    fieldSpec(config, "resolution") ?? fieldSpec(config, "imageSize") ?? fieldSpec(config, "size");
  if (resolution) specs.push({ label: "Resolution", value: resolution });

  const aspect = fieldSpec(config, "aspectRatio");
  if (aspect) specs.push({ label: "Aspect ratios", value: aspect });

  const fps = fieldSpec(config, "fps");
  if (fps) specs.push({ label: "Frame rate", value: `${fps} fps` });

  if (config.category !== "text-to-image") {
    const audio = config.fields.some((f) => ["generateAudio", "audio", "saveAudio"].includes(f.key));
    specs.push({ label: "Audio", value: audio ? "Generated with the clip" : "Not supported" });
  }

  const outputFormat = fieldSpec(config, "outputFormat");
  if (outputFormat) specs.push({ label: "Output format", value: outputFormat.toUpperCase() });

  const quality = fieldSpec(config, "quality");
  if (quality) specs.push({ label: "Quality tiers", value: quality });

  const batch = config.fields.find((f) => f.key === "n");
  if (batch?.max !== undefined) {
    specs.push({ label: "Images per request", value: `Up to ${batch.max}` });
  }

  specs.push({ label: "Reference image", value: IMAGE_SUPPORT_LABEL[config.image] });

  if (config.fields.some((f) => f.key === "seed")) {
    specs.push({ label: "Seed control", value: "Supported" });
  }
  if (config.fields.some((f) => f.key === "draft")) {
    specs.push({ label: "Draft mode", value: "Supported" });
  }
  if (config.fields.some((f) => f.key === "negativePrompt")) {
    specs.push({ label: "Negative prompt", value: "Supported" });
  }

  return specs;
}

export const CATEGORY_LABEL: Record<CloudflareModelConfig["category"], string> = {
  "text-to-video": "Text to video",
  "image-to-video": "Image to video",
  "text-to-image": "Text to image",
};

/** Where the "generate with this model" CTA goes. Images have their own
 *  workspace route; video and image-to-video share the default one. */
export function modelWorkspaceHref(id: string, prompt?: string) {
  const entry = modelCatalogEntry(id);
  const base = entry?.category === "text-to-image" ? "/generate/image" : "/generate";
  const params = new URLSearchParams({ model: id });
  if (prompt) params.set("prompt", prompt);
  return `${base}?${params.toString()}`;
}

/** Sibling models of the same kind, for cross-linking between landing pages. */
export function relatedModelPages(id: string, limit = 6): ModelPageContent[] {
  const entry = modelCatalogEntry(id);
  if (!entry) return [];
  const isVideo = entry.category !== "text-to-image";
  return MODEL_PAGES.filter((page) => {
    if (page.id === id) return false;
    const other = modelCatalogEntry(page.id);
    if (!other) return false;
    return (other.category !== "text-to-image") === isVideo;
  }).slice(0, limit);
}

/** Whether a catalog id has a landing page — used by the model strip to
 *  decide between a link and a plain label. */
export function hasModelPage(id: string) {
  return BY_ID.has(id);
}

/** A slug equal to one of these would be shadowed by the real workspace
 *  route under /generate and could never render. */
const RESERVED_GENERATE_SEGMENTS = ["image", "image-to-video"];

if (process.env.NODE_ENV !== "production") {
  const slugs = MODEL_PAGES.map((m) => m.slug);
  const collision = slugs.find((s) => RESERVED_GENERATE_SEGMENTS.includes(s));
  if (collision) throw new Error(`Model slug "${collision}" collides with a /generate route`);
  const duplicate = slugs.find((s, i) => slugs.indexOf(s) !== i);
  if (duplicate) throw new Error(`Duplicate model slug "${duplicate}"`);
  const unknown = MODEL_PAGES.find((m) => !modelCatalogEntry(m.id));
  if (unknown) throw new Error(`Model page "${unknown.slug}" points at unknown model ${unknown.id}`);
  const uncovered = CLOUDFLARE_MODELS.filter((m) => !BY_ID.has(m.id)).map((m) => m.id);
  if (uncovered.length > 0) {
    console.warn(`[model-seo] registry models without a landing page: ${uncovered.join(", ")}`);
  }
}
