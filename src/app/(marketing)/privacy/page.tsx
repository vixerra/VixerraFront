import type { Metadata } from "next";
import { LegalDraftNotice } from "@/components/marketing/legal-draft-notice";
import { openGraph } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What Vixlens collects when you generate video and images, why it is collected, how long it is kept, and the choices you have over it.",
  alternates: { canonical: "/privacy" },
  openGraph: openGraph({
    title: "Privacy Policy",
    description:
      "What Vixlens collects when you generate video and images, why it is collected, and how long it is kept.",
    path: "/privacy",
  }),
};

const SECTIONS = [
  {
    title: "What we collect",
    body: "Account details (name, email, password hash), the prompts and files you submit for generation, the media that results, and basic usage data (generations run, credits used) needed to operate the product and enforce plan limits.",
  },
  {
    title: "How we use it",
    body: "To run your generations, maintain your gallery and collections, calculate credit usage, and communicate with you about your account (password resets, team invites, product updates you've opted into).",
  },
  {
    title: "Third parties",
    body: "Generation requests are sent to the model provider that fulfills them (kie.ai and others) — your prompt and any reference image/video you attach is shared with that provider to produce the result. Uploaded files and results are stored with our cloud storage provider. Authentication (including Google sign-in) is handled via Supabase Auth.",
  },
  {
    title: "Your content's visibility",
    body: "Generations are private by default. Marking one public makes it viewable in the community gallery; you can revert this at any time. Sharing a collection link makes its contents viewable by anyone with that link until you disable sharing.",
  },
  {
    title: "Retention",
    body: "Your account and generations are retained until you delete them or close your account. Deleting a generation removes it from your gallery; underlying provider-hosted media may persist for a period afterward per that provider's own retention policy.",
  },
  {
    title: "Your choices",
    body: "You can update your profile, change your password, revoke API keys, and delete individual generations or collections at any time from Settings.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="container-page py-20 sm:py-28">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-heading font-bold tracking-tight text-ink sm:text-display">
          Privacy <span className="text-gradient">Policy</span>
        </h1>
        <p className="mt-3 text-body-sm text-muted">Last updated: not yet published</p>

        <div className="mt-8">
          <LegalDraftNotice />
        </div>

        <div className="space-y-8">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-feature-title font-semibold text-ink">{section.title}</h2>
              <p className="mt-2 text-body-sm text-muted">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
