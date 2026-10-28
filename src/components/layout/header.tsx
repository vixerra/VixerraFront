"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMe } from "@/hooks/use-me";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { appHref, PRIMARY_CTA } from "@/lib/hosts";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";

const NAV_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/models", label: "Models" },
  { href: "/pricing", label: "Pricing" },
  { href: "/prompts", label: "Presets" },
  { href: "/gallery", label: "Gallery" },
  { href: "/mcp", label: "MCP" },
];

// Solid ink bar: logo left, small uppercase nav centered, the CTAs on the
// right (quiet sign-in, yellow-fill "Get started" to the plans).
export function Header() {
  const { data: user } = useMe();
  const isAuthed = Boolean(user);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur-lg">
      <div className="container-page grid h-16 grid-cols-[1fr_auto] items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-[12px] font-bold tracking-[0.06em] uppercase transition-colors",
                  active ? "text-brand" : "text-muted hover:text-ink",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center justify-end gap-2 lg:flex">
          {isAuthed ? (
            <Link href={appHref("/dashboard")} prefetch={false} className={buttonVariants({ size: "sm" })}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href={appHref("/login")}
                prefetch={false}
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                Log in
              </Link>
              {/* No free plan since 2026-10-15: PRIMARY_CTA is the plan grid. */}
              <Link href={PRIMARY_CTA.href} className={buttonVariants({ size: "sm" })}>
                {PRIMARY_CTA.label}
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 lg:hidden">
          {!isAuthed && (
            <Link
              href={PRIMARY_CTA.href}
              className={buttonVariants({ size: "sm", className: "hidden min-[400px]:inline-flex" })}
            >
              {PRIMARY_CTA.label}
            </Link>
          )}
          <MobileNav isAuthed={isAuthed} />
        </div>
      </div>
    </header>
  );
}
