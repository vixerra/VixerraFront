"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "sidebar-collapsed";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot(): boolean {
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

// Server always renders expanded — localStorage doesn't exist there, and
// useSyncExternalStore reconciles the mismatch on hydration for us.
function getServerSnapshot(): boolean {
  return false;
}

// No Context/Provider needed: the "external store" is localStorage itself,
// which is already global, so any component anywhere (AppShell's own
// toggle, or a page like generate-workspace.tsx that needs to clear a
// fixed-positioned element around the sidebar) can read the live value
// directly without being wrapped in anything.
export function useSidebarCollapsed() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setSidebarCollapsed(next: boolean) {
  window.localStorage.setItem(STORAGE_KEY, String(next));
  // The native "storage" event only fires in *other* tabs — dispatch it
  // manually so this tab's useSyncExternalStore subscribers re-read too.
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: String(next) }));
}
