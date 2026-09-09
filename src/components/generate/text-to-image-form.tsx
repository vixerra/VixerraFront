"use client";

import { useState } from "react";
import { DynamicModelForm } from "./dynamic-model-form";
import { UnsupportedModelNotice } from "./unsupported-model-notice";
import { getCloudflareModel } from "@/lib/cloudflare-models";
import { IMAGE_MODELS, type ImageModelId } from "@/lib/constants";

export function TextToImageForm({
  onCreated,
  busy,
  initialModel,
  initialPrompt,
}: {
  onCreated: (jobId: string) => void;
  busy: boolean;
  /** Deep-link support (e.g. "Try this model" from the homepage showcase). */
  initialModel?: ImageModelId;
  initialPrompt?: string;
}) {
  const [model, setModel] = useState<ImageModelId>(
    initialModel && IMAGE_MODELS.some((m) => m.id === initialModel) ? initialModel : IMAGE_MODELS[0].id,
  );
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const dynamicConfig = getCloudflareModel(model);

  if (dynamicConfig && dynamicConfig.category === "text-to-image") {
    return (
      <DynamicModelForm
        key={model}
        config={dynamicConfig}
        mode="text-to-image"
        models={IMAGE_MODELS}
        model={model}
        onModelChange={setModel}
        initialPrompt={prompt}
        onPromptChange={setPrompt}
        onCreated={onCreated}
        busy={busy}
      />
    );
  }

  // Unreachable today — IMAGE_MODELS is derived from the registry, so every
  // id it can hold resolves above. See text-to-video-form.tsx.
  return <UnsupportedModelNotice modelId={model} />;
}
