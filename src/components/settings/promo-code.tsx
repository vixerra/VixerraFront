"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { TicketPercent, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RECHARGE_PACKS, TIER_INFO, type Tier } from "@/lib/constants";
import { cn, formatCredits } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";

/** A code the server accepted (POST /api/subscription/promo/check). */
export type AppliedPromo = {
  code: string;
  bonusCredits: number;
  /** Pack ids and/or paid tiers. Empty means every pack and every paid plan. */
  appliesTo: string[];
};

/** The bonus `promo` adds to a pack (by id) or a plan (by tier) — 0 when it
 *  doesn't cover it. Free is never covered: it isn't bought. */
export function promoBonusFor(promo: AppliedPromo | null, product: string) {
  if (!promo || product === "free") return 0;
  return promo.appliesTo.length === 0 || promo.appliesTo.includes(product) ? promo.bonusCredits : 0;
}

function productLabel(id: string) {
  const pack = RECHARGE_PACKS.find((p) => p.id === id);
  if (pack) return `the ${formatCredits(pack.credits)} pack`;
  return TIER_INFO[id as Tier]?.label ?? id;
}

/** "Creator, Studio and the 2,000 pack" */
function listLabel(ids: string[]) {
  const labels = ids.map(productLabel);
  return labels.length > 1 ? `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}` : labels[0];
}

/**
 * Asks the API what a code gives. `preview` is the pricing page's version,
 * for visitors who may not be signed in: it skips the once-per-account rule,
 * which billing and the purchase itself check again. Throws the API's own
 * message, which is written for the customer.
 */
async function lookUpPromo(code: string, preview: boolean): Promise<AppliedPromo> {
  const res = preview
    ? await apiFetch(`/api/subscription/promo/preview?code=${encodeURIComponent(code)}`)
    : await apiFetch("/api/subscription/promo/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Couldn't check that code");
  return { code: json.code, bonusCredits: json.bonus_credits, appliesTo: json.applies_to ?? [] };
}

/**
 * The "Have a promo code?" field, on the billing page and the pricing page.
 * Checking a code grants nothing — it only shows the bonus on the plans and
 * packs it applies to. The server checks it again when the purchase starts,
 * and grants the bonus once that payment goes through (once per account; on
 * a plan, with the first payment only).
 */
export function PromoCodeField({
  applied,
  onApply,
  disabled,
  preview = false,
  autoApply = null,
  onAutoApplyDone,
  className,
}: {
  applied: AppliedPromo | null;
  onApply: (promo: AppliedPromo | null) => void;
  disabled?: boolean;
  /** Use the signed-out preview check (pricing page). */
  preview?: boolean;
  /** A code from the URL (?promo=), checked once on arrival. */
  autoApply?: string | null;
  /** Reports how that arrival check went, so a page can wait for it. */
  onAutoApplyDone?: (ok: boolean) => void;
  className?: string;
}) {
  const [code, setCode] = useState(autoApply ?? "");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoApplied = useRef(false);

  const apply = useCallback(
    async (value: string) => {
      setChecking(true);
      setError(null);
      try {
        onApply(await lookUpPromo(value, preview));
        setCode("");
        return true;
      } catch (err) {
        setError((err as Error).message);
        return false;
      } finally {
        setChecking(false);
      }
    },
    [onApply, preview],
  );

  useEffect(() => {
    if (!autoApply || autoApplied.current) return;
    autoApplied.current = true;
    void apply(autoApply).then((ok) => onAutoApplyDone?.(ok));
  }, [autoApply, apply, onAutoApplyDone]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (code.trim()) await apply(code);
  }

  if (applied) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-2.5 text-caption text-success",
          className,
        )}
      >
        <span className="flex items-center gap-2">
          <TicketPercent className="size-4 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-mono font-semibold">{applied.code}</span> applied — +
            {formatCredits(applied.bonusCredits)} bonus credits on{" "}
            {applied.appliesTo.length ? listLabel(applied.appliesTo) : "any plan or credit pack"}.
          </span>
        </span>
        <button
          type="button"
          onClick={() => onApply(null)}
          aria-label="Remove promo code"
          className="flex size-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-ink/10"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={className}>
      <label htmlFor="promo-code" className="text-label font-semibold text-ink">
        Have a promo code?
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="promo-code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          disabled={disabled || checking}
          maxLength={32}
          placeholder="Promo code"
          aria-invalid={Boolean(error)}
          className="h-10 w-full max-w-56 rounded-xl border border-line bg-surface-dark px-3.5 font-mono text-body-sm text-ink-soft placeholder:font-sans placeholder:text-muted focus:border-border-strong focus:outline-none"
        />
        <Button type="submit" variant="secondary" loading={checking} disabled={disabled || !code.trim()}>
          Apply
        </Button>
      </div>
      {error && <p className="mt-1.5 text-caption text-accent">{error}</p>}
    </form>
  );
}

/** A "+N bonus" pill for a plan card or pack tile the code covers. */
export function PromoBonusBadge({ credits }: { credits: number }) {
  if (credits <= 0) return null;
  return (
    <p className="mt-1.5 inline-flex w-fit rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-caption font-medium text-success">
      +{formatCredits(credits)} bonus
    </p>
  );
}
