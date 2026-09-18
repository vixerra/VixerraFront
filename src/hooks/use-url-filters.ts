"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type PatchValue = string | number | null | undefined;

/**
 * List-page state kept in the query string instead of component state.
 *
 * Why the URL: an operator who opens a row from a filtered list and presses
 * Back lands on the same filtered list, a view can be pasted to a colleague,
 * and a link elsewhere in the panel can open a page already narrowed ("failed
 * in the last 24h") without that page knowing it was linked to.
 *
 * Defaults stay out of the address, so an unfiltered page has a clean URL.
 * A value that differs from its default is written even when empty, which is
 * how a filter whose default is not "everything" can still be switched to
 * everything. Changing anything but the page resets to the first page — page
 * 4 of the old results says nothing about the new ones.
 *
 * `defaults` must be a stable object (a module-level constant): it is a memo
 * dependency.
 */
export function useUrlFilters<K extends string>(
  defaults: Readonly<Record<K, string>>,
  {
    limit: defaultLimit,
    maxLimit = 100,
  }: {
    limit: number;
    /** The endpoint's own page-size cap; a hand-edited ?limit= above it
     *  would otherwise turn the page into a 400. */
    maxLimit?: number;
  },
) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => {
    const out: Record<K, string> = { ...defaults };
    for (const key of Object.keys(defaults) as K[]) {
      const value = searchParams.get(key);
      if (value !== null) out[key] = value;
    }
    return out;
  }, [defaults, searchParams]);

  const offset = toCount(searchParams.get("offset"), 0);
  const limit = Math.min(toCount(searchParams.get("limit"), defaultLimit) || defaultLimit, maxLimit);

  const update = useCallback(
    (patch: Partial<Record<K | "offset" | "limit", PatchValue>>) => {
      // Read the live address rather than the render's snapshot, so two
      // updates in the same tick (a sort column and its direction, say)
      // compose instead of the second overwriting the first.
      const next = new URLSearchParams(window.location.search);
      for (const [key, raw] of Object.entries(patch) as [string, PatchValue][]) {
        const fallback =
          key === "offset"
            ? "0"
            : key === "limit"
              ? String(defaultLimit)
              : (defaults[key as K] ?? "");
        if (raw === null || raw === undefined || String(raw) === fallback) next.delete(key);
        else next.set(key, String(raw));
      }
      if (!("offset" in patch)) next.delete("offset");
      const qs = next.toString();
      // The native history API rather than router.replace: Next syncs
      // useSearchParams to it without a server round trip, and nothing on
      // these pages is rendered on the server from the query anyway.
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [defaults, defaultLimit, pathname],
  );

  /** Back to the defaults for the given keys (all filter keys by default).
   *  Page size is a preference, not a filter, so it survives. */
  const reset = useCallback(
    (keys?: K[]) => {
      const patch: Partial<Record<K | "offset" | "limit", PatchValue>> = {};
      for (const key of keys ?? (Object.keys(defaults) as K[])) patch[key] = null;
      update(patch);
    },
    [defaults, update],
  );

  return { filters, offset, limit, update, reset, searchParams };
}

function toCount(raw: string | null, fallback: number) {
  const n = Number(raw);
  return raw !== null && Number.isInteger(n) && n >= 0 ? n : fallback;
}

/** The next sort after clicking a column header: the same column flips
 *  direction, a new one starts at its natural direction. */
export function nextSort(
  current: { sort: string; dir: string },
  field: string,
  firstDir: "asc" | "desc" = "desc",
) {
  if (current.sort === field) return { sort: field, dir: current.dir === "asc" ? "desc" : "asc" };
  return { sort: field, dir: firstDir };
}
