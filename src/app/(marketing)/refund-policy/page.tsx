import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { openGraph } from "@/lib/seo";

// A plain-language summary of the refund rules. Nothing here is new policy:
// every point restates a clause of the Terms ("Credits, payments and
// refunds" and "Subscriptions"), and the Terms stay the binding text. Change
// a rule there first, then here.

const DESCRIPTION =
  "How refunds work on Vixlens: automatic credit refunds for failed generations, cancelling a subscription, and the EU/UK right of withdrawal.";

export const metadata: Metadata = {
  title: "Refund policy",
  description: DESCRIPTION,
  alternates: { canonical: "/refund-policy" },
  // Kept out of search until the text has had legal review (see COMPANY).
  ...(COMPANY.refundPolicyReviewed ? {} : { robots: { index: false, follow: true } }),
  openGraph: openGraph({
    images: "file",
    title: "Refund policy",
    description: DESCRIPTION,
    path: "/refund-policy",
  }),
};

const POINTS = [
  {
    title: "Failed or blocked generations",
    body: "Credits are deducted when you submit a generation and refunded automatically if it fails, including when a safety filter refuses it. You don't need to ask.",
  },
  {
    title: "Subscriptions",
    body: "You can cancel at any time from Settings → Billing. Cancelling stops the next renewal; your plan keeps working until the end of the period you've paid for. The remainder of a cancelled period isn't refunded.",
  },
  {
    title: "Payments",
    body: "Except where the law requires otherwise or we charged you in error, payments are non-refundable. Credits already used aren't refunded, and unused plan credits aren't refunded when they expire.",
  },
  {
    title: "Changing plans",
    body: "A plan change applies right away, and the unused part of what you'd already paid is credited against your next invoice.",
  },
  {
    title: "EU and UK consumers",
    body: "You normally have 14 days from a purchase to withdraw from it. Credits are digital content supplied immediately, so by starting to use them within that period you lose the right of withdrawal for what you've used.",
  },
  {
    title: "Charged in error?",
    body: `Contact us and we'll look into it — we reply ${COMPANY.responseTime}.`,
  },
];

export default function RefundPolicyPage() {
  return (
    <div className="container-page py-20 sm:py-28">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-heading font-light text-ink sm:text-display">
          Refund <span className="text-gradient">policy</span>
        </h1>
        <p className="mt-4 mb-10 text-body text-muted">
          A plain-language summary. The binding text is in our{" "}
          <Link href="/terms#credits" className="text-brand-ink hover:text-ink/70">
            Terms of Service
          </Link>
          .
        </p>

        <div className="space-y-8">
          {POINTS.map((point) => (
            <section key={point.title}>
              <h2 className="text-feature-title font-semibold text-ink">{point.title}</h2>
              <p className="mt-2 text-body-sm text-muted">{point.body}</p>
            </section>
          ))}
        </div>

        <p className="mt-12 text-body-sm text-muted">
          Questions?{" "}
          <Link href="/contact" className="text-brand-ink hover:text-ink/70">
            Contact us
          </Link>
          {COMPANY.supportEmail ? (
            <>
              {" "}
              or write to{" "}
              <a href={`mailto:${COMPANY.supportEmail}`} className="text-brand-ink hover:text-ink/70">
                {COMPANY.supportEmail}
              </a>
            </>
          ) : null}
          .
        </p>
      </div>
    </div>
  );
}
