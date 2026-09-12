"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { apiFetch } from "@/lib/api-client";
import { useMe } from "@/hooks/use-me";
import { Spinner } from "@/components/ui/spinner";
import {
  LayoutDashboard,
  Sparkles,
  Images,
  FolderKanban,
  Megaphone,
  Scissors,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  Wand2,
  Zap,
  ChevronLeft,
  Lock,
} from "lucide-react";
import { cn, formatCredits } from "@/lib/utils";
import { hasCreatorSuite } from "@/lib/tier-limits";
import { Logo } from "./logo";
import { PageGuide } from "@/components/help/page-guide";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useSidebarCollapsed, setSidebarCollapsed } from "@/components/providers/sidebar-provider";
import { useWorkspace } from "@/components/providers/workspace-provider";
import {
  DropdownRoot,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/dropdown";

type UsageResponse = { credit_balance: number };

function CreditsBadge() {
  const { data: me } = useMe();
  // Keyed by workspace: personal shows your own credits, team shows the
  // owner's pool, and switching has to change the number.
  const workspace = useWorkspace(Boolean(me?.organization));
  const { data } = useQuery({
    queryKey: ["usage", workspace],
    queryFn: async (): Promise<UsageResponse> => {
      const res = await apiFetch(`/api/user/usage?workspace=${workspace}`);
      if (!res.ok) throw new Error("Failed to load usage");
      return res.json();
    },
  });

  if (!data) return null;

  return (
    <Link
      href="/settings/billing"
      className="flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-label text-ink-soft transition-colors hover:border-border-strong"
      title="Credits remaining"
    >
      {/* Credits are amber everywhere they appear — see --color-accent-amber.
          Keeping value off the lime action color means "what you have"
          never reads as "what to press". */}
      <Zap className="size-3.5 text-accent-amber" aria-hidden="true" />
      <span className="font-semibold text-accent-amber">{formatCredits(data.credit_balance)}</span>
      <span className="hidden text-muted sm:inline">credits</span>
    </Link>
  );
}

// Grouped into labeled sections (rather than one flat list) so the sidebar
// reads more like a real workspace nav — echoes ArtCraft's Create/Studio/
// Assets grouping, sized down to what this app actually has. The active
// item always uses the one brand color (see NavItem below) — no per-section
// wayfinding colors anymore.
type NavEntry = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Needs TIER_INFO.creatorSuite — shown to every plan with a lock, since
   *  a tool nobody can see is a tool nobody upgrades for. The route itself
   *  is what enforces it (see CreatorSuiteGate). */
  creatorSuite?: true;
};

const NAV_SECTIONS: { label: string; items: NavEntry[] }[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/generate", label: "Generate", icon: Sparkles },
      { href: "/presets", label: "Presets", icon: Wand2 },
      { href: "/studio", label: "Marketing", icon: Megaphone, creatorSuite: true },
      // Sits in Workspace rather than Library because editing is something
      // you DO, like generating — Library is where finished things are kept.
      { href: "/editor", label: "Editing", icon: Scissors, creatorSuite: true },
    ],
  },
  {
    label: "Library",
    items: [
      { href: "/my-gallery", label: "Gallery", icon: Images },
      { href: "/collections", label: "Collections", icon: FolderKanban },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("Failed to log out");
    },
    onSuccess: () => {
      // Drop all cached data (user, usage, dashboard, etc.) so nothing from
      // this session leaks into the next — otherwise stale react-query cache
      // (e.g. useMe()) could still look "authenticated" for a bit after the
      // session cookie is cleared, or leak into a different user's session.
      queryClient.clear();
      router.push("/");
      router.refresh();
    },
  });
}

function NavItem({
  item,
  active,
  locked,
  onNavigate,
  collapsed,
}: {
  item: NavEntry;
  active: boolean;
  /** On a plan without this tool. Still navigable — the route answers with
   *  the upgrade screen, which is a better landing than a dead link. */
  locked: boolean;
  onNavigate?: () => void;
  collapsed: boolean;
}) {
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "font-display relative flex items-center gap-3 rounded-xl py-2 text-label font-medium transition-colors",
        // Collapsed: pin every item (active or not) to the exact same
        // fixed width as the icon chip below (size-8) and center that in
        // the rail, instead of a block-level Link stretching to the full
        // rail width. w-fit seemed like the fix here, but the active
        // item's extra px-2 padding made ITS box wider than an inactive
        // item's — inactive items align because their invisible-at-rest
        // Link box just happens to match the icon chip's width, so the
        // active item alone drifted out of that column. Same fixed width
        // for both keeps the whole rail in one column regardless of state.
        collapsed ? "mx-auto w-8 justify-center px-0" : "pr-3 pl-2",
        active
          ? // The accent bar's color MUST stay under the before: variant —
            // a bare `bg-brand` here (no `before:` prefix) would paint the
            // whole link solid instead of just the 4px bar, which is
            // exactly the bug that made the active icon disappear.
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
        <item.icon className={cn("size-4", active ? "text-brand" : "text-muted")} aria-hidden="true" />
      </span>
      {!collapsed && item.label}
      {!collapsed && locked && (
        <Lock className="ml-auto size-3.5 shrink-0 text-text-tertiary" aria-hidden="true" />
      )}
    </Link>
  );

  // Icon-only rail needs the label back somewhere — a tooltip on hover.
  // Skipped when expanded since the label is already right there as text.
  return collapsed ? (
    <Tooltip content={locked ? `${item.label} — Creator plan` : item.label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

function NavLinks({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const pathname = usePathname();
  // Same ["me"] query AppShell already has in cache, so this costs nothing.
  const { data: me } = useMe();
  // effectiveTier, not tier: a member of a Studio team has the owner's
  // capabilities because the owner's plan pays for their work.
  const creatorSuite = hasCreatorSuite(me?.effectiveTier);
  // min-h-0 is what keeps the log-out footer inside the sidebar card: a flex
  // child defaults to min-height:auto, so on a short viewport the nav refused
  // to shrink below its content and pushed the footer out past the aside's
  // fixed height. With min-h-0 the nav scrolls instead.
  return (
    <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          {!collapsed && (
            <p className="px-2 pb-2 text-caption font-medium tracking-wide text-text-tertiary uppercase">
              {section.label}
            </p>
          )}
          <div className="space-y-1">
            {section.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <NavItem
                  key={item.href}
                  item={item}
                  active={active}
                  locked={item.creatorSuite === true && !creatorSuite}
                  onNavigate={onNavigate}
                  collapsed={collapsed}
                />
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const logout = useLogout();
  const { data: user, isLoading, isError } = useMe();
  const initial = user?.name.slice(0, 1).toUpperCase() ?? "";

  // Route protection lives here (client-side) rather than in proxy.ts,
  // because only the browser can see the cross-site session cookie set by
  // the Edge Function — see the comment in src/proxy.ts.
  useEffect(() => {
    if (isError) {
      const next = window.location.pathname;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [isError, router]);

  // Same reasoning as the marketing Header: a hairline border sitting under
  // the bar on every single app page (including ones shorter than the
  // viewport, with nothing to scroll) reads as static boilerplate. Only draw
  // it once there's actually scrolled content underneath to separate from.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Desktop-only icon rail toggle — mobile already collapses the whole nav
  // behind the hamburger drawer, so a second "shrink to icons" mode there
  // wouldn't do anything useful. State lives in sidebar-provider (not local
  // state) so other pages — e.g. generate-workspace.tsx's fixed composer
  // bar, which has to manually clear the sidebar's width since fixed
  // positioning ignores the normal flex layout — can read the live value
  // too, without prop-drilling through every layout in between.
  const collapsed = useSidebarCollapsed();
  const toggleCollapsed = () => setSidebarCollapsed(!collapsed);

  if (isLoading || isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-app">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface-app lg:gap-3">
      <aside
        className={cn(
          "relative hidden shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface-sidebar shadow-floating transition-[width] duration-300 lg:sticky lg:top-3 lg:my-3 lg:ml-3 lg:flex lg:h-[calc(100vh-1.5rem)]",
          collapsed ? "lg:w-16" : "lg:w-60",
        )}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute top-1/2 -right-3 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface-3 text-muted shadow-card transition-colors hover:border-border-strong hover:text-ink-soft"
        >
          <ChevronLeft className={cn("size-3.5 transition-transform duration-300", collapsed && "rotate-180")} aria-hidden="true" />
        </button>

        {/* No border under the lockup: the sidebar is a floating card, and a
            full-width rule right below the logo made the top read as a title
            bar. px-5 puts the mark in the same column as the nav icon chips
            (nav px-3 + item pl-2). */}
        <div className={cn("flex h-16 shrink-0 items-center", collapsed ? "justify-center px-2" : "px-5")}>
          <Logo iconOnly={collapsed} compact href="/dashboard" />
        </div>
        {/* Renders nothing unless this account is in a team. */}
        <div className={cn("shrink-0", collapsed ? "flex justify-center px-2" : "px-3")}>
          <WorkspaceSwitcher collapsed={collapsed} />
        </div>
        <NavLinks collapsed={collapsed} />
        <div className="shrink-0 border-t border-line px-3 py-3">
          {collapsed ? (
            <Tooltip content="Log out" side="right">
              <button
                type="button"
                onClick={() => logout.mutate()}
                aria-label="Log out"
                className="mx-auto flex w-8 items-center justify-center rounded-xl py-2 text-label text-muted transition-colors hover:bg-white/5 hover:text-ink-soft"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                  <LogOut className="size-4 text-muted" aria-hidden="true" />
                </span>
              </button>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={() => logout.mutate()}
              className="font-display flex w-full items-center gap-3 rounded-xl py-2 pr-3 pl-2 text-label font-medium text-muted transition-colors hover:bg-white/5 hover:text-ink-soft"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                <LogOut className="size-4 text-muted" aria-hidden="true" />
              </span>
              Log out
            </button>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b px-4 transition-colors duration-300 lg:px-8",
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
            <Logo href="/dashboard" />
          </div>
          <div className="hidden lg:block" />

          <div className="flex items-center gap-3">
            <PageGuide />
            <CreditsBadge />

            <DropdownRoot>
              <DropdownTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2.5 rounded-full border border-line bg-surface-2 py-1.5 pr-3 pl-1.5 transition-colors hover:border-border-strong hover:bg-surface-3"
                >
                  <span className="flex size-7 items-center justify-center rounded-full bg-brand text-caption font-semibold text-on-brand">
                    {initial}
                  </span>
                  <span className="hidden text-label text-ink-soft sm:inline">{user?.name}</span>
                </button>
              </DropdownTrigger>
              <DropdownContent>
                <div className="px-4 py-2">
                  <p className="text-label text-ink-soft">{user?.name}</p>
                  <p className="truncate text-caption text-muted">{user?.email}</p>
                </div>
                <DropdownSeparator />
                <DropdownItem asChild>
                  <Link href="/settings">
                    <User className="mr-2 inline size-4" /> Profile
                  </Link>
                </DropdownItem>
                <DropdownItem asChild>
                  <Link href="/settings/billing">
                    <Zap className="mr-2 inline size-4" /> Billing
                  </Link>
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem
                  onSelect={() => logout.mutate()}
                  className="text-accent data-[highlighted]:text-accent"
                >
                  <LogOut className="mr-2 inline size-4" /> Log out
                </DropdownItem>
              </DropdownContent>
            </DropdownRoot>
          </div>
        </header>

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
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <div className="flex h-16 shrink-0 items-center justify-between px-4">
              <Logo compact href="/dashboard" />
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Close menu">
                  <X className="size-5" />
                </Button>
              </Dialog.Close>
            </div>
            <div className="shrink-0 px-3">
              <WorkspaceSwitcher collapsed={false} />
            </div>
            <NavLinks onNavigate={() => setDrawerOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
