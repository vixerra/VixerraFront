import type { Metadata } from "next";
import { Inter, Space_Grotesk, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { ToastProvider } from "@/components/ui/toast";
import { ConfirmProvider } from "@/components/ui/confirm";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReleaseAnnouncementModal } from "@/components/marketing/release-announcement-modal";
import { DEFAULT_OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

// Three type roles instead of one Inter-everywhere system — see the
// --font-sans/--font-display/--font-accent tokens in globals.css for how
// these get assigned. body = plain-legible UI copy, display = grotesk with
// actual character for headlines/nav/buttons, accent = italic serif
// reserved for one editorial phrase per hero/section.
const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const display = Space_Grotesk({
  variable: "--font-display-face",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const accent = Instrument_Serif({
  variable: "--font-accent-face",
  subsets: ["latin"],
  weight: "400",
  style: ["italic", "normal"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
});

// metadataBase is what turns every relative `alternates.canonical` and OG
// image on a page into an absolute URL. Without it Next.js emits relative
// canonicals, which crawlers resolve against whatever host served the page —
// so a preview deploy would canonicalise production's content to itself.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Vixerra — AI Video & Image Generation",
    template: "%s · Vixerra",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // Deliberately no `alternates.canonical` here. Metadata is inherited, so a
  // canonical set on the root layout becomes the canonical of every page that
  // doesn't override it — pointing the whole site at "/" and de-indexing it.
  // Each indexable page sets its own; the rest emit none, which leaves the
  // requested URL as the canonical, and that is already correct.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "Vixerra — AI Video & Image Generation",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vixerra — AI Video & Image Generation",
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-video-preview": -1 },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} ${accent.variable} ${mono.variable}`}>
      <body>
        <QueryProvider>
          <TooltipProvider>
            <ConfirmProvider>
              <ToastProvider>{children}</ToastProvider>
            </ConfirmProvider>
            <ReleaseAnnouncementModal />
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
