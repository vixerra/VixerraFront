import type { Metadata } from "next";
import { CollectionsClient } from "@/components/collections/collections-client";

export const metadata: Metadata = { title: "Collections" };

export default function CollectionsPage() {
  return <CollectionsClient />;
}
