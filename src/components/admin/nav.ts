import {
  Activity,
  Coins,
  Gauge,
  Images,
  LifeBuoy,
  ScrollText,
  Users,
  Wand2,
  type LucideIcon,
} from "lucide-react";

/** Which live count, if any, a nav item carries as a badge (see
 *  useAdminBadges). */
export type NavBadge = "failed24h" | "unreadMessages";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: NavBadge;
  /** Extra words the command palette matches on. */
  keywords?: string;
};

/** The panel's sections, shared by the sidebar and the command palette so
 *  the two can't list different pages. */
export const NAV_SECTIONS: { label: string; items: AdminNavItem[] }[] = [
  {
    label: "Monitor",
    items: [
      { href: "/admin", label: "Overview", icon: Gauge, exact: true, keywords: "dashboard stats home" },
      {
        href: "/admin/generations",
        label: "Generations",
        icon: Activity,
        badge: "failed24h",
        keywords: "jobs queue failed retry",
      },
    ],
  },
  {
    label: "Accounts",
    items: [
      { href: "/admin/users", label: "Users", icon: Users, keywords: "accounts customers" },
      { href: "/admin/credits", label: "Credits", icon: Coins, keywords: "ledger grants balance" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/admin/presets", label: "Presets", icon: Wand2, keywords: "recipes" },
      { href: "/admin/content", label: "Content", icon: Images, keywords: "gallery public moderation" },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        href: "/admin/support",
        label: "Support",
        icon: LifeBuoy,
        badge: "unreadMessages",
        keywords: "messages inbox contact",
      },
      { href: "/admin/audit", label: "Audit log", icon: ScrollText, keywords: "history actions staff" },
    ],
  },
];

export const NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);
