"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMe } from "@/hooks/use-me";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";

const NAV_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/models", label: "Models" },
  { href: "/pricing", label: "Pricing" },
  { href: "/prompts", label: "Presets" },
  { href: "/gallery", label: "Gallery" },
];

// Always-solid, compact bar — matches --color-surface everywhere on the
// site (there's no light-mode page for a transparent-over-hero header to
// earn its keep against), so a static hairline border reads cleaner than
// the old scroll-triggered transparent-to-blurred crossfade.
export function Header() {
  const { data: user } = useMe();
  const isAuthed = Boolean(user);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur-lg">
      <div className="container-page flex h-14 items-center justify-between">
        <Logo />

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "font-display relative py-2 text-body-sm font-medium transition-colors",
                  active ? "text-ink" : "text-muted hover:text-ink",
                )}
              >
                {link.label}
                {active && (
                  <span className="absolute inset-x-0 -bottom-px h-px bg-brand" aria-hidden="true" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          {isAuthed ? (
            <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-body-sm font-medium text-muted transition-colors hover:text-ink"
              >
                Log in
              </Link>
              <Link href="/signup" className={buttonVariants({ size: "sm" })}>
                Start for Free
              </Link>
            </>
          )}
        </div>

        <MobileNav isAuthed={isAuthed} />
      </div>
    </header>
  );
}
