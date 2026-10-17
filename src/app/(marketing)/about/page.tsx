import type { Metadata } from "next";
import Link from "next/link";
import { OwnerPlaceholder } from "@/components/marketing/owner-placeholder";
import { COMPANY, SHOW_COMPANY_PLACEHOLDERS } from "@/lib/company";
import { IMAGE_MODELS, VIDEO_MODELS } from "@/lib/constants";
import { openGraph } from "@/lib/seo";

const DESCRIPTION =
  "Vixlens is an AI creative studio for teams that ship fast — describe a scene or animate a photo, and get broadcast-ready video and imagery back in minutes.";

export const metadata: Metadata = {
  title: "About",
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: openGraph({
    images: "file",
    title: "About",
    description: DESCRIPTION,
    path: "/about",
  }),
};

// Model makers come from the registry, so this never names a provider whose
// models aren't actually on Vixlens.
const PROVIDERS = [
  ...new Set([...VIDEO_MODELS, ...IMAGE_MODELS].map((m) => m.provider)),
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-feature-title font-semibold text-ink">{title}</h2>
      <div className="mt-2 space-y-3 text-body-sm text-muted">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  const companyFacts = [
    {
      label: "Company",
      value: COMPANY.legalName,
      todo: "registered legal name",
    },
    { label: "Based in", value: COMPANY.location, todo: "city and country" },
  ];

  return (
    <div className="container-page py-20 sm:py-28">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-heading font-light text-ink sm:text-display">
          About <span className="text-gradient">Vixlens</span>
        </h1>
        <p className="mt-4 text-body text-muted">
          Vixlens is an AI creative studio for teams that ship fast — describe a
          scene, animate a photo, or recast a video, and get broadcast-ready
          video and imagery back in minutes.
        </p>

        <div className="mt-10 space-y-10 text-body text-ink-soft">
          {/* Sections still waiting on the owner render only in development. */}
          {(COMPANY.story || SHOW_COMPANY_PLACEHOLDERS) && (
            <Section title="Why we built it">
              {COMPANY.story ? (
                COMPANY.story.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))
              ) : (
                <OwnerPlaceholder>
                  the story of why Vixlens exists
                </OwnerPlaceholder>
              )}
            </Section>
          )}

          <Section title="What we're building">
            <p>
              One studio for every top generation model — {PROVIDERS.join(", ")}{" "}
              — through one composer, one credit balance and one gallery,
              instead of a dozen separate tools and accounts. On top of the
              models sit the things only Vixlens does: Genjutsu for recasting a
              video, AI Influencers with a locked identity, a marketing studio,
              an editing studio and direct publishing.
            </p>
          </Section>

          {(COMPANY.team.length > 0 || SHOW_COMPANY_PLACEHOLDERS) && (
            <Section title="Team">
              {COMPANY.team.length > 0 ? (
                <ul className="space-y-2">
                  {COMPANY.team.map((member) => (
                    <li key={member.name}>
                      <span className="font-medium text-ink">
                        {member.href ? (
                          <a
                            href={member.href}
                            className="hover:text-brand-ink"
                            rel="noopener noreferrer"
                          >
                            {member.name}
                          </a>
                        ) : (
                          member.name
                        )}
                      </span>{" "}
                      — {member.role}
                    </li>
                  ))}
                </ul>
              ) : (
                <OwnerPlaceholder>team members and roles</OwnerPlaceholder>
              )}
            </Section>
          )}

          {(companyFacts.some((fact) => fact.value) ||
            SHOW_COMPANY_PLACEHOLDERS) && (
            <Section title="Company">
              <dl className="space-y-2">
                {companyFacts.map((fact) =>
                  fact.value ? (
                    <div key={fact.label} className="flex gap-2">
                      <dt className="text-ink">{fact.label}:</dt>
                      <dd>{fact.value}</dd>
                    </div>
                  ) : (
                    <div key={fact.label}>
                      <OwnerPlaceholder>{fact.todo}</OwnerPlaceholder>
                    </div>
                  ),
                )}
              </dl>
            </Section>
          )}

          <Section title="Get in touch">
            <p>
              Questions about plans, teams or the API?{" "}
              <Link
                href="/contact"
                className="text-brand-ink hover:text-ink/70"
              >
                Contact us
              </Link>
              {COMPANY.supportEmail ? (
                <>
                  {" "}
                  or write to{" "}
                  <a
                    href={`mailto:${COMPANY.supportEmail}`}
                    className="text-brand-ink hover:text-ink/70"
                  >
                    {COMPANY.supportEmail}
                  </a>
                </>
              ) : null}{" "}
              — we reply {COMPANY.responseTime}.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
