import { SHOW_COMPANY_PLACEHOLDERS } from "@/lib/company";

/**
 * Marks a spot waiting on a real fact from the owner (see lib/company.ts).
 * Visible in development so the gap is obvious; renders nothing in
 * production, so no placeholder copy ever ships.
 */
export function OwnerPlaceholder({ children }: { children: string }) {
  if (!SHOW_COMPANY_PLACEHOLDERS) return null;
  return (
    <span className="inline-flex rounded-md border border-dashed border-warning/50 bg-warning/10 px-2 py-1 text-caption text-warning">
      TODO(owner): {children}
    </span>
  );
}
