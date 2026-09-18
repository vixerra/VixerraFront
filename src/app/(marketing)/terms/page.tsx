import type { Metadata } from "next";
import { LegalDocument, LegalLink, type LegalSection } from "@/components/marketing/legal-document";
import { TIERS, TIER_INFO, type Tier } from "@/lib/constants";
import { openGraph } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern use of Vixlens, including accounts, credits, subscriptions, content ownership and commercial use.",
  alternates: { canonical: "/terms" },
  openGraph: openGraph({
    title: "Terms of Service",
    description:
      "The terms that govern use of Vixlens, including accounts, credits, subscriptions, content ownership and commercial use.",
    path: "/terms",
  }),
};

// Plan names, the commercial-use split, credit rollover and the plan-gated
// features are read from TIER_INFO rather than written out, so these terms
// can never describe a different ladder than the pricing page does.
function plans(predicate: (tier: Tier) => boolean): string[] {
  return TIERS.filter(predicate).map((t) => TIER_INFO[t].label);
}

function list(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const COMMERCIAL_PLANS = plans((t) => TIER_INFO[t].commercialLicense);
const PERSONAL_PLANS = plans((t) => !TIER_INFO[t].commercialLicense);
const EXPIRING_PLANS = plans((t) => TIER_INFO[t].renewsMonthly && TIER_INFO[t].rolloverMonths === 0);
const ROLLOVER_PLANS = plans((t) => TIER_INFO[t].renewsMonthly && TIER_INFO[t].rolloverMonths > 0);
const TEAM_PLANS = plans((t) => TIER_INFO[t].seats > 1);
const CREATOR_SUITE_PLANS = plans((t) => TIER_INFO[t].creatorSuite);
const API_PLANS = plans((t) => TIER_INFO[t].apiAccess);

const FREE = TIER_INFO.free;

const SECTIONS: LegalSection[] = [
  {
    id: "using-vixlens",
    title: "Using Vixlens",
    clauses: [
      {
        title: "Eligibility",
        body: "You must be at least 18 years old, or the age of majority where you live if that is higher, to use Vixlens. If you use Vixlens on behalf of a company or other organization, you confirm that you are authorized to accept these Terms for it, and \"you\" includes that organization.",
      },
      {
        title: "Your right to use the Service",
        body: "As long as you follow these Terms, we give you a personal, non-exclusive, non-transferable and revocable right to access and use the Service. Everything not expressly granted to you — including the Vixlens software, design, brand and presets — remains ours or our licensors'.",
      },
      {
        title: "Plan limits",
        body: (
          <>
            What you can generate depends on your plan: maximum resolution, maximum clip length,
            how many generations run at the same time, queue priority and which tools are available
            are listed on the <LegalLink href="/pricing">pricing page</LegalLink> and enforced by
            the Service.
          </>
        ),
      },
      {
        title: "Models and features change",
        body: "Vixlens gives you access to AI models run by third-party providers. We may add, update, replace or retire models and features at any time, and may change how many credits a model costs. The cost shown in the composer when you submit a generation is the cost charged for that generation.",
      },
      {
        title: "Preview features",
        body: "Features labelled beta, preview or experimental are offered as they are, may behave unpredictably and may be changed or removed without notice.",
      },
    ],
  },
  {
    id: "accounts",
    title: "Your account",
    clauses: [
      {
        title: "Registration",
        body: "You need an account to generate, save, publish or share content. You can sign up with an email address or with Google. Give us accurate information, keep it up to date, and don't create accounts on someone else's behalf without their permission.",
      },
      {
        title: "Security",
        body: "You are responsible for everything that happens under your account, including activity through your API keys. Keep your password and keys confidential and tell us promptly if you believe your account has been accessed without your permission.",
      },
      {
        title: "Team workspaces",
        body: `On ${list(TEAM_PLANS)}, the account owner can invite teammates to a shared workspace. The owner is responsible for who they invite, for how members use the Service and for the credits members spend from the shared balance. Removing a member ends their access to that workspace and its credits immediately.`,
      },
    ],
  },
  {
    id: "credits",
    title: "Credits, payments and refunds",
    clauses: [
      {
        title: "How credits work",
        body: "Generations are paid for in credits. What a generation costs depends on the model, resolution, duration and options you choose. Credits are deducted when a generation is submitted and refunded automatically if it fails, including when a provider's safety filter refuses it. Credits have no cash value, can't be transferred to another account and can't be exchanged for money.",
      },
      {
        title: "Plan credits",
        body: `Paid plans grant a credit allowance every month. ${list(EXPIRING_PLANS)} credits expire at the end of the month they were granted in; ${list(ROLLOVER_PLANS)} credits stay spendable for one further month and then expire. ${FREE.label} instead grants ${FREE.monthlyCredits} credits once, when the account is created — they do not renew and they do not expire.`,
      },
      {
        title: "Credit packs",
        body: "Credit packs are bought separately from a plan, are added to your balance as soon as payment goes through, stack on top of your plan credits and do not expire while your account is open.",
      },
      {
        title: "Payment",
        body: "Payments are processed by Stripe; we never see or store your full card number. Prices are charged in US dollars, and taxes may be added where they apply. By purchasing, you authorize us, through Stripe, to charge your payment method for the amounts shown at checkout.",
      },
      {
        title: "Refunds",
        body: "Except where the law requires otherwise or we charged you in error, payments are non-refundable. Downgrading or cancelling does not refund credits that have already been used, and unused plan credits are not refunded when they expire.",
      },
      {
        title: "Right of withdrawal (EU and UK consumers)",
        body: "If you are a consumer in the European Union or the United Kingdom, you normally have 14 days from a purchase to withdraw from it. Credits are digital content supplied immediately: by starting to use them within that period, you ask us to begin performance straight away and acknowledge that you lose the right of withdrawal for what you have used.",
      },
    ],
  },
  {
    id: "subscriptions",
    title: "Subscriptions",
    clauses: [
      {
        title: "Automatic renewal",
        body: "Paid plans are billed monthly in advance and renew automatically at the then-current price until you cancel.",
      },
      {
        title: "Cancelling",
        body: (
          <>
            You can cancel at any time from{" "}
            <LegalLink href="/settings/billing">Settings → Billing</LegalLink>. Cancellation takes
            effect at the end of the period you have already paid for, and your plan keeps working
            until then. You can undo a scheduled cancellation before it takes effect. We don&apos;t
            refund the remainder of a period you have cancelled.
          </>
        ),
      },
      {
        title: "Changing plans",
        body: "A plan change applies right away, and the unused part of what you had already paid is credited against your next invoice. Whether the new plan's allowance is granted now or at your next renewal is shown to you before you confirm the change.",
      },
      {
        title: "Price changes",
        body: "We will tell you at least 30 days before the price of your plan changes. The new price applies from your first renewal after that notice period, and you can cancel before then if you don't want to continue.",
      },
      {
        title: "Failed payments",
        body: "If a renewal payment fails, your subscription is marked past due and Stripe will retry the charge. Paid features may be suspended until you update your payment method; if the payment still can't be collected, your plan may be cancelled.",
      },
    ],
  },
  {
    id: "your-content",
    title: "Your content",
    clauses: [
      {
        title: "Inputs and outputs",
        body: "\"Inputs\" are the prompts, images, videos, audio and other material you submit to the Service. \"Outputs\" are the images and videos generated from them. Together they are \"Your Content\".",
      },
      {
        title: "Ownership",
        body: "As between you and Vixlens, you keep whatever rights you hold in your Inputs and you own your Outputs, subject to the licence terms of the model that produced them. We don't claim ownership of Your Content. Be aware that AI-generated material may not be protected by copyright in every country, and that other users may independently generate similar outputs.",
      },
      {
        title: "Licence to us",
        body: "You grant us a worldwide, non-exclusive, royalty-free licence to host, store, copy, process, transmit and display Your Content only as needed to operate and provide the Service to you — running your generations, keeping your gallery and collections, displaying content you have made public and publishing where you ask us to. This licence ends when you delete the content or close your account, except for backup copies kept for a limited time and anything we must keep by law.",
      },
      {
        title: "No model training",
        body: "We do not use Your Content to train AI models. Inputs are sent to the model provider that fulfils each generation, which processes them under its own terms to produce your Output.",
      },
      {
        title: "Public content",
        body: "Generations are private by default. Making one public lets anyone view it in the community gallery, and sharing a collection link lets anyone with the link see its contents. You can make content private or turn sharing off at any time, but we can't recall copies others made while it was public.",
      },
      {
        title: "Your responsibility",
        body: "You are responsible for Your Content and for how you use it. You confirm that you have all the rights and permissions your Inputs require — including the consent of any identifiable person whose image, voice or likeness you upload.",
      },
      {
        title: "Feedback",
        body: "If you send us ideas or suggestions, we may use them without any obligation to you.",
      },
    ],
  },
  {
    id: "commercial-use",
    title: "Commercial use",
    clauses: [
      {
        body: `${list(COMMERCIAL_PLANS)} include the right to use what you generate commercially — in advertising, in a product, or for a client — within the licence terms of the underlying model. ${list(
          PERSONAL_PLANS,
        )} ${PERSONAL_PLANS.length === 1 ? "is" : "are"} for personal and evaluation use only. Work you generated while on a commercial plan stays licensed for commercial use if you later downgrade or cancel.`,
      },
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    clauses: [
      {
        title: "What you must not do",
        body: "You must not use the Service, or help anyone else use it, to:",
        list: [
          "create or share anything illegal, or anything that infringes someone else's intellectual property, privacy or publicity rights;",
          "create any sexual or sexualized content involving minors, or content that exploits or endangers children — we report such content to the authorities;",
          "create intimate or sexually explicit imagery of a real person without their consent;",
          "impersonate a real person, or create realistic depictions of real people meant to deceive, defame or harass, including election or political disinformation;",
          "promote violence, terrorism, self-harm, hatred or harassment of any person or group;",
          "run scams, fraud, spam or deceptive advertising;",
          "get around plan limits, safety filters or the credit system, or open multiple accounts to collect free credits;",
          "scrape, copy or bulk-download the Service or other users' public content other than through the features and API we provide, or probe, disrupt or overload our systems;",
          "resell or share access to the Service or your API keys without our written permission;",
          "break the usage policies of the underlying model providers or of any platform you publish to.",
        ],
      },
      {
        title: "Labelling AI content",
        body: "Where a law or a platform's rules require AI-generated or synthetic media to be disclosed as such, you are responsible for doing so when you publish it.",
      },
    ],
  },
  {
    id: "moderation",
    title: "Moderation and enforcement",
    clauses: [
      {
        title: "Automated filtering",
        body: "Prompts, uploads and outputs may be checked by automated safety systems run by us or by model providers, and a generation that is blocked will not be delivered. Credits for blocked generations are refunded.",
      },
      {
        title: "Removal and restriction",
        body: "We may remove content, make it private, or restrict or suspend access to features or accounts if we reasonably believe they break these Terms or the law, or put users, third parties or the Service at risk.",
      },
      {
        title: "Reporting",
        body: (
          <>
            If you see content on Vixlens that you believe is illegal or breaks these Terms,{" "}
            <LegalLink href="/contact">report it to us</LegalLink>. We may share information with
            law enforcement where the law requires it or where we believe it is necessary to
            prevent harm.
          </>
        ),
      },
    ],
  },
  {
    id: "publishing",
    title: "Publishing to social platforms",
    clauses: [
      {
        title: "Connected accounts",
        body: `On ${list(CREATOR_SUITE_PLANS)}, you can connect TikTok, Instagram, YouTube and Facebook accounts. Connecting an account authorizes us to post to it on your behalf — only what you choose to publish or schedule.`,
      },
      {
        title: "Platform rules",
        body: "Each platform's own terms apply to what you post there, and each decides how posts are handled — for example, a post may arrive as a draft or stay private until that platform has approved our app. We aren't responsible for a platform's decisions about your content, its reach or your account.",
      },
      {
        title: "Disconnecting",
        body: "You can disconnect an account at any time from Settings. Anything still scheduled to that account is cancelled; posts already published stay up on the platform.",
      },
    ],
  },
  {
    id: "api",
    title: "API",
    clauses: [
      {
        title: "Access",
        body: `${list(API_PLANS)} ${API_PLANS.length === 1 ? "includes" : "include"} programmatic access to the Service through API keys created in Settings. Generations made through the API spend credits from the same balance and are subject to the same plan limits and these Terms.`,
      },
      {
        title: "Keys",
        body: "Keep API keys secret — never embed them in client-side code or public repositories. You are responsible for all usage through your keys. Revoke a key immediately if you think it has been exposed.",
      },
      {
        title: "Your own users",
        body: "If you build a product on the API, you are responsible for your end users and must make sure their use complies with these Terms.",
      },
      {
        title: "Limits",
        body: "We may apply rate and concurrency limits, and may suspend a key whose use threatens the stability or security of the Service.",
      },
    ],
  },
  {
    id: "third-parties",
    title: "Third-party services",
    clauses: [
      {
        body: "The Service relies on third parties, including AI model providers (such as kie.ai and Cloudflare Workers AI, and the model developers behind them), Stripe for payments, Google for sign-in, and the social platforms you connect. Their terms and policies apply to your use of their services, and we are not responsible for their products, content or availability.",
      },
    ],
  },
  {
    id: "availability",
    title: "Availability",
    clauses: [
      {
        body: "We aim to keep Vixlens available and fast, but we don't guarantee uninterrupted service. Generation times vary, and a provider outage can delay or fail generations for reasons outside our control. We may pause the Service for maintenance. Keep your own copies of outputs that matter to you — Vixlens is not a backup service.",
      },
    ],
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    clauses: [
      {
        body: "To the extent the law allows, the Service and all outputs are provided \"as is\" and \"as available\", without warranties of any kind, whether express or implied, including warranties of merchantability, fitness for a particular purpose and non-infringement. AI models can produce outputs that are inaccurate, unexpected, offensive or similar to existing works; review outputs before you rely on or publish them.",
      },
    ],
  },
  {
    id: "liability",
    title: "Limitation of liability",
    clauses: [
      {
        body: "To the extent the law allows, Vixlens is not liable for indirect, incidental, special, consequential or punitive damages, or for lost profits, revenue, data or goodwill. Our total liability for all claims relating to the Service is limited to the greater of the amount you paid us in the six months before the claim arose and 100 US dollars.",
      },
      {
        body: "Nothing in these Terms limits liability for death or personal injury caused by negligence, for fraud, or for anything else that cannot be limited by law, and nothing affects the rights you have as a consumer under the law of your country.",
      },
    ],
  },
  {
    id: "indemnity",
    title: "Indemnity",
    clauses: [
      {
        body: "To the extent the law allows, you will defend and compensate Vixlens against claims, losses and costs (including reasonable legal fees) arising from Your Content, your use of the Service, or your breach of these Terms, the law or someone else's rights.",
      },
    ],
  },
  {
    id: "copyright",
    title: "Copyright complaints",
    clauses: [
      {
        body: (
          <>
            If you believe content on Vixlens infringes your copyright,{" "}
            <LegalLink href="/contact">send us a notice</LegalLink> including:
          </>
        ),
        list: [
          "the work you believe is infringed;",
          "where the content is on Vixlens (a link is best);",
          "your name and contact details;",
          "a statement that you believe in good faith the use is not authorized by the owner, its agent or the law;",
          "a statement that your notice is accurate and that you are the owner or authorized to act for them, and your physical or electronic signature.",
        ],
      },
      {
        body: "We will remove or disable content that is the subject of a valid notice, and may close the accounts of repeat infringers. If your content was removed and you believe that was a mistake, you can send us a counter-notice.",
      },
    ],
  },
  {
    id: "termination",
    title: "Suspension and termination",
    clauses: [
      {
        title: "By you",
        body: (
          <>
            You can stop using Vixlens at any time. Cancel any paid plan from Settings, and{" "}
            <LegalLink href="/contact">contact us</LegalLink> if you want your account deleted.
          </>
        ),
      },
      {
        title: "By us",
        body: "We may suspend or close your account if you seriously or repeatedly break these Terms, if the law requires it, or if we need to in order to protect users, third parties or the Service. Where it is reasonable to, we will tell you first. If we close your account without cause, we will refund the unused part of any prepaid subscription period.",
      },
      {
        title: "What happens next",
        body: "When your account closes, your access ends and any remaining credits are forfeited, except as described above. Your rights in outputs you have already exported continue. The parts of these Terms that by their nature should survive — including ownership, disclaimers, limitation of liability and indemnity — continue to apply.",
      },
    ],
  },
  {
    id: "disputes",
    title: "Governing law and disputes",
    clauses: [
      {
        title: "Talk to us first",
        body: "If you have a dispute with us, contact us first. We will try in good faith to resolve it with you informally within 30 days.",
      },
      {
        title: "Governing law",
        body: "These Terms are governed by the laws of the country where Vixlens is established, without regard to its conflict-of-law rules. If you are a consumer, you keep the protection of the mandatory laws of the country where you live and may bring proceedings in its courts.",
      },
    ],
  },
  {
    id: "changes",
    title: "Changes to these Terms",
    clauses: [
      {
        body: "We may update these Terms as the Service changes. If a change is material, we will tell you by email or in the app at least 30 days before it takes effect and update the date at the top of this page. If you keep using Vixlens after that, the updated Terms apply; if you don't agree, stop using the Service and cancel your plan before they take effect.",
      },
    ],
  },
  {
    id: "general",
    title: "General",
    clauses: [
      {
        body: (
          <>
            These Terms, together with our <LegalLink href="/privacy">Privacy Policy</LegalLink> and
            the plan details shown when you purchase, are the entire agreement between you and
            Vixlens about the Service. If any provision is found unenforceable, the rest remain in
            effect. Not enforcing a provision is not a waiver of it. You may not transfer these
            Terms without our consent; we may transfer them as part of a merger, acquisition or
            sale of assets. Neither of us is liable for delays caused by events beyond reasonable
            control. We may send you notices electronically, by email or in the app.
          </>
        ),
      },
    ],
  },
  {
    id: "contact",
    title: "Contact",
    clauses: [
      {
        body: (
          <>
            Questions about these Terms? Reach us through the{" "}
            <LegalLink href="/contact">contact page</LegalLink>.
          </>
        ),
      },
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      title={
        <>
          Terms of <span className="text-gradient">Service</span>
        </>
      }
      updated="September 18, 2026"
      intro={[
        "These Terms of Service (\"Terms\") govern your access to and use of Vixlens — the website, the generation workspace, the marketing and editing studios, publishing, the API and any related services (together, the \"Service\"). \"Vixlens\", \"we\" and \"us\" mean the operator of the Service; \"you\" means the person or organization using it.",
        "By creating an account or using the Service, you agree to these Terms. If you don't agree, don't use the Service.",
      ]}
      notices={[
        "Paid plans renew automatically every month until you cancel. You can cancel at any time from Settings → Billing, and your plan keeps working until the end of the period you have paid for.",
        "Credits are deducted when you submit a generation and refunded automatically if it fails. Payments are otherwise non-refundable, except where the law requires a refund.",
      ]}
      sections={SECTIONS}
      related={{ href: "/privacy", label: "Privacy Policy" }}
    />
  );
}
