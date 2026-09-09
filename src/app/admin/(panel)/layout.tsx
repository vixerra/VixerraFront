import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageGuide } from "@/components/help/page-guide";

// A route group, so it wraps every admin page WITHOUT wrapping
// /admin/login — which must stay reachable while signed out. The URLs are
// unaffected: this file governs /admin, /admin/users, and so on.
export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return (
    <AdminShell>
      {children}
      <PageGuide variant="floating" />
    </AdminShell>
  );
}
