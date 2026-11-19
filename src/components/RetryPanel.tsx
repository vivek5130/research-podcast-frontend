"use client";

/**
 * Shown on a failed episode: which stage failed, after how many attempts, the
 * error, and a Retry button that resumes from the failed stage (earlier stages'
 * output is reused, so e.g. a failed audio step doesn't redo the research).
 *
 * Content-policy failures are different: the topic itself was blocked, so a retry
 * would fail the same way. Those show the reason and an "Edit topic" link instead.
 */
import { Pencil, RotateCcw, ShieldAlert } from "lucide-react";
import { useState } from "react";

import { Button, ButtonLink, ErrorNote } from "@/components/ui";
import { api } from "@/lib/api";
import type { RunDetail } from "@/lib/types";

const STAGE_LABELS: Record<string, string> = {
  research: "Research & script",
  synthesize: "Voice (Gnani TTS)",
};

const isPolicyBlock = (error: string | null) => !!error && error.startsWith("Blocked by content policy");

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

  if (isPolicyBlock(run.error)) {
    return (
      <div className="space-y-3">
        <div role="alert" className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{run.error}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">Retrying won&apos;t help: change the topic, then run it again.</p>
          <ButtonLink href={`/schedulers/${run.scheduler_id}`}>
            <Pencil className="size-4" aria-hidden /> Edit topic
          </ButtonLink>
        </div>
      </div>
    );
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
