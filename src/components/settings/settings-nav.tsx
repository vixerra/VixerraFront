"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/settings", label: "Profile" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/social", label: "Social" },
  { href: "/settings/api-keys", label: "API Keys" },
  { href: "/settings/security", label: "Security" },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-xl px-4 py-3 text-label transition-colors",
              active
                ? "bg-brand/10 text-brand"
                : "text-muted hover:bg-white/5 hover:text-ink-soft",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
