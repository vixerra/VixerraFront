import type { Metadata } from "next";
import { Suspense } from "react";
import { OAuthConsentClient } from "@/components/oauth/oauth-consent-client";

// The OAuth consent screen MCP clients (claude.ai connectors) send people to —
// the authorization_endpoint routes/oauth.ts advertises in the API. Every
// visit carries a one-off request in its query string: never indexable.
export const metadata: Metadata = {
  title: "Connect an app",
  robots: { index: false, follow: false },
};

export default function OAuthAuthorizePage() {
  // useSearchParams needs a Suspense boundary to prerender the shell.
  return (
    <Suspense>
      <OAuthConsentClient />
    </Suspense>
  );
}
