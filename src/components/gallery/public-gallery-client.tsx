"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { Spinner } from "@/components/ui/spinner";
import type { GalleryItem } from "@/components/gallery/generation-card";

// The interactive grid only. The page's heading and intro moved to the server
// component at (marketing)/gallery/page.tsx so they are in the initial HTML
// rather than appearing after a client fetch — this rendered its own <h1> as
// well, which left the page with two of them once the server one existed.

function usePublicGenerations() {
  return useQuery({
    queryKey: ["generations-public"],
    queryFn: async (): Promise<GalleryItem[]> => {
      const res = await apiFetch("/api/generations/public");
      if (!res.ok) throw new Error("Failed to load gallery");
      const data = await res.json();
      return data.items;
    },
  });
}

export function PublicGalleryClient() {
  const { data: generations, isLoading } = usePublicGenerations();

  if (isLoading || !generations) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <p className="text-center text-body-sm text-muted">
        Nothing shared publicly yet — check back soon.
      </p>
    );
  }

  return <GalleryGrid items={generations} showAuthor />;
}
