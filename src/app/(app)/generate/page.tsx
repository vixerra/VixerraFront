import type { Metadata } from "next";
import { Suspense } from "react";
import { GenerateStudio } from "@/components/generate/generate-workspace";

export const metadata: Metadata = { title: "Generate" };

export default function GeneratePage() {
  return (
    <Suspense fallback={null}>
      <GenerateStudio type="text-to-video" />
    </Suspense>
  );
}
