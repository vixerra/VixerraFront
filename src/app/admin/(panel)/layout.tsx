import { Suspense, type ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { LoadingBlock } from "@/components/admin/ui";
import { PageGuide } from "@/components/help/page-guide";

// A route group, so it wraps every admin page WITHOUT wrapping
// /admin/login — which must stay reachable while signed out. The URLs are
// unaffected: this file governs /admin, /admin/users, and so on.
export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return (
    <AdminShell>
      {/* The pages keep their filters in the query string (useSearchParams),
          which Next requires a Suspense boundary above for static builds —
          one here covers every admin page. */}
      <Suspense fallback={<LoadingBlock />}>{children}</Suspense>
      <PageGuide variant="floating" />
    </AdminShell>
  );
}
