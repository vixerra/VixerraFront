import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

// Nothing under AppShell is indexable: it bounces a signed-out visitor to
// /login, so all a crawler could ever record here is a redirect stub under a
// real URL. The public, indexable counterparts are the /generate/[model]
// landing pages — which is also why this is a noindex directive rather than a
// robots.txt Disallow: those pages link into ?model= workspace URLs, and
// `follow` keeps that link equity flowing instead of dead-ending it.
//
// Child pages only set a title, so this directive is inherited by all of them.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
