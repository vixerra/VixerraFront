import { Suspense } from "react";
import type { Metadata } from "next";
import { SocialAccounts } from "@/components/settings/social-accounts";
import { Spinner } from "@/components/ui/spinner";

export const metadata: Metadata = { title: "Social accounts" };

export default function SocialSettingsPage() {
  return (
    <div className="max-w-2xl">
      {/* useSearchParams (the OAuth callback reports its outcome there) opts
          the subtree into client rendering, which Next requires a Suspense
          boundary for. */}
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        }
      >
        <SocialAccounts />
      </Suspense>
    </div>
  );
}
