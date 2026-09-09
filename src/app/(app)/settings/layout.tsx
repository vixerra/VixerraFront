import type { ReactNode } from "react";
import { SettingsNav } from "@/components/settings/settings-nav";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-heading font-bold tracking-tight text-ink">Settings</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        <SettingsNav />
        <div>{children}</div>
      </div>
    </div>
  );
}
