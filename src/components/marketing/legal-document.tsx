import Link from "next/link";
import type { ReactNode } from "react";
import { LegalDraftNotice } from "@/components/marketing/legal-draft-notice";

// Shared layout for /terms and /privacy, modelled on how the larger AI
// studios lay out their legal pages: the notices a reader must not miss up
// top, an index of anchored sections, then numbered sections whose clauses
// carry a bold "1.1 Title." lead-in. Numbers are derived from array order so
// inserting a section never leaves the index and the headings disagreeing.

export type LegalClause = {
  /** Omit for an unnumbered paragraph (e.g. a section's opening line). */
  title?: string;
  /** Inline content only — it renders inside a <p>. Use `list` for bullets. */
  body: ReactNode;
  list?: ReactNode[];
};

export type LegalSection = {
  /** Anchor for the index, e.g. /terms#credits. Keep stable once published. */
  id: string;
  title: string;
  clauses: LegalClause[];
};

export function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-brand underline-offset-2 hover:text-brand-hover hover:underline">
      {children}
    </Link>
  );
}

export function LegalDocument({
  title,
  updated,
  intro,
  notices,
  sections,
  related,
}: {
  title: ReactNode;
  updated: string;
  intro: ReactNode[];
  notices?: ReactNode[];
  sections: LegalSection[];
  related: { href: string; label: string };
}) {
  return (
    <div className="container-page py-20 sm:py-28">
      <article className="mx-auto max-w-3xl">
        <h1 className="text-heading font-bold tracking-tight text-ink sm:text-display">{title}</h1>
        <p className="mt-3 text-body-sm text-muted">Last updated: {updated}</p>

        <div className="mt-8">
          <LegalDraftNotice />
        </div>

        <div className="space-y-4 text-body-sm text-muted">
          {intro.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        {notices && notices.length > 0 && (
          <div className="mt-8 space-y-3 rounded-xl border border-line bg-surface-2 p-5">
            {notices.map((notice, i) => (
              <p key={i} className="text-body-sm font-semibold text-ink">
                {notice}
              </p>
            ))}
          </div>
        )}

        <nav aria-labelledby="legal-contents" className="mt-10 rounded-xl border border-line p-5">
          <h2 id="legal-contents" className="text-caption font-semibold text-ink">
            Contents
          </h2>
          <ol className="mt-3 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
            {sections.map((section, i) => (
              <li key={section.id} className="text-body-sm">
                <a
                  href={`#${section.id}`}
                  className="text-muted transition-colors hover:text-brand"
                >
                  {i + 1}. {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-12 space-y-12">
          {sections.map((section, i) => {
            let clauseNumber = 0;
            return (
              <section key={section.id} id={section.id} className="scroll-mt-20">
                <h2 className="text-feature-title font-semibold text-ink">
                  {i + 1}. {section.title}
                </h2>
                <div className="mt-4 space-y-4 text-body-sm text-muted">
                  {section.clauses.map((clause, j) => {
                    if (clause.title) clauseNumber += 1;
                    return (
                      <div key={j}>
                        <p>
                          {clause.title && (
                            <strong className="font-semibold text-ink">
                              {i + 1}.{clauseNumber} {clause.title}.{" "}
                            </strong>
                          )}
                          {clause.body}
                        </p>
                        {clause.list && (
                          <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-line">
                            {clause.list.map((item, k) => (
                              <li key={k}>{item}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <p className="mt-16 border-t border-line pt-6 text-body-sm text-muted">
          See also our <LegalLink href={related.href}>{related.label}</LegalLink>. Questions?{" "}
          <LegalLink href="/contact">Contact us</LegalLink>.
        </p>
      </article>
    </div>
  );
}
