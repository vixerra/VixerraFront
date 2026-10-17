import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { TESTIMONIALS } from "@/lib/testimonials";

// Renders nothing until lib/testimonials.ts has real entries — no sample
// quotes, no "coming soon" box.
export function Testimonials() {
  if (TESTIMONIALS.length === 0) return null;

  return (
    <section className="container-page py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-heading font-bold text-ink">What creators say</h2>
      </div>
      <ul className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <li key={`${t.name}-${t.quote.slice(0, 20)}`} className="flex flex-col rounded-2xl border border-line bg-surface-2 p-6">
            <blockquote className="text-body text-ink-soft">&ldquo;{t.quote}&rdquo;</blockquote>
            <div className="mt-6 flex items-center gap-3">
              {t.avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- small avatar, any origin
                <img src={t.avatarUrl} alt="" className="size-10 rounded-full object-cover" loading="lazy" />
              )}
              <div className="min-w-0">
                <p className="text-body-sm font-semibold text-ink">{t.name}</p>
                {t.handle && <p className="text-caption text-muted">{t.handle}</p>}
              </div>
            </div>
            {t.outputHref && (
              <Link
                href={t.outputHref}
                className="mt-4 inline-flex w-fit items-center gap-1.5 text-label font-semibold text-brand-ink"
              >
                See the output
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
