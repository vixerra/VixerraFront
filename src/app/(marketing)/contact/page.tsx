import type { Metadata } from "next";
import { ContactForm } from "@/components/marketing/contact-form";
import { openGraph } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Questions about plans, enterprise, or the Vixerra API? Send us a note and we'll get back to you within a day.",
  alternates: { canonical: "/contact" },
  openGraph: openGraph({
    title: "Contact",
    description:
      "Questions about plans, enterprise, or the Vixerra API? Send us a note and we'll get back to you within a day.",
    path: "/contact",
  }),
};

export default function ContactPage() {
  return (
    <div className="container-page py-20 sm:py-28">
      <div className="mx-auto max-w-xl">
        <h1 className="text-heading font-bold tracking-tight text-ink sm:text-display">
          Contact <span className="text-gradient">us</span>
        </h1>
        <p className="mt-4 text-body text-muted">
          Questions about plans, enterprise, or the API? Send us a note.
        </p>

        <ContactForm />
      </div>
    </div>
  );
}
