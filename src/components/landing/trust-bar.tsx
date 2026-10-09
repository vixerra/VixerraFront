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
    <section className="border-y border-line py-12 sm:py-14">
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

        <p className="eyebrow">
          Built on models from
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {PROVIDERS.map((provider) => (
            <li
              key={provider}
              className="flex h-14 min-w-[7.5rem] items-center justify-center rounded-2xl border border-line bg-ink/[0.04] px-5 text-body font-medium tracking-tight whitespace-nowrap text-muted transition-colors hover:border-border-strong hover:bg-ink/[0.08] hover:text-ink sm:h-16"
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
