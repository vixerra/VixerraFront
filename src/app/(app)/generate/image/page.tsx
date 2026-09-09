import type { Metadata } from "next";
import { Suspense } from "react";
import { GenerateStudio } from "@/components/generate/generate-workspace";

export const metadata: Metadata = { title: "Create Image" };

export default function TextToImagePage() {
  return (
    <Suspense fallback={null}>
      <GenerateStudio type="text-to-image" />
    </Suspense>
  );
}
