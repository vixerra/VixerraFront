"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { formatMoney } from "@/lib/currency";
import { formatCredits } from "@/lib/utils";
import { RECHARGE_PACKS, type RechargePackId } from "@/lib/constants";
import { apiFetch } from "@/lib/api-client";
import { useInvalidateCredits } from "@/hooks/use-credits";

/**
 * Pay-per-use top-up. Credits from these packs never expire, unlike a plan's
 * monthly grant.
 *
 * Two paths, decided by the server: with Stripe configured the button hands
 * off to a Checkout page and the credits arrive from the webhook; without it
 * (local dev, a fresh clone) the old simulated grant still applies
 * immediately and for free.
 */
export function RechargePacks({
  paymentsEnabled,
  unavailable = false,
}: {
  paymentsEnabled: boolean;
  /** Stripe is on but the pack Price ids were never configured. */
  unavailable?: boolean;
}) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const invalidateCredits = useInvalidateCredits();
  const [loadingPack, setLoadingPack] = useState<RechargePackId | null>(null);

  async function buy(packId: RechargePackId, credits: number) {
    const pack = RECHARGE_PACKS.find((p) => p.id === packId);
    const price = pack ? formatMoney(pack.priceUsd) : null;
    const ok = await confirm({
      title: `Buy ${formatCredits(credits)} credits?`,
      description: paymentsEnabled
        ? // The click leads to Stripe, not to a charge — worth saying
          // before the redirect rather than after it.
          `You'll be taken to Stripe to pay${price ? ` ${price}` : ""}. The credits are added as soon as the payment goes through, and they never expire.`
        : price
          ? `You'll be charged ${price}. The credits are added immediately and never expire.`
          : "The credits are added immediately and never expire.",
      confirmLabel: paymentsEnabled ? "Continue" : "Buy credits",
    });
    if (!ok) return;

    setLoadingPack(packId);
    try {
      const endpoint = paymentsEnabled
        ? "/api/subscription/recharge/checkout"
        : "/api/subscription/recharge";
      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to buy credits");

      if (paymentsEnabled) {
        if (!json.url) throw new Error("Stripe didn't return a checkout page.");
        // Leaves the app — the balance updates when the webhook lands, not
        // here, so there is nothing to invalidate on this side.
        window.location.assign(json.url);
        return;
      }

      toast({ title: `Added ${formatCredits(credits)} credits`, variant: "success" });
      invalidateCredits();
    } catch (err) {
      toast({
        title: "Couldn't buy credits",
        description: (err as Error).message,
        variant: "error",
      });
    } finally {
      setLoadingPack(null);
    }
  }

  return (
    <div>
      <h3 className="text-label font-semibold text-ink">Buy more credits</h3>
      <p className="mt-1 text-caption text-muted">
        Top up any time — these credits never expire and stack on top of your plan.
      </p>
      {unavailable && (
        <p className="mt-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-caption text-warning">
          Credit packs can&apos;t be purchased right now — billing isn&apos;t fully set up on this
          server.
        </p>
      )}
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        {RECHARGE_PACKS.map((pack) => (
          <Card
            key={pack.id}
            variant="compact"
            className="flex flex-col items-center text-center transition-[border-color,transform] hover:-translate-y-1 hover:border-border-strong"
          >
            {/* Amber, not the lime action color — this pack tile is about
                value; the lime lives on its buy Button below. */}
            <span className="flex size-10 items-center justify-center rounded-full bg-accent-amber">
              <Zap className="size-4.5 text-on-brand" aria-hidden="true" />
            </span>
            <p className="mt-3 text-subheading font-bold text-accent-amber">{formatCredits(pack.credits)}</p>
            <p className="text-caption text-muted">credits</p>
            <Button
              variant="accent"
              loading={loadingPack === pack.id}
              disabled={unavailable}
              onClick={() => buy(pack.id, pack.credits)}
              className="mt-4 w-full"
            >
              {formatMoney(pack.priceUsd)}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
