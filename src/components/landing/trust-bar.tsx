import { Users } from "lucide-react";
import { IMAGE_MODELS, VIDEO_MODELS } from "@/lib/constants";
import { visibleActiveUsers } from "@/lib/social-proof";

// Provider names come from the model registry, so the bar only ever lists
// companies whose models are actually running on Vixlens — it states what
// the product is built on, not who its customers are.
const PROVIDERS = [...new Set([...VIDEO_MODELS, ...IMAGE_MODELS].map((m) => m.provider))];

export function TrustBar() {
  const users = visibleActiveUsers();

  return (
    <section className="border-y border-line bg-surface-2/40 py-10">
      <div className="container-page flex flex-col items-center gap-6">
        {users && (
          <p className="flex items-center gap-2 text-body text-ink">
            <Users className="size-5 text-brand-ink" aria-hidden="true" />
            <span>
              <span className="font-display font-bold text-brand-ink">
                {users.count.toLocaleString("en-US")}+
              </span>{" "}
              active creators use Vixlens
            </span>
            
          </p>
        )}

        <p className="text-caption tracking-widest text-muted uppercase">
          Built on models from
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {PROVIDERS.map((provider) => (
            <li
              key={provider}
              className="font-display text-body-lg font-semibold tracking-tight whitespace-nowrap text-ink-soft opacity-70 transition-opacity hover:opacity-100"
            >
              {provider}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function PlaceholderTag() {
  return (
    <span className="rounded-full border border-accent-amber-ink/40 bg-accent-amber/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-accent-amber-ink uppercase">
      Placeholder · dev only
    </span>
  );
}
