import { Suspense } from "react";
import type { Metadata } from "next";

import { Spinner } from "@/components/ui/spinner";
import { EditingStudio } from "@/components/editor/editing-studio";
import { CreatorSuiteGate } from "@/components/upgrade-gate";

export const metadata: Metadata = {
  title: "Editing studio",
  description:
    "Cut, trim and combine your generated videos into one finished clip — transitions, captions, your own watermark, music, and an MP4 at the end.",
};

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[60vh] items-center justify-center">
          <Spinner size={28} />
        </div>
      }
    >
      {/* useSearchParams (the /editor?add=<id> deep link from the gallery)
          opts the tree into client-side bailout, which Next requires a
          Suspense boundary for — without one the whole route falls back to
          client rendering at build time. */}
      {/* The whole editor runs in the browser and never calls an endpoint
          of its own, so this route is the only place its plan gate can
          live — see TIER_INFO.creatorSuite. */}
      <CreatorSuiteGate feature="editing-studio">
        <EditingStudio />
      </CreatorSuiteGate>
    </Suspense>
  );
}
