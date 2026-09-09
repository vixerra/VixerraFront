// In-app help: what each screen is for, and the order to do things in.
//
// One entry per route, rendered by <PageGuide /> (mounted once per layout,
// so every page gets its own guide without touching the page itself). Keep
// this file the single source of the help copy — a screen described in two
// places drifts, and the version someone reads should be the one shipped
// beside the screen it describes.
//
// The guide is now mounted ONLY inside the signed-in app (AppShell) and the
// admin panel. It used to float on the marketing, auth and public-link
// pages too, where a "how to use this page" bubble greets a visitor who has
// not yet been given anything to use. Those entries are kept rather than
// deleted — the copy is still accurate, and restoring the guide anywhere is
// a one-line mount — but nothing reads them today.
//
// The panel shows ONE step at a time next to an animated illustration, so
// the copy is written to be glanced at, not read: a 2-4 word `title` is
// the thing the eye lands on, and `detail` is a single supporting line.
// If a step needs a paragraph, it is really two steps.
//
// `plan` must match the real gate (TIER_INFO.creatorSuite for the two
// studios and publishing, apiAccess/seats for keys and teams). A guide
// that promises a locked screen is worse than no guide.

/** Which plan unlocks the screen a guide describes. */
export type GuidePlan = "any" | "creator" | "studio" | "staff";

/** Tone of the closing note — `gate` is reserved for plan limits. */
export type GuideNoteTone = "info" | "warn" | "gate";

/**
 * Icons are named, not imported, here. A Lucide icon is a forwardRef object
 * React cannot serialize across the server/client boundary, and this module
 * is imported by routes that are Server Components — see the same reasoning
 * on CreatorFeature in upgrade-gate.tsx. The client component maps these
 * keys to real icons.
 */
export type GuideIcon =
  | "sparkles" | "video" | "image" | "upload" | "sliders" | "play" | "download"
  | "folder" | "share" | "send" | "calendar" | "zap" | "key" | "shield"
  | "users" | "search" | "check" | "wand" | "layers" | "clock" | "eye"
  | "alert" | "mail" | "lock" | "gauge" | "scissors" | "megaphone" | "list"
  | "tag" | "link" | "settings" | "coins" | "activity" | "type";

/** Which animated illustration sits beside the steps. */
export type GuideArt =
  | "composer" | "gallery" | "timeline" | "presets" | "publish" | "credits"
  | "share" | "team" | "keys" | "account" | "admin" | "welcome" | "auth";

export type GuideStep = {
  icon: GuideIcon;
  /** 2-4 words. The thing the eye lands on. */
  title: string;
  /** One supporting line. */
  detail: string;
};

export type PageGuide = {
  /** Route the guide describes. A `*` segment matches any single segment,
   *  so "/presets/*" covers every preset without listing slugs. */
  path: string;
  title: string;
  /** A few words: what this screen is for. */
  what: string;
  art: GuideArt;
  steps: GuideStep[];
  note?: string;
  noteTone?: GuideNoteTone;
  plan: GuidePlan;
};

export const PAGE_GUIDES: PageGuide[] = [
  // ---------------------------------------------------------------- app
  {
    path: "/dashboard",
    title: "Dashboard",
    what: "Your balance and your latest work",
    plan: "any",
    art: "credits",
    steps: [
      { icon: "zap", title: "Check your balance", detail: "Do it before a long or high-resolution job." },
      { icon: "activity", title: "Read the 30-day chart", detail: "It shows where your credits actually went." },
      { icon: "play", title: "Reopen recent work", detail: "Every generation keeps its prompt and settings." },
    ],
    note: "Per 1,000 credits: about 333 images, 71s of Seedance 2.0, or 21s of Seedance 2.5.",
  },
  {
    path: "/generate",
    title: "Video composer",
    what: "Text to video, and stills to video",
    plan: "any",
    art: "composer",
    steps: [
      { icon: "sparkles", title: "Pick a model", detail: "Seedance 2.5 for 30s and reference control; 2.0 for 4K." },
      { icon: "upload", title: "Add a frame", detail: "Optional. A first and last frame animate a still you have." },
      { icon: "type", title: "Describe the shot", detail: "Two concrete sentences beat a list of adjectives." },
      { icon: "sliders", title: "Set duration and frame", detail: "Resolution, aspect, camera lock, native audio." },
      { icon: "zap", title: "Check the price", detail: "The pill shows the cost before you spend anything." },
      { icon: "play", title: "Generate", detail: "Progress streams live. Nothing to refresh." },
    ],
    note: "Reusing a seed with the same settings iterates one shot instead of rolling a new one.",
  },
  {
    path: "/generate/image",
    title: "Image composer",
    what: "Nine models, fourteen styles",
    plan: "any",
    art: "composer",
    steps: [
      { icon: "sparkles", title: "Pick a model", detail: "Nano Banana Pro for 4K, Recraft Vector for real SVG." },
      { icon: "type", title: "Write the prompt", detail: "Then add a style preset for the medium and treatment." },
      { icon: "wand", title: "Enhance it", detail: "Turns a rough idea into a model-ready prompt." },
      { icon: "layers", title: "Edit in words", detail: "Describe the change. No masks, no region selection." },
    ],
  },
  {
    path: "/presets",
    title: "Presets",
    what: "One-tap recipes, five categories",
    plan: "any",
    art: "presets",
    steps: [
      { icon: "tag", title: "Browse a category", detail: "Trending, Portrait, Product, Motion, Playful." },
      { icon: "eye", title: "Read the preview", detail: "It shows the kind of shot, not that preset's own output." },
      { icon: "play", title: "Open one to run it", detail: "The full composer is still there if you want control." },
    ],
  },
  {
    path: "/presets/*",
    title: "Running a preset",
    what: "Three steps, nothing to configure",
    plan: "any",
    art: "presets",
    steps: [
      { icon: "upload", title: "Upload one image", detail: "Required. A PNG or JPG from your device." },
      { icon: "wand", title: "Let it redraw", detail: "Some recipes build a character first, then animate it." },
      { icon: "download", title: "Generate and download", detail: "The recipe already wrote the prompt and settings." },
    ],
    note: "If a recipe exceeds your plan, the studio steps it down and shows the job it will really submit.",
  },
  {
    path: "/studio",
    title: "Marketing studio",
    what: "A promo from your product",
    plan: "creator",
    art: "composer",
    steps: [
      { icon: "image", title: "Attach your assets", detail: "The product, and a face if the ad needs one." },
      { icon: "type", title: "Write the brief", detail: "What it is, who it is for, the format and the pace." },
      { icon: "layers", title: "One reference sheet", detail: "Product and talent merge, because a job takes one image." },
      { icon: "play", title: "Review and generate", detail: "The composed prompt and price are shown first." },
    ],
    note: "Included from the Créateur plan up.",
    noteTone: "gate",
  },
  {
    path: "/editor",
    title: "Editing studio",
    what: "Cut your clips into one",
    plan: "creator",
    art: "timeline",
    steps: [
      { icon: "folder", title: "Add your clips", detail: "From the media library, or straight from the gallery." },
      { icon: "sliders", title: "Choose the frame", detail: "9:16, 4:5, 1:1, 16:9 or 21:9." },
      { icon: "scissors", title: "Cut on the timeline", detail: "Split, reorder, duplicate, trim. Undo covers everything." },
      { icon: "type", title: "Layer text and sound", detail: "Overlays, your watermark, music." },
      { icon: "download", title: "Export an MP4", detail: "It renders in your browser, so keep the tab open." },
    ],
    note: "Included from the Créateur plan up.",
    noteTone: "gate",
  },
  {
    path: "/my-gallery",
    title: "My gallery",
    what: "Everything you have made",
    plan: "any",
    art: "gallery",
    steps: [
      { icon: "users", title: "Pick the workspace", detail: "Personal uses your credits; team uses the owner's pool." },
      { icon: "search", title: "Filter it down", detail: "By type and status. Failed jobs are listed too." },
      { icon: "eye", title: "Open a result", detail: "Its full prompt and parameters are kept with it." },
      { icon: "share", title: "Take it further", detail: "Download, collect, send to the editor, or publish." },
    ],
  },
  {
    path: "/collections",
    title: "Collections",
    what: "Groups you can share",
    plan: "any",
    art: "gallery",
    steps: [
      { icon: "folder", title: "Create one", detail: "One per campaign, client or idea." },
      { icon: "check", title: "Add your work", detail: "From the gallery, or a result's own menu." },
      { icon: "share", title: "Open it to share", detail: "Reorder, remove, then mint a link." },
    ],
  },
  {
    path: "/collections/*",
    title: "Inside a collection",
    what: "Its contents, and the share link",
    plan: "any",
    art: "share",
    steps: [
      { icon: "check", title: "Review the contents", detail: "Drop anything that does not belong." },
      { icon: "link", title: "Share it", detail: "One link, no account needed at the other end." },
    ],
    note: "Anyone holding the link can open it. Treat the link itself as the permission.",
    noteTone: "warn",
  },
  {
    path: "/c/*",
    title: "Shared collection",
    what: "Someone shared this with you",
    plan: "any",
    art: "share",
    steps: [
      { icon: "play", title: "Watch and browse", detail: "Read-only, and no sign-in needed." },
      { icon: "sparkles", title: "Make your own", detail: "A free account opens with 50 credits." },
    ],
  },
  {
    path: "/settings",
    title: "Profile",
    what: "Your details and settings",
    plan: "any",
    art: "account",
    steps: [
      { icon: "settings", title: "Update your profile", detail: "Change what you need, then save." },
      { icon: "list", title: "Use the settings nav", detail: "Billing, API keys, security, social, team." },
    ],
  },
  {
    path: "/settings/billing",
    title: "Billing & credits",
    what: "Plan, balance and top-ups",
    plan: "any",
    art: "credits",
    steps: [
      { icon: "gauge", title: "Check plan and balance", detail: "Both sit at the top of the page." },
      { icon: "sparkles", title: "Switch plan", detail: "This is where 4K, API access and seats come from." },
      { icon: "coins", title: "Or just top up", detail: "Buy a credit pack without changing plan." },
    ],
    note: "On Créateur and Studio, unused credits roll over one month. On Découverte and Starter they do not.",
  },
  {
    path: "/settings/api-keys",
    title: "API keys",
    what: "Generate from your own stack",
    plan: "studio",
    art: "keys",
    steps: [
      { icon: "key", title: "Create a key", detail: "Copy it immediately and treat it like a password." },
      { icon: "zap", title: "Call the API", detail: "Usage draws on the same credit balance." },
      { icon: "alert", title: "Revoke on doubt", detail: "The moment a key might have leaked." },
    ],
    note: "API access is a Studio-plan feature.",
    noteTone: "gate",
  },
  {
    path: "/settings/security",
    title: "Security",
    what: "Change your password",
    plan: "any",
    art: "auth",
    steps: [
      { icon: "lock", title: "Enter the old one", detail: "Then the new password twice." },
      { icon: "mail", title: "Forgotten it?", detail: "Use the emailed reset flow instead." },
    ],
  },
  {
    path: "/settings/social",
    title: "Linked accounts",
    what: "Connect where you publish",
    plan: "creator",
    art: "publish",
    steps: [
      { icon: "link", title: "Authorize a platform", detail: "You approve it on the platform's own screen." },
      { icon: "check", title: "It appears here", detail: "Listed and ready to publish to." },
      { icon: "alert", title: "Unlink any time", detail: "Scheduled posts for that account then stop." },
    ],
    note: "Publishing to linked accounts is included from the Créateur plan up.",
    noteTone: "gate",
  },
  {
    path: "/settings/team",
    title: "Team",
    what: "A shared workspace",
    plan: "studio",
    art: "team",
    steps: [
      { icon: "users", title: "Create the team", detail: "Until you do, there is nothing to invite into." },
      { icon: "mail", title: "Invite by email", detail: "They can accept here in the app, or from the email." },
      { icon: "shield", title: "Set each role", detail: "Creator generates, editor reshapes, viewer only looks." },
      { icon: "coins", title: "Cap the spend", detail: "Give a member a monthly credit allowance, or leave it open." },
      { icon: "gauge", title: "Watch the usage", detail: "Each row shows what that member spent this month." },
    ],
    note: "A Studio feature: you plus 3 teammates. Only team-workspace work spends your pool — their personal work uses their own credits.",
    noteTone: "gate",
  },
  {
    path: "/invite/*",
    title: "Team invite",
    what: "Join someone's workspace",
    plan: "any",
    art: "team",
    steps: [
      { icon: "lock", title: "Sign in", detail: "Or create an account if you have none." },
      { icon: "check", title: "Accept", detail: "Also possible from Settings, Team — no email needed." },
      { icon: "users", title: "Switch workspace", detail: "The sidebar toggles between personal and the team." },
    ],
  },

  // --------------------------------------------------------------- auth
  {
    path: "/signup",
    title: "Create an account",
    what: "Free, with 50 credits",
    plan: "any",
    art: "auth",
    steps: [
      { icon: "mail", title: "Email and password", detail: "That is the whole form." },
      { icon: "zap", title: "50 credits land", detail: "Waiting on your dashboard." },
      { icon: "video", title: "Spend them well", detail: "Seedance 2.0 Mini at 3s / 480p is what fits." },
    ],
    note: "Free output is watermarked and capped at 480p / 5s. The watermark goes away on Starter.",
    noteTone: "warn",
  },
  {
    path: "/login",
    title: "Sign in",
    what: "Back to where you were",
    plan: "any",
    art: "auth",
    steps: [
      { icon: "lock", title: "Enter your details", detail: "Email and password, or a linked identity." },
      { icon: "mail", title: "Forgotten it?", detail: "The reset link sits below the form." },
    ],
  },
  {
    path: "/forgot-password",
    title: "Recover a password",
    what: "A reset link by email",
    plan: "any",
    art: "auth",
    steps: [
      { icon: "mail", title: "Type your email", detail: "The one your account uses." },
      { icon: "clock", title: "Open the newest link", detail: "They expire, so ignore older ones." },
      { icon: "lock", title: "Set a new password", detail: "Then sign in with it." },
    ],
  },
  {
    path: "/reset-password",
    title: "Set a new password",
    what: "The last step of a reset",
    plan: "any",
    art: "auth",
    steps: [
      { icon: "lock", title: "Choose it twice", detail: "Confirm to be sure it is what you meant." },
      { icon: "check", title: "Save and sign in", detail: "The old password stops working immediately." },
    ],
    note: "If the link has expired, request a fresh one from forgot-password.",
    noteTone: "warn",
  },

  // ---------------------------------------------------------- marketing
  {
    path: "/",
    title: "Welcome to Vixerra",
    what: "Prompt, generate, cut, publish",
    plan: "any",
    art: "welcome",
    steps: [
      { icon: "sparkles", title: "Try the hero demo", detail: "See the flow before signing up for anything." },
      { icon: "video", title: "Follow a try-it link", detail: "It opens the composer with that model selected." },
      { icon: "zap", title: "Start free", detail: "50 credits, no card." },
    ],
  },
  {
    path: "/features",
    title: "Features",
    what: "What each model is for",
    plan: "any",
    art: "welcome",
    steps: [
      { icon: "layers", title: "Compare the models", detail: "Before you spend credits on the wrong one." },
      { icon: "list", title: "The loop never changes", detail: "Prompt or upload, pick a model, refine, export." },
    ],
  },
  {
    path: "/pricing",
    title: "Pricing",
    what: "Four plans, side by side",
    plan: "any",
    art: "credits",
    steps: [
      { icon: "gauge", title: "Three things differ", detail: "Resolution ceiling, clip length, creator suite." },
      { icon: "scissors", title: "The creator suite", detail: "Marketing studio, editor and publishing — from Créateur." },
      { icon: "coins", title: "Prices are in US dollars", detail: "Credits are the unit; cost is shown before you generate." },
    ],
  },
  {
    path: "/gallery",
    title: "Public gallery",
    what: "Work other people shared",
    plan: "any",
    art: "gallery",
    steps: [
      { icon: "eye", title: "Browse for ideas", detail: "See what the models are capable of." },
      { icon: "check", title: "Like what lands", detail: "So you can find it again." },
    ],
  },
  {
    // The public face of the preset catalogue. It keeps the /prompts URL the
    // site has always linked to; the in-app studio owns /presets.
    path: "/prompts",
    title: "Video presets",
    what: "The catalogue, open to browse",
    plan: "any",
    art: "presets",
    steps: [
      { icon: "tag", title: "Browse freely", detail: "The whole catalogue is open, with no account." },
      { icon: "eye", title: "Read the preview", detail: "It shows the kind of shot, not that preset's own output." },
      { icon: "lock", title: "Sign in to run one", detail: "You land back on the preset you picked." },
    ],
    note: "Recipes are finished: prompt, camera, length and audio are already written. Prefer control? Use the full composer.",
  },
  {
    path: "/about",
    title: "About Vixerra",
    what: "Who builds this",
    plan: "any",
    art: "welcome",
    steps: [
      { icon: "eye", title: "Read the background", detail: "Then head to features for what it actually does." },
    ],
  },
  {
    path: "/contact",
    title: "Contact",
    what: "Reach the team",
    plan: "any",
    art: "account",
    steps: [
      { icon: "mail", title: "Anything account-specific", detail: "Billing, a stuck generation, a refund." },
      { icon: "check", title: "Include your email", detail: "The one on the account, so it can be matched." },
    ],
  },
  {
    path: "/privacy",
    title: "Privacy",
    what: "What is collected and stored",
    plan: "any",
    art: "account",
    steps: [
      { icon: "shield", title: "Read before uploading", detail: "Especially someone else's likeness or a client's product." },
    ],
  },
  {
    path: "/terms",
    title: "Terms",
    what: "Your account and your output",
    plan: "any",
    art: "account",
    steps: [
      { icon: "shield", title: "Check the licence", detail: "Before using output in paid work." },
      { icon: "alert", title: "It starts at Starter", detail: "The free plan carries no commercial licence." },
    ],
  },

  // -------------------------------------------------------------- admin
  {
    path: "/admin/login",
    title: "Staff sign-in",
    what: "The way into the panel",
    plan: "staff",
    art: "auth",
    steps: [
      { icon: "shield", title: "Use a staff account", detail: "Separate from your customer login." },
    ],
  },
  {
    path: "/admin",
    title: "Admin overview",
    what: "Platform health at a glance",
    plan: "staff",
    art: "admin",
    steps: [
      { icon: "gauge", title: "Scan the metrics", detail: "Start here before anything else." },
      { icon: "activity", title: "Follow the anomaly", detail: "Open Generations to see the jobs behind it." },
    ],
  },
  {
    path: "/admin/generations",
    title: "Generations",
    what: "Every job on the platform",
    plan: "staff",
    art: "admin",
    steps: [
      { icon: "search", title: "Filter to the case", detail: "By account or by model." },
      { icon: "eye", title: "Open the job", detail: "Its parameters and its failure reason." },
      { icon: "coins", title: "Refund if it was us", detail: "Credit it back from the Credits screen." },
    ],
  },
  {
    path: "/admin/users",
    title: "Users",
    what: "Find an account",
    plan: "staff",
    art: "admin",
    steps: [
      { icon: "search", title: "Search by email", detail: "The fastest way in." },
      { icon: "eye", title: "Open the account", detail: "Plan, balance and generation history." },
    ],
  },
  {
    path: "/admin/users/*",
    title: "One account",
    what: "Everything about a user",
    plan: "staff",
    art: "admin",
    steps: [
      { icon: "gauge", title: "Confirm plan and balance", detail: "Before acting on a support ticket." },
      { icon: "coins", title: "Adjust from Credits", detail: "Every change lands in the audit log." },
    ],
  },
  {
    path: "/admin/credits",
    title: "Credits",
    what: "Adjust a balance",
    plan: "staff",
    art: "credits",
    steps: [
      { icon: "search", title: "Find the account", detail: "Then enter the adjustment." },
      { icon: "type", title: "Say why", detail: "Write the reason for someone who was not here." },
    ],
    note: "Every adjustment is recorded in the audit log.",
    noteTone: "warn",
  },
  {
    path: "/admin/presets",
    title: "Presets",
    what: "The recipe catalogue",
    plan: "staff",
    art: "presets",
    steps: [
      { icon: "sliders", title: "Compose a recipe", detail: "Any model in the catalogue, with its parameters." },
      { icon: "eye", title: "Add an honest preview", detail: "It sells the kind of shot the recipe aims for." },
      { icon: "send", title: "Publish it", detail: "It appears in /presets with no deploy." },
    ],
    note: "A preset's prompt stays server-side. The browser only ever sends the slug.",
  },
  {
    path: "/admin/content",
    title: "Content",
    what: "What the public gallery shows",
    plan: "staff",
    art: "gallery",
    steps: [
      { icon: "eye", title: "Review what is public", detail: "Everything shared, in one place." },
      { icon: "check", title: "Feature or remove", detail: "Promote the good, drop what should not be there." },
    ],
  },
  {
    path: "/admin/support",
    title: "Support",
    what: "The inbound queue",
    plan: "staff",
    art: "admin",
    steps: [
      { icon: "clock", title: "Work oldest first", detail: "The queue is ordered for a reason." },
      { icon: "eye", title: "Read the account first", detail: "Their plan and recent generations, before replying." },
    ],
  },
  {
    path: "/admin/audit",
    title: "Audit log",
    what: "Every staff action",
    plan: "staff",
    art: "admin",
    steps: [
      { icon: "shield", title: "Check it either side", detail: "Before and after any change to an account." },
      { icon: "search", title: "Filter to reconstruct", detail: "By staff member, or by account." },
    ],
  },
];

/** True when `pattern` describes `path`, treating `*` as one segment. */
function matches(pattern: string, path: string): boolean {
  const p = pattern.split("/").filter(Boolean);
  const s = path.split("/").filter(Boolean);
  if (p.length !== s.length) return false;
  return p.every((segment, i) => segment === "*" || segment === s[i]);
}

/**
 * The guide for a pathname, or null when the screen has none.
 *
 * Exact routes win over wildcard ones, so "/collections" keeps its own
 * guide rather than being swallowed by "/collections/*".
 */
export function getPageGuide(pathname: string): PageGuide | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  return (
    PAGE_GUIDES.find((guide) => guide.path === path) ??
    PAGE_GUIDES.find((guide) => guide.path.includes("*") && matches(guide.path, path)) ??
    null
  );
}
