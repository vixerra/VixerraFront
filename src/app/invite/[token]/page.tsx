import type { Metadata } from "next";
import { InviteAcceptClient } from "@/components/invite/invite-accept-client";

// One-time workspace invitation behind a token — never indexable.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Plain Promise<{ token }> typing rather than this repo's usual
// PageProps<"/route/[param]"> helper — that type comes from Next's
// route-manifest codegen (.next/types), which only includes routes that
// already existed the last time `next dev`/`next build` ran, so a
// brand-new route like this one wouldn't resolve there until after a
// build. This is the plain, portable Next.js 15 async-params typing.
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InviteAcceptClient token={token} />;
}
