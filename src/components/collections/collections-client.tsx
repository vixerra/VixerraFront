"use client";

import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { CreateCollectionButton } from "@/components/collections/create-collection-button";

type CollectionSummary = {
  id: string;
  name: string;
  description: string | null;
  itemCount: number;
};

function useCollections() {
  return useQuery({
    queryKey: ["collections"],
    queryFn: async (): Promise<CollectionSummary[]> => {
      const res = await apiFetch("/api/collections");
      if (!res.ok) throw new Error("Failed to load collections");
      const data = await res.json();
      return data.items;
    },
  });
}

export function CollectionsClient() {
  const { data: collections, isLoading } = useCollections();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-heading font-bold tracking-tight text-ink">Collections</h1>
          <p className="mt-2 text-body-sm text-muted">Organize generations into shareable groups.</p>
        </div>
        <CreateCollectionButton />
      </div>

      <div className="mt-8">
        {isLoading || !collections ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : collections.length === 0 ? (
          <Card variant="standard" className="flex flex-col items-center gap-3 py-16 text-center">
            <FolderKanban className="size-8 text-muted" aria-hidden="true" />
            <p className="text-body-sm text-muted">
              No collections yet. Create one to start organizing.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <Link key={collection.id} href={`/collections/${collection.id}`}>
                <Card variant="standard" className="flex h-full flex-col">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-accent-orange shadow-glow-sm">
                    <FolderKanban className="size-5 text-on-brand" aria-hidden="true" />
                  </span>
                  <h2 className="mt-4 text-subheading font-semibold text-ink">{collection.name}</h2>
                  {collection.description && (
                    <p className="mt-2 line-clamp-2 text-body-sm text-muted">
                      {collection.description}
                    </p>
                  )}
                  <p className="mt-auto pt-4 text-caption text-muted">
                    {collection.itemCount} item{collection.itemCount === 1 ? "" : "s"}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
