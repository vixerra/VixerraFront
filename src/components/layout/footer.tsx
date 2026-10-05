import Link from "next/link";
import { Logo } from "./logo";
import { DISCORD_INVITE, DiscordIcon } from "./discord";

// Condensed to a single row (migration brief: "no mega-footer, the site
// bets everything on the final CTA") rather than the old 3-column link
// grid — but every link stays reachable (About/Contact/Terms/Privacy have
// no other nav path anywhere on the site), just inline instead of in
// columns, so nothing gets orphaned.
const FOOTER_LINKS = [
  { href: "/ai-video-generator", label: "AI Video Generator" },
  { href: "/ai-image-generator", label: "AI Image Generator" },
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
        <a
          href={DISCORD_INVITE}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 rounded-full border border-line bg-surface-2 px-4 py-2 text-label font-medium text-ink transition-colors hover:border-[#5865F2] hover:text-[#5865F2]"
        >
          <DiscordIcon className="size-5 text-[#5865F2]" />
          <span>
            <span className="mr-1.5 rounded-full bg-[#5865F2]/15 px-1.5 py-0.5 text-caption font-semibold text-[#5865F2]">
              New
            </span>
            Join our Discord community
          </span>
        </a>
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
          © {new Date().getFullYear()} Vixlens. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
