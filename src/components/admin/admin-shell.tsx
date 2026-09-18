"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { LogOut, ShieldCheck, Menu, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAdminMe, useAdminLogout } from "@/hooks/use-admin";
import { useAdminBadges } from "@/hooks/use-admin-data";
import { NAV_SECTIONS } from "@/components/admin/nav";
import { CommandPalette } from "@/components/admin/command-palette";

/**
 * Chrome for every page under /admin except the login screen.
 *
 * Structurally this mirrors the customer AppShell — the same floating rounded
 * sidebar, the same grouped nav sections with a brand accent bar on the
 * active item, the same sticky header that only draws its border once the
 * page has scrolled. An operator moving between the two products shouldn't
 * have to re-learn the furniture, and the app already has a considered
 * layout language worth reusing.
 *
 * What it deliberately does NOT copy is the identity chrome: no credits pill,
 * no "Generate" CTA, no personal avatar. Those belong to someone acting on
 * their own account, and this is a console for acting on other people's. The
 * red staff marker in the header exists to keep that impossible to forget.
 */

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  // Live counts for the two queues that need a human: failed jobs and
  // unread messages. A backend without the endpoint just shows none.
  const { data: badges } = useAdminBadges();
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto p-4">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <p className="px-4 pb-2 text-caption font-medium tracking-wide text-text-tertiary uppercase">
            {section.label}
          </p>
          <div className="space-y-1">
            {section.items.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "font-display relative flex items-center gap-3 rounded-xl py-2 pr-4 pl-3 text-label font-medium transition-colors",
                    active
                      ? // The accent bar's colour must stay under before: — a
                        // bare bg-brand here paints the whole link solid.
                        "bg-brand/10 text-ink before:absolute before:top-1/2 before:left-0 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-brand"
                      : "text-muted hover:bg-white/5 hover:text-ink-soft",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                      active ? "bg-brand/15" : "bg-white/5",
                    )}
                  >
                    <item.icon
                      className={cn("size-4", active ? "text-brand" : "text-muted")}
                      aria-hidden="true"
                    />
                  </span>
                  {item.label}
                  {item.badge && badges && badges[item.badge] > 0 && (
                    <span
                      className={cn(
                        "ml-auto rounded-full px-1.5 py-px text-[11px] leading-4 font-semibold tabular-nums",
                        item.badge === "failed24h"
                          ? "bg-accent/15 text-accent"
                          : "bg-brand/15 text-brand",
                      )}
                      title={
                        item.badge === "failed24h" ? "Failed in the last 24 hours" : "Unread messages"
                      }
                    >
                      {badges[item.badge] > 99 ? "99+" : badges[item.badge]}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { data: admin, isLoading, isError } = useAdminMe();
  const logout = useAdminLogout();

  // Ctrl/⌘ K toggles the command palette from anywhere, including from
  // inside a text field — the one shortcut worth taking over from them.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Client-side gate, matching how AppShell protects the app: the session
  // lives in a cookie only the browser can present to the Edge Function, so
  // middleware can't see it. The real guard is requireAdmin() on every
  // /api/admin route — this redirect only avoids showing a page of failed
  // requests to someone who isn't signed in.
  useEffect(() => {
    if (isError) router.replace("/admin/login");
  }, [isError, router]);

  // Same reasoning as the customer shell: a hairline under the bar on a page
  // with nothing scrolled beneath it reads as static boilerplate.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (isLoading || isError || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-app">
        <Spinner size={28} />
      </div>
    );
  }

  const brandMark = (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/15">
        <ShieldCheck className="size-4 text-brand" aria-hidden="true" />
      </span>
      <span className="font-display text-label font-bold tracking-wide text-ink uppercase">
        Admin
      </span>
    </div>
  );

  const footer = (
    <div className="shrink-0 space-y-3 border-t border-line p-4">
      <div className="px-1">
        <p className="truncate text-label text-ink-soft">{admin.name}</p>
        <p className="truncate text-caption text-muted">{admin.email}</p>
        {/* Shown from day one even though nothing enforces it yet, so an
            operator always knows which hat they are wearing — and so the gap
            stays visible rather than forgotten once roles get meanings. */}
        <span className="mt-1.5 inline-flex rounded-full border border-brand/20 bg-brand/10 px-2 py-0.5 text-caption text-brand capitalize">
          {admin.role}
        </span>
      </div>
      <button
        type="button"
        onClick={() => logout.mutate()}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-label text-muted transition-colors hover:bg-white/5 hover:text-ink-soft"
      >
        <LogOut className="size-4.5" aria-hidden="true" />
        Sign out
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-surface-app lg:gap-3">
      <aside className="relative hidden w-60 shrink-0 flex-col rounded-2xl border border-line bg-surface-sidebar shadow-floating lg:sticky lg:top-3 lg:my-3 lg:ml-3 lg:flex lg:h-[calc(100vh-1.5rem)]">
        <div className="flex h-16 shrink-0 items-center border-b border-line px-4">{brandMark}</div>
        <NavLinks />
        {footer}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4 transition-colors duration-300 lg:px-8",
            scrolled
              ? "border-line bg-surface-app/80 backdrop-blur-md"
              : "border-transparent bg-surface-app",
          )}
        >
          <div className="flex items-center gap-3 lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </Button>
            {brandMark}
          </div>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label="Search the admin panel"
            aria-keyshortcuts="Control+K Meta+K"
            className="flex h-9 items-center gap-2 rounded-xl border border-line bg-surface-dark px-3 text-body-sm text-muted transition-colors hover:border-border-strong hover:text-ink-soft lg:w-80"
          >
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <span className="hidden flex-1 text-left sm:inline">Search users, jobs, pages…</span>
            <kbd className="hidden rounded border border-line px-1.5 font-mono text-[11px] leading-5 sm:inline">
              Ctrl K
            </kbd>
          </button>

          {/* Standing reminder that everything here acts on real customer
              accounts. In the header rather than as a full-width bar so it
              travels with the chrome instead of pushing every page down. */}
          <span className="ml-auto hidden items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-caption text-accent md:inline-flex">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Staff console — actions affect real accounts
          </span>
        </header>

        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>

      <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay/80 backdrop-blur-sm lg:hidden" />
          <Dialog.Content
            className={cn(
              "animate-sheet-left fixed inset-y-3 left-3 z-[60] flex w-64 max-w-[calc(100%-1.5rem)]",
              "flex-col overflow-hidden rounded-2xl border border-line bg-surface-sidebar shadow-modal",
              "focus:outline-none lg:hidden",
            )}
          >
            <Dialog.Title className="sr-only">Admin navigation</Dialog.Title>
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
              {brandMark}
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Close menu">
                  <X className="size-5" />
                </Button>
              </Dialog.Close>
            </div>
            <NavLinks onNavigate={() => setDrawerOpen(false)} />
            {footer}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
