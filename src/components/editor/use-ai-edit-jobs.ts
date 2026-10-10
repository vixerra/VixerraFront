"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

import { apiUrl } from "@/lib/api-client";
import { useInvalidateCredits } from "@/hooks/use-credits";
import { loadAiJobs, saveAiJobs, type AiEditJob } from "@/lib/editor/ai-edit";
import type { GenerationResult } from "@/hooks/use-generation";

/**
 * The AI edits a project is waiting on, kept outside React.
 *
 * An external store rather than component state because the list has two
 * writers that don't share a render — the dialog adding a job and a stream
 * callback finishing one — and because it is mirrored to localStorage, which
 * is exactly the kind of outside source useSyncExternalStore exists for. The
 * cache keeps each snapshot referentially stable until it actually changes.
 */
const cache = new Map<string, AiEditJob[]>();
const listeners = new Set<() => void>();
const EMPTY: AiEditJob[] = [];

function snapshot(projectId: string | null): AiEditJob[] {
  if (!projectId) return EMPTY;
  let jobs = cache.get(projectId);
  if (!jobs) {
    jobs = loadAiJobs(projectId);
    cache.set(projectId, jobs);
  }
  return jobs;
}

function update(projectId: string, change: (jobs: AiEditJob[]) => AiEditJob[]) {
  const next = change(snapshot(projectId));
  cache.set(projectId, next);
  saveAiJobs(projectId, next);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function patchJob(projectId: string, id: string, patch: Partial<AiEditJob>) {
  update(projectId, (jobs) => jobs.map((job) => (job.id === id ? { ...job, ...patch } : job)));
}

/**
 * Watches every running edit of `projectId` on its generation stream and
 * hands each finished one to `onFinished`, which puts it in the timeline.
 *
 * A job leaves the list once `onFinished` resolves. If it throws (a region
 * composite that failed, say), the job stays, marked failed with the reason,
 * and can be retried — the model's result is already paid for and sitting in
 * the gallery, so only the last step has to run again.
 *
 * `projectId` is null until the editor has restored its project: watching the
 * placeholder project would find nothing, and would then miss the real one.
 */
export function useAiEditJobs(
  projectId: string | null,
  onFinished: (job: AiEditJob, result: GenerationResult) => Promise<void>,
) {
  const jobs = useSyncExternalStore(
    subscribe,
    () => snapshot(projectId),
    () => EMPTY,
  );
  const invalidateCredits = useInvalidateCredits();

  // The newest callback, read when a stream finishes rather than captured
  // when it opened — it closes over the project, which moves on meanwhile.
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  const streamsRef = useRef(new Map<string, EventSource>());

  const running = jobs.filter((job) => job.status === "running").map((job) => job.id);
  const runningKey = running.join("|");

  useEffect(() => {
    if (!projectId) return;
    const streams = streamsRef.current;
    const wanted = new Set(runningKey ? runningKey.split("|") : []);

    for (const [id, source] of streams) {
      if (wanted.has(id)) continue;
      source.close();
      streams.delete(id);
    }

    for (const id of wanted) {
      if (streams.has(id)) continue;
      const source = new EventSource(apiUrl(`/api/generations/${id}/stream`), {
        withCredentials: true,
      });
      streams.set(id, source);

      source.addEventListener("progress", (event) => {
        const data = JSON.parse((event as MessageEvent).data) as { percent?: number };
        if (typeof data.percent === "number") patchJob(projectId, id, { progress: data.percent });
      });
      source.addEventListener("completed", (event) => {
        const data = JSON.parse((event as MessageEvent).data) as {
          resultUrl: string;
          thumbnailUrl?: string | null;
        };
        source.close();
        streams.delete(id);
        const job = snapshot(projectId).find((j) => j.id === id);
        if (!job || job.status !== "running") return;
        patchJob(projectId, id, { status: "applying", progress: 100 });
        onFinishedRef
          .current(job, { resultUrl: data.resultUrl, thumbnailUrl: data.thumbnailUrl ?? null })
          .then(() => update(projectId, (all) => all.filter((j) => j.id !== id)))
          .catch((error: unknown) =>
            patchJob(projectId, id, {
              status: "failed",
              error: error instanceof Error ? error.message : "The edit couldn't be added to your timeline.",
              failedAfterModel: true,
            }),
          );
      });
      source.addEventListener("failed", (event) => {
        const data = JSON.parse((event as MessageEvent).data) as { message?: string };
        source.close();
        streams.delete(id);
        patchJob(projectId, id, { status: "failed", error: data.message ?? "The AI edit failed." });
        // Refunded server-side by now; show it.
        invalidateCredits();
      });
    }
  }, [projectId, runningKey, invalidateCredits]);

  // Every stream closes with the editor; a remount reopens what's running.
  useEffect(() => {
    const streams = streamsRef.current;
    return () => {
      for (const source of streams.values()) source.close();
      streams.clear();
    };
  }, []);

  const addJob = useCallback(
    (job: AiEditJob) => {
      if (projectId) update(projectId, (all) => [...all.filter((j) => j.id !== job.id), job]);
    },
    [projectId],
  );

  const dismissJob = useCallback(
    (id: string) => {
      if (projectId) update(projectId, (all) => all.filter((j) => j.id !== id));
    },
    [projectId],
  );

  /** Runs the last step again for a job that failed after the model was
   *  done. The stream answers a finished row with "completed" straight
   *  away, so putting it back to running is the whole retry. */
  const retryJob = useCallback(
    (id: string) => {
      if (projectId) {
        patchJob(projectId, id, { status: "running", error: undefined, failedAfterModel: undefined });
      }
    },
    [projectId],
  );

  return { jobs, addJob, dismissJob, retryJob };
}
