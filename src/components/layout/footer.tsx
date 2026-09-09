import Link from "next/link";
import { Logo } from "./logo";

// Condensed to a single row (migration brief: "no mega-footer, the site
// bets everything on the final CTA") rather than the old 3-column link
// grid — but every link stays reachable (About/Contact/Terms/Privacy have
// no other nav path anywhere on the site), just inline instead of in
// columns, so nothing gets orphaned.
const FOOTER_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/models", label: "Models" },
  { href: "/guides", label: "Guides" },
  { href: "/prompts", label: "Presets" },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="container-page flex flex-col items-center gap-6 py-10 text-center">
        <Logo />
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-caption text-muted transition-colors hover:text-brand"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-caption text-muted">
          © {new Date().getFullYear()} Vixerra. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
