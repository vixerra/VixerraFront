import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ScrollProgress } from "@/components/marketing/scroll-progress";
import { BackToTop } from "@/components/marketing/back-to-top";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="marketing-headings flex min-h-screen flex-col">
      <ScrollProgress />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <BackToTop />
    </div>
  );
}
