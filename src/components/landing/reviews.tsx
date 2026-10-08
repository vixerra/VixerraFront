import { Star } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { PlaceholderTag } from "@/components/landing/trust-bar";
import { visibleReviews } from "@/lib/social-proof";

export function Reviews() {
  const reviews = visibleReviews();
  if (reviews.length === 0) return null;

  return (
    <section id="reviews" className="container-page py-20 sm:py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-heading font-bold text-ink">Loved by creators</h2>
        <p className="mt-4 text-body text-muted">
          What people making video and images with Vixlens say about it.
        </p>
      </Reveal>

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => (
          <li
            key={review.name}
            className="flex flex-col rounded-2xl border border-line bg-surface-2 p-6 shadow-card"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-0.5" role="img" aria-label={`Rated ${review.rating} out of 5`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={
                      i < review.rating
                        ? "size-4 fill-brand-ink text-brand-ink"
                        : "size-4 text-line"
                    }
                    aria-hidden="true"
                  />
                ))}
              </div>
             
            </div>

            <blockquote className="mt-4 flex-1 text-body-sm text-ink-soft">
              &ldquo;{review.quote}&rdquo;
            </blockquote>

            <div className="mt-6 flex items-center gap-3">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/15 font-display text-label font-semibold text-brand-ink"
                aria-hidden="true"
              >
                {review.name.charAt(0)}
              </span>
              <div>
                <p className="text-body-sm font-semibold text-ink">{review.name}</p>
                <p className="text-caption text-muted">{review.role}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
