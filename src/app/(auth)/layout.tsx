import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/logo";
import { GradientGlow } from "@/components/marketing/gradient-glow";
import { RedirectIfAuthenticated } from "@/components/auth/redirect-if-authenticated";

// Sign-in, sign-up and password-reset forms have no content worth ranking and
// would only compete with the marketing pages that link to them. `follow` is
// deliberately left on: /signup is the target of nearly every CTA on the site,
// so its links should still be crawled through.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface px-4 py-12">
      <RedirectIfAuthenticated />
      <GradientGlow className="opacity-70" />
      <Logo className="relative mb-8" />
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}
