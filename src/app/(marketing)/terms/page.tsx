import type { Metadata } from "next";
import { LegalDraftNotice } from "@/components/marketing/legal-draft-notice";
import { TIERS, TIER_INFO } from "@/lib/constants";
import { openGraph } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern use of Vixerra, including generation, credits and commercial use.",
  alternates: { canonical: "/terms" },
  openGraph: openGraph({
    title: "Terms of Service",
    description:
      "The terms that govern use of Vixerra, including generation, credits and commercial use.",
    path: "/terms",
  }),
};

// Plan names and the commercial-use split are read from TIER_INFO rather
// than written out, so section 4 can never describe a different ladder than
// the pricing page does.
const COMMERCIAL_PLANS = TIERS.filter((t) => TIER_INFO[t].commercialLicense).map(
  (t) => TIER_INFO[t].label,
);
const PERSONAL_PLANS = TIERS.filter((t) => !TIER_INFO[t].commercialLicense).map(
  (t) => TIER_INFO[t].label,
);

function list(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const SECTIONS = [
  {
    title: "1. Using Vixerra",
    body: "You need an account to generate, save, or share content. You're responsible for what you generate and for keeping your account credentials secure. Don't use Vixerra to create content that's illegal, infringes someone else's rights, or violates the acceptable-use terms of the underlying model providers.",
  },
  {
    title: "2. Credits and billing",
    body: `Paid plans grant a monthly credit allowance. ${TIER_INFO.free.label} instead grants ${TIER_INFO.free.monthlyCredits} credits once, when the account is created — they do not renew, and they do not expire. Credit packs purchased separately don't expire either. Credits are deducted when a generation is submitted and refunded automatically if it fails. Downgrading or cancelling doesn't retroactively refund credits already used.`,
  },
  {
    title: "3. Your content",
    body: "You own what you generate, subject to the license terms of the underlying model you used. Vixerra doesn't claim ownership of your generations. Content marked public in the gallery can be viewed by other users; you can make it private at any time.",
  },
  {
    title: "4. Commercial use",
    body: `${list(COMMERCIAL_PLANS)} include the right to use what you generate commercially — in advertising, in a product, or for a client — within the licence terms of the underlying model. ${list(
      PERSONAL_PLANS,
    )} ${PERSONAL_PLANS.length === 1 ? "is" : "are"} for personal and evaluation use only, and video generated ${
      PERSONAL_PLANS.length === 1 ? "on it" : "on those plans"
    } carries a watermark. Work you generated while on a commercial plan stays licensed for commercial use if you later downgrade.`,
  },
  {
    title: "5. Team accounts",
    body: "On plans that include multiple seats, the account owner is responsible for the team's credit usage and for who they invite. Removing a member from a team ends their access to that team's shared credit pool immediately.",
  },
  {
    title: "6. Availability",
    body: "Generation depends on third-party model providers (kie.ai and others). We aim for high availability but don't guarantee uninterrupted service, and a provider outage may delay or fail generations outside our control.",
  },
  {
    title: "7. Changes",
    body: "We may update these terms as the product changes. Material changes will be reflected here with an updated date.",
  },
];

export default function TermsPage() {
  return (
    <div className="container-page py-20 sm:py-28">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-heading font-bold tracking-tight text-ink sm:text-display">
          Terms of <span className="text-gradient">Service</span>
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
