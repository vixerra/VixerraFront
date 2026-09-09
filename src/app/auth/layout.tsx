import type { Metadata } from "next";
import type { ReactNode } from "react";

// /auth/callback is a "use client" page, so it cannot export metadata of its
// own — without this layout it inherited the root defaults and shipped a
// second copy of the homepage's title and description under an indexable URL.
//
// Deliberately paired with *removing* /auth/ from robots.txt: a page that is
// blocked from crawling can never be read, so its noindex never applies and it
// can still surface as a bare URL. Crawlable + noindex is the combination that
// actually keeps it out of the index.
export const metadata: Metadata = {
  title: "Signing you in",
  robots: { index: false, follow: false },
};

export default function AuthCallbackLayout({ children }: { children: ReactNode }) {
  return children;
}
