"use client";

/**
 * Shown on a failed episode: which stage failed, after how many attempts, the
 * error, and a Retry button that resumes from the failed stage (earlier stages'
 * output is reused, so e.g. a failed audio step doesn't redo the research).
 */
import { RotateCcw } from "lucide-react";
import { useState } from "react";

import { Button, ErrorNote } from "@/components/ui";
import { api } from "@/lib/api";
import type { RunDetail } from "@/lib/types";

const STAGE_LABELS: Record<string, string> = {
  research: "Research & script",
  synthesize: "Voice (Gnani TTS)",
};

export function RetryPanel({ run, onRetried }: { run: RunDetail; onRetried: (run: RunDetail) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stage = STAGE_LABELS[run.stage ?? ""] ?? "a step";

  async function retry() {
    setBusy(true);
    setError(null);
    try {
      onRetried(await api.retryRun(run.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Retry failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <ErrorNote message={run.error ?? "Generation failed."} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Failed at <span className="font-medium text-foreground">{stage}</span>
          {run.attempts > 0 && ` after ${run.attempts} attempt${run.attempts === 1 ? "" : "s"}`}
          {run.retry_count > 0 && ` · retried ${run.retry_count}×`}. Retrying resumes from this step
          {run.stage === "synthesize" ? " and reuses the script already written." : "."}
        </p>
        <Button onClick={retry} loading={busy}>
          {!busy && <RotateCcw className="size-4" aria-hidden />} Retry
        </Button>
      </div>
      <ErrorNote message={error} />
    </div>
  );
}
