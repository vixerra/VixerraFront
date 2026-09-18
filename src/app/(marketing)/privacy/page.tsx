import type { Metadata } from "next";
import { LegalDocument, LegalLink, type LegalSection } from "@/components/marketing/legal-document";
import { openGraph } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What Vixlens collects when you generate video and images, why it is collected, who it is shared with, how long it is kept, and the choices and rights you have over it.",
  alternates: { canonical: "/privacy" },
  openGraph: openGraph({
    title: "Privacy Policy",
    description:
      "What Vixlens collects when you generate video and images, why it is collected, and how long it is kept.",
    path: "/privacy",
  }),
};

const SECTIONS: LegalSection[] = [
  {
    id: "information-we-collect",
    title: "Information we collect",
    clauses: [
      {
        title: "Information you give us",
        body: "When you use Vixlens you provide:",
        list: [
          "account details — your name, email address and password (stored only as a secure hash by our authentication provider);",
          "the prompts, images, videos, audio and other files you submit for generation, and anything you add to collections;",
          "the email addresses of teammates you invite to a workspace;",
          "what you send us through the contact form or by email.",
        ],
      },
      {
        title: "Information created when you use the Service",
        body: "We record the media you generate; your generation history (model, settings, credit cost and status); credit purchases, grants and spending; your plan and subscription status; and technical data such as IP address, browser and device type, and server logs, which we need to run and secure the Service.",
      },
      {
        title: "Information from third parties",
        body: "If you sign in with Google, we receive your name, email address and profile picture from Google. If you connect a TikTok, Instagram, YouTube or Facebook account, we receive that account's identifier, name and the access tokens needed to publish on your behalf. Stripe tells us whether a payment succeeded and gives us your invoices; your full card details go to Stripe and never reach us.",
      },
      {
        title: "Images of people",
        body: "Files you upload may show people's faces or other likenesses. We process them only to produce the generation you asked for. We don't create facial templates or use them to identify anyone.",
      },
      {
        title: "Cookies and local storage",
        body: "We use only what is essential: cookies and browser storage that keep you signed in and remember preferences such as your interface settings. We don't use advertising cookies or third-party analytics trackers. Stripe sets its own cookies on its checkout pages to prevent fraud.",
      },
    ],
  },
  {
    id: "how-we-use",
    title: "How we use your information",
    clauses: [
      {
        body: "We use your information to:",
        list: [
          "run your generations and deliver the results;",
          "store your gallery, collections and team workspaces, and publish or schedule posts to the accounts you connect;",
          "manage credits, subscriptions and invoices, and enforce plan limits;",
          "send you service emails — email verification, password resets, team invites, billing and important account notices — and product updates only if you have opted in;",
          "reply to your messages and support requests;",
          "keep the Service secure: prevent fraud and abuse (such as multiple accounts created to collect free credits), moderate content and enforce our Terms;",
          "understand aggregate usage, such as which models are used most, to improve the Service;",
          "comply with our legal obligations.",
        ],
      },
      {
        body: "We do not use your content to train AI models, we do not sell your personal information, and we do not use it for targeted advertising.",
      },
    ],
  },
  {
    id: "how-we-share",
    title: "How we share your information",
    clauses: [
      {
        title: "AI model providers",
        body: "To produce a generation, your prompt and any files you attach are sent to the provider that runs the chosen model — such as kie.ai or Cloudflare Workers AI, and the model developers behind them. They process it under their own terms to return your result.",
      },
      {
        title: "Service providers",
        body: "We rely on Supabase for authentication and our database, Cloudflare for file storage, and Stripe for payments. They process information on our behalf, only to provide their services to us.",
      },
      {
        title: "Social platforms",
        body: "When you publish or schedule a post, the media and caption you choose are sent to the platform you selected, where that platform's privacy policy applies.",
      },
      {
        title: "Other users",
        body: "Content you make public is visible to anyone in the community gallery; a shared collection link shows its contents to anyone who has the link; and content created in a team workspace is visible to that workspace's members.",
      },
      {
        title: "Legal and safety reasons",
        body: "We may disclose information when the law requires it, or when we believe in good faith that it is necessary to protect the rights, property or safety of our users, the public or Vixlens — for example, to report child sexual abuse material to the authorities.",
      },
      {
        title: "Business transfers",
        body: "If Vixlens is involved in a merger, acquisition or sale of assets, your information may be transferred as part of that transaction, and remains protected by this policy.",
      },
    ],
  },
  {
    id: "visibility",
    title: "Your content's visibility",
    clauses: [
      {
        body: "Generations are private by default. Marking one public makes it viewable in the community gallery; you can revert this at any time. Sharing a collection link makes its contents viewable by anyone with that link until you disable sharing.",
      },
    ],
  },
  {
    id: "retention",
    title: "Retention",
    clauses: [
      {
        title: "While your account is open",
        body: "We keep your account information and content for as long as your account is open. Deleting a generation removes it from your gallery; copies held by the model provider that produced it may persist for a period under that provider's own retention policy.",
      },
      {
        title: "After your account is closed",
        body: "We delete or anonymize your personal information within 30 days of your account being closed, except for copies in backups, which are overwritten on a rolling basis, and records we must keep by law — such as invoices and payment records, which we keep for as long as tax and accounting rules require.",
      },
      {
        title: "Logs",
        body: "Technical logs are kept for a short period for security and debugging, then deleted.",
      },
    ],
  },
  {
    id: "your-choices",
    title: "Your choices",
    clauses: [
      {
        body: "You can at any time:",
        list: [
          "update your profile and change your password from Settings;",
          "create and revoke API keys;",
          "delete individual generations and collections, or make public content private again;",
          "disconnect social accounts, which also cancels anything still scheduled to them;",
          "update your payment method and download invoices from the billing portal;",
          "unsubscribe from product emails using the link in each one (service emails about your account will still be sent);",
          "clear or block cookies in your browser — although you will then be signed out.",
        ],
      },
      {
        body: (
          <>
            To close your account and have your data deleted,{" "}
            <LegalLink href="/contact">contact us</LegalLink>.
          </>
        ),
      },
    ],
  },
  {
    id: "security",
    title: "Security",
    clauses: [
      {
        body: "We protect your information with encryption in transit, hashed passwords, access controls and short-lived signed links for private media. No system is perfectly secure, though, and we can't guarantee that information will never be accessed without authorization. If a breach affects your personal information, we will notify you and the authorities as the law requires.",
      },
    ],
  },
  {
    id: "international-transfers",
    title: "International transfers",
    clauses: [
      {
        body: "Our providers operate in the United States and other countries, so your information may be processed outside the country where you live, including in countries with different data-protection laws. When we transfer personal information out of the European Economic Area, the United Kingdom or Switzerland, we rely on an adequacy decision or on safeguards such as the European Commission's Standard Contractual Clauses.",
      },
    ],
  },
  {
    id: "children",
    title: "Children",
    clauses: [
      {
        body: (
          <>
            Vixlens is not intended for anyone under 18, and we don&apos;t knowingly collect
            personal information from them. If you believe a minor has given us personal
            information, <LegalLink href="/contact">contact us</LegalLink> and we will delete it.
          </>
        ),
      },
    ],
  },
  {
    id: "other-sites",
    title: "Other sites and services",
    clauses: [
      {
        body: "The Service links to and integrates with services we don't control — such as Google, Stripe and the social platforms you connect. Their privacy policies, not this one, govern the information they collect.",
      },
    ],
  },
  {
    id: "european-users",
    title: "Notice to users in the EEA and UK",
    clauses: [
      {
        title: "Controller",
        body: "Vixlens is the controller of the personal information described in this policy.",
      },
      {
        title: "Legal bases",
        body: "We process your personal information on these bases:",
        list: [
          <>
            <strong className="font-semibold text-ink">Contract</strong> — to create your account,
            run generations, publish where you ask us to and manage your plan and payments.
          </>,
          <>
            <strong className="font-semibold text-ink">Legitimate interests</strong> — to secure the
            Service, prevent fraud and abuse, moderate content and understand aggregate usage, in
            ways that don&apos;t override your rights.
          </>,
          <>
            <strong className="font-semibold text-ink">Consent</strong> — to send product updates,
            which you can withdraw at any time.
          </>,
          <>
            <strong className="font-semibold text-ink">Legal obligation</strong> — to keep invoices
            and payment records and respond to lawful requests.
          </>,
        ],
      },
      {
        title: "Your rights",
        body: "You have the right to access your personal information, correct it, have it deleted, restrict or object to its processing, receive it in a portable format and withdraw consent at any time. You also have the right to complain to your local data-protection authority.",
      },
      {
        title: "Automated decisions",
        body: "We don't make decisions that have legal or similarly significant effects on you based solely on automated processing. Automated safety filters may block a generation; if you think one was blocked by mistake, you can ask us to review it.",
      },
    ],
  },
  {
    id: "us-residents",
    title: "Notice to U.S. state residents",
    clauses: [
      {
        body: "Depending on the state where you live — including California — you may have the right to know what personal information we collect and how we use and disclose it, to access, correct and delete it, and to opt out of its sale or its sharing for targeted advertising. We don't sell personal information or share it for targeted advertising. We won't treat you differently for exercising your rights. You can make a request yourself or through an authorized agent; we may need to verify your identity before acting on it.",
      },
    ],
  },
  {
    id: "changes",
    title: "Changes to this policy",
    clauses: [
      {
        body: "We may update this policy as the Service changes. If a change is material, we will tell you by email or in the app before it takes effect and update the date at the top of this page.",
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
            To exercise your rights or ask a question about this policy, reach us through the{" "}
            <LegalLink href="/contact">contact page</LegalLink>. We respond to privacy requests
            within 30 days.
          </>
        ),
      },
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      title={
        <>
          Privacy <span className="text-gradient">Policy</span>
        </>
      }
      updated="September 18, 2026"
      intro={[
        "This Privacy Policy explains what personal information Vixlens collects when you use our website, generation workspace, studios, publishing tools and API (the \"Service\"), how we use and share it, how long we keep it, and the choices and rights you have.",
        <>
          If you are in the European Economic Area or the United Kingdom, see also{" "}
          <LegalLink href="#european-users">the notice for European users</LegalLink>.
        </>,
      ]}
      notices={[
        "We don't sell your personal information, we don't use it for targeted advertising, and we don't use your prompts, uploads or generations to train AI models.",
      ]}
      sections={SECTIONS}
      related={{ href: "/terms", label: "Terms of Service" }}
    />
  );
}
