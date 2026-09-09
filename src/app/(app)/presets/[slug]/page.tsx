import type { Metadata } from "next";
import { PresetStudioLoader } from "@/components/presets/preset-studio-loader";

// The catalogue lives in the database now, not in this bundle, so there is
// no build-time list of slugs to pre-render from — generateStaticParams and
// the per-preset generateMetadata both went with it. A recipe published from
// the admin panel has to be reachable immediately, which a statically
// generated route could not do.
//
// The title is generic for the same reason: naming the preset would mean
// fetching it here, and this route sits behind auth in (app), so there is no
// crawler to serve a better one to. The studio renders the preset's real
// name as its heading.
export const metadata: Metadata = {
  title: "Preset",
  description: "Upload one photo and run a finished video recipe.",
};

export default async function PresetDetailPage(props: PageProps<"/presets/[slug]">) {
  const { slug } = await props.params;
  return <PresetStudioLoader slug={slug} />;
}
