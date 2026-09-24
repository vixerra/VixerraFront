import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Space_Grotesk, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
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
    default: "Vixlens — AI Video Generator & AI Image Generator",
    template: "%s · Vixlens",
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
    title: "Vixlens — AI Video Generator & AI Image Generator",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vixlens — AI Video Generator & AI Image Generator",
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-video-preview": -1 },
  },
  // Facebook Business domain verification (Meta Business Suite → Brand Safety
  // → Domains). Renders <meta name="facebook-domain-verification" …> in <head>.
  verification: {
    other: { "facebook-domain-verification": "mj9jz0e8nix5l4t89hxzuz8sxk00g2" },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} ${accent.variable} ${mono.variable}`}>
      <body>
        {/* Google Tag Manager (noscript) — must be the first thing in <body>. */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-M7N7WGMQ"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* Google Tag Manager — same afterInteractive strategy @next/third-parties'
            <GoogleTagManager> uses; next/script hoists the loader itself. */}
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-M7N7WGMQ');`}
        </Script>
        {/* Google tag (gtag.js) — GA4. Shares GTM's `dataLayer`. */}
        <Script
          id="google-tag-loader"
          src="https://www.googletagmanager.com/gtag/js?id=G-FEEGSJGPZM"
          strategy="afterInteractive"
        />
        <Script id="google-tag" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-FEEGSJGPZM');`}
        </Script>
        {/* Meta Pixel — fires PageView on every route via strategy="afterInteractive".
            Two pixel ids share one loader/one PageView call: fbq('init', ...) can be
            called more than once, and 'track' (unlike 'trackSingle') fires for every
            pixel that's been init'd. */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '2495678700916052');
          fbq('init', '3254360258285341');
          fbq('track', 'PageView');`}
        </Script>
        <noscript>
          <img
            height="1"
            width="1"
            alt=""
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=2495678700916052&ev=PageView&noscript=1"
          />
        </noscript>
        <noscript>
          <img
            height="1"
            width="1"
            alt=""
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=3254360258285341&ev=PageView&noscript=1"
          />
        </noscript>
        <QueryProvider>
          <TooltipProvider>
            <ConfirmProvider>
              <ToastProvider>{children}</ToastProvider>
            </ConfirmProvider>
            <ReleaseAnnouncementModal />
          </TooltipProvider>
        </QueryProvider>
        <Analytics />
      </body>
    </html>
  );
}
