import type { Metadata } from "next";
import { openGraph } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About",
  description:
    "Vixlens is an AI creative studio for teams that ship fast — describe a scene or animate a photo, and get broadcast-ready video and imagery back in minutes.",
  alternates: { canonical: "/about" },
  openGraph: openGraph({
    title: "About",
    description:
      "Vixlens is an AI creative studio for teams that ship fast — describe a scene, animate a photo, and get broadcast-ready video and imagery back in minutes.",
    path: "/about",
  }),
};

export default function AboutPage() {
  return (
    <div className="container-page py-20 sm:py-28">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-heading font-bold tracking-tight text-ink sm:text-display">
          About <span className="text-gradient">Vixlens</span>
        </h1>
        <p className="mt-4 text-body text-muted">
          Vixlens is an AI creative studio for teams that ship fast — describe a scene, animate a
          photo, or drop in audio, and get broadcast-ready video and imagery back in minutes.
        </p>

        <div className="mt-10 space-y-8 text-body text-ink-soft">
          <section>
            <h2 className="text-feature-title font-semibold text-ink">What we&apos;re building</h2>
            <p className="mt-2 text-body-sm text-muted">
              We connect creators to the best available generation models — ByteDance Seedance,
              Google Veo, xAI Grok Imagine, Recraft, Leonardo, and more — through one composer, one
              credit system, and one gallery, instead of juggling a dozen separate tools and
              accounts.
            </p>
          </section>
          <section>
            <h2 className="text-feature-title font-semibold text-ink">Get in touch</h2>
            <p className="mt-2 text-body-sm text-muted">
              Questions about plans, enterprise, or the API?{" "}
              <a href="/contact" className="text-brand hover:text-brand-hover">
                Reach out
              </a>{" "}
              — we read every message.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
