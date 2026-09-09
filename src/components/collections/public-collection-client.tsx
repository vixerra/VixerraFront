"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { Spinner } from "@/components/ui/spinner";
import { Logo } from "@/components/layout/logo";
import type { GalleryItem } from "@/components/gallery/generation-card";

type PublicCollection = {
  name: string;
  description: string | null;
  items: GalleryItem[];
};

export function PublicCollectionClient({ token }: { token: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-collection", token],
    queryFn: async (): Promise<PublicCollection> => {
      const res = await apiFetch(`/api/collections/share/${token}`);
      if (!res.ok) throw new Error("not-found");
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-line">
        <div className="container-page flex h-16 items-center">
          <Logo />
        </div>
      </header>
      <div className="container-page py-16">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Spinner />
          </div>
        ) : isError || !data ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <p className="text-body text-ink-soft">This collection is not available.</p>
          </div>
        ) : (
          <>
            <h1 className="font-display text-heading font-bold tracking-tight text-ink">{data.name}</h1>
            {data.description && (
              <p className="mt-2 text-body text-muted">{data.description}</p>
            )}
            <div className="mt-10">
              {data.items.length === 0 ? (
                <p className="text-body-sm text-muted">This collection is empty.</p>
              ) : (
                <GalleryGrid items={data.items} showAuthor />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
