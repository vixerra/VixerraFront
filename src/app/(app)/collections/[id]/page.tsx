import type { Metadata } from "next";
import { CollectionDetailClient } from "@/components/collections/collection-detail-client";

export const metadata: Metadata = { title: "Collection" };

export default async function CollectionDetailPage(props: PageProps<"/collections/[id]">) {
  const { id } = await props.params;
  return <CollectionDetailClient id={id} />;
}
