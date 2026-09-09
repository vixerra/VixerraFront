import { Suspense } from "react";
import type { Metadata } from "next";
import { BillingClient } from "@/components/settings/billing-client";
import { Spinner } from "@/components/ui/spinner";

export const metadata: Metadata = { title: "Billing" };

export default function BillingSettingsPage() {
  return (
    // useSearchParams (Stripe Checkout reports its outcome as
    // ?checkout=success|cancelled on the way back) opts the subtree into
    // client rendering, which Next requires a Suspense boundary for — same
    // as the social OAuth callback page.
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      }
    >
      <BillingClient />
    </Suspense>
  );
}
