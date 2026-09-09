"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-client";
import { useInvalidateCredits } from "@/hooks/use-credits";

export type GenerationStatus = "idle" | "queued" | "processing" | "completed" | "failed";

export type GenerationResult = { resultUrl: string; thumbnailUrl: string | null };

type GenerationState = {
  status: GenerationStatus;
  progress: number;
  result: GenerationResult | null;
  /** A preset character stage's output, once it exists. Arrives well
   * before the video does — the point is to have something to show
   * during the second half of the run. */
  stagedImageUrl: string | null;
  error: string | null;
};

const IDLE_STATE: GenerationState = {
  status: "idle",
  progress: 0,
  result: null,
  stagedImageUrl: null,
  error: null,
};

export function useGeneration(jobId: string | null) {
  const [state, setState] = useState<GenerationState>(IDLE_STATE);
  const invalidateCredits = useInvalidateCredits();

  useEffect(() => {
    // jobId only ever goes null -> set in this app (a new generation gets a
    // fresh id, it never regresses to null), and state already starts idle,
    // so there is nothing to reset here on the no-job branch.
    if (!jobId) return;

    const source = new EventSource(apiUrl(`/api/generations/${jobId}/stream`), {
      withCredentials: true,
    });

    // The server always sends "queued" as its first message on connect, so
    // resetting local state here (rather than synchronously before the
    // EventSource is even created) keeps every setState call inside a
    // callback reacting to the external stream, not the effect body itself.
    source.addEventListener("queued", () => {
      // Keeps any staged image already received: the stream reconnects on
      // its own wall-clock budget, and re-sending "queued" must not wipe
      // the character out from under a run that is still going.
      setState((prev) => ({ ...prev, status: "queued", progress: 0, result: null, error: null }));
    });
    source.addEventListener("staged", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      setState((prev) => ({ ...prev, stagedImageUrl: data.styledImageUrl ?? null }));
    });
    source.addEventListener("started", () => {
      setState((prev) => ({ ...prev, status: "processing" }));
    });
    source.addEventListener("progress", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      setState((prev) => ({ ...prev, status: "processing", progress: data.percent }));
    });
    source.addEventListener("completed", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      setState((prev) => ({
        ...prev,
        status: "completed",
        progress: 100,
        result: { resultUrl: data.resultUrl, thumbnailUrl: data.thumbnailUrl ?? null },
        error: null,
      }));
      source.close();
    });
    source.addEventListener("failed", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      setState((prev) => ({
        ...prev,
        status: "failed",
        error: data.message ?? "Generation failed.",
      }));
      source.close();
      // The server has already refunded this generation's credits by the
      // time this event fires (see internal.ts's sweepStuckJobs / the
      // generation-runner failure path) — without this, that refund is
      // invisible in the UI until the next unrelated refetch.
      invalidateCredits();
    });

    return () => source.close();
  }, [jobId, invalidateCredits]);

  return state;
}
