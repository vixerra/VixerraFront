import Link from "next/link";
import { Logo } from "./logo";
import { DISCORD_INVITE, DiscordIcon } from "./discord";

// Columned, comfy.org-style: identity + community on the left, grouped
// links on the right. Every link the site needs (About/Contact/Terms/
// Privacy have no other nav path) lives in one of the columns.
const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/ai-video-generator", label: "AI Video Generator" },
      { href: "/ai-image-generator", label: "AI Image Generator" },
      { href: "/features", label: "Features" },
      { href: "/models", label: "Models" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/guides", label: "Guides" },
      { href: "/prompts", label: "Presets" },
      { href: "/gallery", label: "Gallery" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="container-page grid gap-12 py-14 sm:py-16 lg:grid-cols-[1.2fr_2fr]">
        <div className="flex flex-col items-start gap-5">
          <Logo />
          <p className="max-w-xs text-body-sm text-muted">
            Every top AI video and image model in one studio.
          </p>
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 rounded-lg border border-line bg-ink/[0.04] px-4 py-2.5 text-[12px] font-bold tracking-[0.06em] text-ink uppercase transition-colors hover:border-brand/60 hover:text-brand"
          >
            <DiscordIcon className="size-4" />
            Join our Discord
          </a>
        </div>

        <nav className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4" aria-label="Footer">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="text-[11px] font-bold tracking-[0.08em] text-text-tertiary uppercase">
                {column.title}
              </p>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-body-sm text-muted transition-colors hover:text-brand"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-6 text-caption text-text-tertiary sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Vixlens. All rights reserved.</p>
          <p>Made for creators.</p>
        </div>
      </div>
    </footer>
  );
}
