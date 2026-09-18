"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Download, Loader2, RefreshCw, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The filter bar every admin list shares: a search box, chip groups for the
 * one or two filters worth a single click, compact selects for the rest, and
 * a line underneath that says how many rows matched and offers the way back
 * to "everything".
 *
 * All of these are controlled by the page's URL state (see useUrlFilters) —
 * none of them own the value, except the search box's in-flight draft.
 */

export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mb-3 flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

/** True for keystrokes that belong to a field the user is typing in. */
function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

/**
 * Debounced search. The draft is local so typing stays instant; the page
 * only hears about it 300ms after the last keystroke, which is what keeps
 * an ILIKE scan from running once per letter.
 *
 * `/` focuses it from anywhere on the page and Escape clears it — the two
 * keys every operator reaches for in a table-heavy tool.
 */
export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  /** Accessible name; the placeholder is not one. */
  label: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);
  // What this field last sent up. Lets a change arriving from outside (Clear
  // filters, the Back button, a deep link) replace the draft, while the echo
  // of our own debounced send doesn't clobber keys typed since.
  const [sent, setSent] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (value !== sent) {
      setDraft(value);
      setSent(value);
    }
  }

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (draft.trim() === value) return;
    const timer = setTimeout(() => {
      const next = draft.trim();
      setSent(next);
      onChangeRef.current(next);
    }, 300);
    return () => clearTimeout(timer);
  }, [draft, value]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function clear() {
    setDraft("");
    setSent("");
    onChange("");
    inputRef.current?.focus();
  }

  return (
    <div className={cn("relative min-w-56 flex-1", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && draft) {
            e.preventDefault();
            clear();
          }
        }}
        placeholder={placeholder}
        aria-label={label}
        spellCheck={false}
        autoComplete="off"
        className="w-full rounded-xl border border-line bg-surface-dark py-2 pr-16 pl-9 text-body-sm text-ink-soft placeholder:text-muted focus:border-border-strong focus:outline-none"
      />
      <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
        {draft ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="flex size-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/5 hover:text-ink-soft"
          >
            <X className="size-3.5" />
          </button>
        ) : (
          <kbd className="hidden rounded border border-line px-1.5 font-mono text-[11px] leading-5 text-muted sm:inline">
            /
          </kbd>
        )}
      </div>
    </div>
  );
}

export type ChipOption<T extends string> = {
  value: T;
  label: string;
  count?: number;
  /** Tints the count when it is non-zero — for "failed" and "unread". */
  alert?: boolean;
};

/** The filter worth one click: every option visible, the current one lit. */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value || "all"}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-caption font-medium capitalize transition-colors",
              active
                ? "border-brand/40 bg-brand/15 text-brand"
                : "border-line bg-surface-2 text-muted hover:border-border-strong hover:text-ink-soft",
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  "ml-1.5 tabular-nums",
                  option.alert && option.count > 0 && !active ? "text-accent" : "opacity-60",
                )}
              >
                {option.count.toLocaleString()}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export type SelectOption = { value: string; label: string; count?: number };

/**
 * A native select dressed as a filter pill. Native on purpose: it gets
 * keyboard type-ahead and the platform picker on phones for free, and the
 * root's `color-scheme: dark` keeps its popup on-theme.
 */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  defaultValue = "",
  className,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: readonly SelectOption[];
  /** The value that means "not filtering"; the pill lights up otherwise. */
  defaultValue?: string;
  className?: string;
}) {
  const active = value !== defaultValue;
  // A value the options don't list (a stale link, an option that has aged
  // out) is still shown rather than silently rendering as the first entry.
  const known = options.some((o) => o.value === value);
  return (
    <label
      className={cn(
        "relative inline-flex items-center rounded-full border text-caption font-medium transition-colors focus-within:border-border-strong",
        active
          ? "border-brand/40 bg-brand/10 text-brand"
          : "border-line bg-surface-2 text-muted hover:border-border-strong hover:text-ink-soft",
        className,
      )}
    >
      <span className="pointer-events-none pl-3 whitespace-nowrap">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-52 cursor-pointer appearance-none truncate bg-transparent py-1.5 pr-7 pl-1 text-ink-soft focus:outline-none"
      >
        {!known && <option value={value}>{value}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
            {o.count !== undefined ? ` (${o.count.toLocaleString()})` : ""}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 size-3.5 text-muted"
        aria-hidden="true"
      />
    </label>
  );
}

/** "When" choices shared by every page that filters on a date. */
export const RANGE_OPTIONS: readonly SelectOption[] = [
  { value: "", label: "Any time" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

/** A removable pill for a filter that arrived by link and has no control of
 *  its own on the page — "User: jane@…", "Target: User 3f2a…". */
export function FilterToken({
  label,
  value,
  onRemove,
}: {
  label: string;
  value: ReactNode;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 py-1 pr-1 pl-3 text-caption text-brand">
      <span className="text-brand/70">{label}:</span>
      <span className="truncate font-mono">{value}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="flex size-5 items-center justify-center rounded-full transition-colors hover:bg-brand/20"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

/**
 * The line between the filters and the table: the match count, a quiet
 * spinner while a refetch is in flight (the old rows stay on screen), and
 * the page-level actions — refresh, export, clear.
 */
export function ResultBar({
  total,
  noun,
  fetching,
  filtered,
  onClear,
  onRefresh,
  onExport,
  exporting,
  children,
}: {
  total: number | undefined;
  noun: string;
  fetching?: boolean;
  /** Whether anything is narrowing the list; shows "Clear filters". */
  filtered?: boolean;
  onClear?: () => void;
  onRefresh?: () => void;
  onExport?: () => void;
  exporting?: boolean;
  /** Extra controls on the right, before refresh/export. */
  children?: ReactNode;
}) {
  return (
    <div className="mb-3 flex min-h-8 flex-wrap items-center justify-between gap-2">
      <p className="flex items-center gap-2 text-caption text-muted" aria-live="polite">
        {total === undefined ? (
          "Loading…"
        ) : (
          <>
            <span>
              <span className="font-medium text-ink-soft tabular-nums">{total.toLocaleString()}</span>{" "}
              {noun}
              {filtered ? " match" : ""}
            </span>
            {filtered && onClear && (
              <button
                type="button"
                onClick={onClear}
                className="text-brand transition-colors hover:underline"
              >
                Clear filters
              </button>
            )}
          </>
        )}
        {fetching && <Loader2 className="size-3.5 animate-spin" aria-label="Updating" />}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {children}
        {onRefresh && (
          <ToolbarButton onClick={onRefresh} label="Refresh">
            <RefreshCw className="size-3.5" aria-hidden="true" />
          </ToolbarButton>
        )}
        {onExport && (
          <ToolbarButton onClick={onExport} label="Export CSV" disabled={exporting || !total}>
            {exporting ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="size-3.5" aria-hidden="true" />
            )}
            <span>Export</span>
          </ToolbarButton>
        )}
      </div>
    </div>
  );
}

export function ToolbarButton({
  onClick,
  label,
  disabled,
  active,
  children,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-caption font-medium transition-colors disabled:pointer-events-none disabled:opacity-40",
        active
          ? "border-brand/40 bg-brand/10 text-brand"
          : "border-line text-muted hover:border-border-strong hover:text-ink-soft",
      )}
    >
      {children}
    </button>
  );
}
