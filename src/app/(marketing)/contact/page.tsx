import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/marketing/contact-form";
import { OwnerPlaceholder } from "@/components/marketing/owner-placeholder";
import { COMPANY } from "@/lib/company";
import { openGraph } from "@/lib/seo";

const DESCRIPTION = `Questions about plans, teams, refunds or the Vixlens API? Send us a note and we'll reply ${COMPANY.responseTime}.`;

export const metadata: Metadata = {
  title: "Contact",
  description: DESCRIPTION,
  alternates: { canonical: "/contact" },
  openGraph: openGraph({
    images: "file",
    title: "Contact",
    description: DESCRIPTION,
    path: "/contact",
  }),
};

export default function ContactPage() {
  return (
    <div className="container-page py-20 sm:py-28">
      <div className="mx-auto max-w-xl">
        <h1 className="text-heading font-light text-ink sm:text-display">
          Contact <span className="text-gradient">us</span>
        </h1>
        <p className="mt-4 text-body text-muted">
          Questions about plans, teams, refunds or the API? Send us a note — we reply{" "}
          {COMPANY.responseTime}.
        </p>

        <div className="mt-6 rounded-xl border border-line bg-surface-2 p-4 text-body-sm text-muted">
          {COMPANY.supportEmail ? (
            <p className="mb-2">
              <span className="text-ink">Support email: </span>
              <a href={`mailto:${COMPANY.supportEmail}`} className="text-brand-ink hover:text-ink/70">
                {COMPANY.supportEmail}
              </a>
            </p>
          ) : (
            <OwnerPlaceholder>support email address</OwnerPlaceholder>
          )}
          <p className="mt-2">
            <span className="text-ink">Response time: </span>
            {COMPANY.responseTime}
          </p>
          <p className="mt-2">
            Billing question? See the{" "}
            <Link href="/refund-policy" className="text-brand-ink hover:text-ink/70">
              refund policy
            </Link>
            .
          </p>
        </div>

        <ContactForm />
      </div>
    </div>
  );
}
