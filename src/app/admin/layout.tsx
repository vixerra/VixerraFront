import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  // The staff console should never show up in search results, and there is
  // nothing here a crawler should follow even when signed out.
  robots: { index: false, follow: false },
};

// Intentionally a pass-through. The guarded chrome lives in (panel)/layout
// so that /admin/login can render outside it.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
