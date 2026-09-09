import type { Metadata } from "next";
import { PublicCollectionClient } from "@/components/collections/public-collection-client";

// A share link, not a public page: the token is the only thing standing
// between this collection and anyone who has it, so it must not end up in an
// index. The community feed at /gallery is the surface meant to be found.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PublicCollectionPage(props: PageProps<"/c/[token]">) {
  const { token } = await props.params;
  return <PublicCollectionClient token={token} />;
}
