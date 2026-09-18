"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Activity,
  CornerDownLeft,
  Images,
  LifeBuoy,
  Loader2,
  ScrollText,
  Search,
  User,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { useAdminUsers } from "@/hooks/use-admin-data";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/admin/nav";

/**
 * Ctrl/⌘ K from anywhere in the panel. Three kinds of result, in the order
 * they're usually wanted: a page to jump to, an account matching what was
 * typed, and "search <section> for this" for everything else — so a pasted
 * email, id or prompt fragment is one keystroke from the screen that can act
 * on it.
 */

type Item = {
  key: string;
  group: string;
  label: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  href: string;
};

/** cuids and uuids — worth offering "open generation" for. */
const LOOKS_LIKE_ID = /^[a-z0-9][a-z0-9-]{15,63}$/i;

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay/70 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-[12vh] left-1/2 z-[60] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-modal focus:outline-none"
        >
          <Dialog.Title className="sr-only">Search the admin panel</Dialog.Title>
          {/* Mounted only while open, so every opening starts from an empty
              query instead of last time's. */}
          {open && <PaletteBody onDone={() => onOpenChange(false)} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PaletteBody({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const q = query.trim();
  const debounced = useDebouncedValue(q, 200);
  const searchingUsers = debounced.length >= 2;

  const users = useAdminUsers(
    { q: debounced, limit: 5, offset: 0, sort: "lastLoginAt", dir: "desc" },
    { enabled: searchingUsers },
  );

  const needle = q.toLowerCase();
  const pages: Item[] = NAV_ITEMS.filter(
    (item) =>
      !needle ||
      item.label.toLowerCase().includes(needle) ||
      item.keywords?.toLowerCase().includes(needle),
  ).map((item) => ({
    key: `page:${item.href}`,
    group: "Go to",
    label: item.label,
    icon: item.icon,
    href: item.href,
  }));

  // Only once the debounce has caught up with the input, so a list of
  // accounts matching an older, shorter query never sits under a new one.
  const accounts: Item[] =
    searchingUsers && debounced === q
      ? (users.data?.users ?? []).map((u) => ({
          key: `user:${u.id}`,
          group: "Accounts",
          label: u.name || u.email,
          hint: (
            <>
              {u.email} · <span className="capitalize">{u.tier}</span>
            </>
          ),
          icon: User,
          href: `/admin/users/${u.id}`,
        }))
      : [];

  const encoded = encodeURIComponent(q);
  const searches: Item[] = q
    ? [
        ...(LOOKS_LIKE_ID.test(q)
          ? [
              {
                key: "open-generation",
                group: "Search",
                label: "Open generation",
                hint: q,
                icon: Activity,
                href: `/admin/generations?status=all&open=${encoded}`,
              },
            ]
          : []),
        {
          key: "search-generations",
          group: "Search",
          label: "Search generations",
          hint: "prompt, email, model or id",
          icon: Activity,
          href: `/admin/generations?status=all&q=${encoded}`,
        },
        {
          key: "search-support",
          group: "Search",
          label: "Search support messages",
          icon: LifeBuoy,
          href: `/admin/support?q=${encoded}`,
        },
        {
          key: "search-content",
          group: "Search",
          label: "Search public content",
          icon: Images,
          href: `/admin/content?q=${encoded}`,
        },
        {
          key: "search-presets",
          group: "Search",
          label: "Search presets",
          icon: Wand2,
          href: `/admin/presets?q=${encoded}`,
        },
        {
          key: "search-audit",
          group: "Search",
          label: "Search the audit log",
          icon: ScrollText,
          href: `/admin/audit?q=${encoded}`,
        },
      ]
    : [];

  const items = [...pages, ...accounts, ...searches];
  const activeIndex = Math.min(active, items.length - 1);

  function go(item: Item | undefined) {
    if (!item) return;
    router.push(item.href);
    onDone();
  }

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          if (items.length === 0) return;
          const step = e.key === "ArrowDown" ? 1 : -1;
          setActive((activeIndex + step + items.length) % items.length);
        } else if (e.key === "Enter") {
          e.preventDefault();
          go(items[activeIndex]);
        }
      }}
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          placeholder="Jump to a page, find an account, paste an id…"
          aria-label="Search"
          role="combobox"
          aria-expanded="true"
          aria-controls="admin-palette-results"
          aria-activedescendant={items[activeIndex] ? `palette-${items[activeIndex].key}` : undefined}
          spellCheck={false}
          autoComplete="off"
          className="h-14 w-full bg-transparent text-body-sm text-ink placeholder:text-muted focus:outline-none"
        />
        {users.isFetching && searchingUsers && (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted" aria-label="Searching" />
        )}
      </div>

      <ul id="admin-palette-results" role="listbox" className="max-h-[55vh] overflow-y-auto p-2">
        {items.length === 0 && (
          <li className="px-3 py-8 text-center text-body-sm text-muted">Nothing matches.</li>
        )}
        {items.map((item, i) => (
          <PaletteRow
            key={item.key}
            item={item}
            active={i === activeIndex}
            showGroup={i === 0 || items[i - 1].group !== item.group}
            onHover={() => setActive(i)}
            onSelect={() => go(item)}
          />
        ))}
      </ul>

      <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-caption text-muted">
        <span className="inline-flex items-center gap-1">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> to move
        </span>
        <span className="inline-flex items-center gap-1">
          <Kbd>
            <CornerDownLeft className="size-3" aria-hidden="true" />
          </Kbd>
          to open
        </span>
        <span className="inline-flex items-center gap-1">
          <Kbd>Esc</Kbd> to close
        </span>
      </div>
    </div>
  );
}

function PaletteRow({
  item,
  active,
  showGroup,
  onHover,
  onSelect,
}: {
  item: Item;
  active: boolean;
  showGroup: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  const Icon = item.icon;
  return (
    <>
      {showGroup && (
        <li
          role="presentation"
          className="px-3 pt-3 pb-1 text-caption font-medium tracking-wide text-text-tertiary uppercase first:pt-1"
        >
          {item.group}
        </li>
      )}
      <li
        id={`palette-${item.key}`}
        role="option"
        aria-selected={active}
        onMouseMove={onHover}
        onClick={onSelect}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5",
          active ? "bg-brand/10 text-ink" : "text-ink-soft",
        )}
      >
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            active ? "bg-brand/15 text-brand" : "bg-white/5 text-muted",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body-sm">{item.label}</span>
          {item.hint && <span className="block truncate text-caption text-muted">{item.hint}</span>}
        </span>
        {active && <CornerDownLeft className="size-3.5 shrink-0 text-muted" aria-hidden="true" />}
      </li>
    </>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-5 items-center justify-center rounded border border-line px-1 font-mono text-[11px] leading-5">
      {children}
    </kbd>
  );
}
