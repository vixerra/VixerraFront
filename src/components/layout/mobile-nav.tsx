"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { appHref } from "@/lib/hosts";

const NAV_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/models", label: "Models" },
  { href: "/pricing", label: "Pricing" },
  { href: "/prompts", label: "Presets" },
  { href: "/gallery", label: "Gallery" },
];

export function MobileNav({ isAuthed }: { isAuthed: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  // Header applies backdrop-blur-lg to itself (see header.tsx) — a
  // backdrop-filter on an ancestor makes the browser treat
  // position:fixed descendants as fixed to *that element's* box instead of
  // the viewport, so this panel would collapse down to the header's own
  // ~64px height instead of covering the screen. Portaling straight to
  // <body> sidesteps that (and any future filter/transform ancestor)
  // entirely, since the panel is no longer a DOM descendant of the header.
  // No "mounted" guard needed for the document.body reference below: `open`
  // only ever flips true from the button's onClick, which can't fire until
  // we're already running in the browser post-hydration — so `panel` (and
  // the `document.body` access it gates) never evaluates during SSR.
  const panel = open && (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-surface p-6">
      <div className="flex items-center justify-between">
        <span className="text-subheading font-semibold text-ink">Menu</span>
        <Button variant="ghost" size="icon" onClick={close} aria-label="Close menu">
          <X className="size-5" />
        </Button>
      </div>
      <nav className="mt-10 flex flex-col divide-y divide-line border-y border-line">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={close}
              className={cn(
                "flex items-center justify-between py-4 text-body transition-colors",
                active ? "text-ink" : "text-ink-soft hover:text-ink",
              )}
            >
              {link.label}
              {active && <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-3 pt-6">
        {isAuthed ? (
          <Link href={appHref("/dashboard")} prefetch={false} onClick={close} className={buttonVariants({ className: "w-full" })}>
            Dashboard
          </Link>
        ) : (
          <>
            <Link
              href={appHref("/login")} prefetch={false}
              onClick={close}
              className={buttonVariants({ variant: "secondary", className: "w-full" })}
            >
              Log in
            </Link>
            <Link href={appHref("/signup")} prefetch={false} onClick={close} className={buttonVariants({ className: "w-full" })}>
              Start for Free
            </Link>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="lg:hidden">
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu className="size-5" />
      </Button>

      {panel && createPortal(panel, document.body)}
    </div>
  );
}
