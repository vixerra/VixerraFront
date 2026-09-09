import type { Metadata } from "next";
import { MyGalleryClient } from "@/components/gallery/my-gallery-client";

export const metadata: Metadata = { title: "My Gallery" };

export default function MyGalleryPage() {
  return (
    <div>
      <h1 className="font-display text-heading font-bold tracking-tight text-ink">My Gallery</h1>
      <p className="mt-2 text-body-sm text-muted">Everything you&apos;ve generated.</p>
      <div className="mt-8">
        <MyGalleryClient />
      </div>
    </div>
  );
}
