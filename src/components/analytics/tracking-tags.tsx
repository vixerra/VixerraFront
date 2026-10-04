"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

// The ad and analytics tags are ~600 KB of third-party JS and were most of
// mobile PageSpeed's Total Blocking Time — even on lazyOnload, which still
// runs them during the load. They now wait for the visitor's first scroll,
// tap or key press, or FALLBACK_MS for someone who just reads, so they never
// compete with the page's own hydration.
const INTERACTIONS = ["scroll", "pointerdown", "keydown", "touchstart"] as const;
const FALLBACK_MS = 10_000;

/** Keeps the ad's `ttclid` in a cookie shared by the apex and app hosts: the
 *  Pixel doesn't persist it, and the API's Events API calls
 *  (lib/tiktok-events.ts in the backend) read it off the signup request.
 *  Runs on mount rather than with the deferred Pixel, so a visitor who
 *  leaves early still carries it. */
function persistTtclid() {
  const ttclid = new URLSearchParams(location.search).get("ttclid");
  if (!ttclid) return;
  document.cookie =
    `ttclid=${encodeURIComponent(ttclid)};path=/;max-age=2592000;SameSite=Lax` +
    (/(^|\.)vixlens\.com$/.test(location.hostname) ? ";domain=.vixlens.com" : "");
}

export function TrackingTags() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    persistTtclid();

    const start = () => {
      stop();
      setReady(true);
    };
    const timer = setTimeout(start, FALLBACK_MS);
    function stop() {
      clearTimeout(timer);
      INTERACTIONS.forEach((e) => window.removeEventListener(e, start));
    }
    INTERACTIONS.forEach((e) => window.addEventListener(e, start, { passive: true, once: true }));
    return stop;
  }, []);

  if (!ready) return null;

  return (
    <>
      {/* Google Tag Manager. Its container also loads GA4 (G-FEEGSJGPZM), so
          there is no separate gtag.js here: loading both fetched the same
          175 KB twice and sent each page view twice. */}
      <Script id="google-tag-manager" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','GTM-M7N7WGMQ');`}
      </Script>
      {/* Meta Pixel — fires PageView on every route.
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
      {/* TikTok Pixel — same loader pattern as the Meta Pixel. */}
      <Script id="tiktok-pixel" strategy="afterInteractive">
        {`!function (w, d, t) {
        w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
        var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
        ;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
        ttq.load('DB0IG3RC77UA626ED02G');
        ttq.page();
        }(window, document, 'ttq');`}
      </Script>
    </>
  );
}
