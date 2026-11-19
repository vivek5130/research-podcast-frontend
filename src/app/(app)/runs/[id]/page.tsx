"use client";

/**
 * Episode page: live progress while generating, then the player with live script highlighting
 * (audio + highlighted script), sources and telemetry. This is the page the
 * "podcast ready" email links to.
 */
import { CalendarClock, Check, Clock, ExternalLink, FileText, Loader2, X, Zap } from "lucide-react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { EpisodeSkeleton } from "@/components/skeletons";

import { EpisodePlayer } from "@/components/EpisodePlayer";
import { QualityPanel } from "@/components/QualityPanel";
import { RetryPanel } from "@/components/RetryPanel";
import { RunTraces } from "@/components/RunTraces";
import { Card, cx, ErrorNote, PageHeader, RunStatusBadge, SectionTitle } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { describeRun, formatDateTime, formatDuration, isActiveRun } from "@/lib/format";
import type { RunDetail } from "@/lib/types";

const STEPS = [
  { key: "queued", label: "Queued", detail: "Waiting for a worker" },
  { key: "research", label: "Research & script", detail: "Searching news, writing the script" },
  { key: "synthesize", label: "Voice", detail: "Gnani.ai text-to-speech" },
  { key: "ready", label: "Ready", detail: "Saved & emailed" },
];

function stepIndex(run: RunDetail): number {
  if (run.status === "completed") return 3;
  if (run.status === "pending") return 0;
  return run.stage === "synthesize" ? 2 : 1;
}

function Progress({ run }: { run: RunDetail }) {
  const current = stepIndex(run);
  const failed = run.status === "failed";
  return (
    <ol className="grid grid-cols-1 gap-3 sm:grid-cols-4">
      {STEPS.map((step, i) => {
        const done = i < current || run.status === "completed";
        const active = i === current && !failed && run.status !== "completed";
        const errored = failed && i === current;
        return (
          <li key={step.key} className="flex gap-3 sm:block">
            <span
              className={cx(
                "grid size-8 shrink-0 place-items-center rounded-full border text-xs font-semibold sm:mb-2",
                errored && "border-danger bg-danger-soft text-danger",
                done && "border-accent bg-accent text-accent-foreground",
                active && "border-warning bg-warning-soft text-warning",
                !done && !active && !errored && "border-border text-subtle",
              )}
              aria-hidden
            >
              {errored ? <X className="size-4" /> : done ? <Check className="size-4" /> : active ? <Loader2 className="size-4 animate-spin" /> : i + 1}
            </span>
            <div>
              <p className={cx("text-sm font-medium", !done && !active && !errored && "text-muted")}>{step.label}</p>
              <p className="text-xs text-muted">{step.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function RunPage() {
  const { id } = useParams<{ id: string }>();
  const { data: run, error, mutate } = useSWR<RunDetail>(`/api/runs/${id}`, fetcher, {
    refreshInterval: (d) => (d && isActiveRun(d.status) ? 3000 : 0),
  });

  if (error) {
    return (
      <>
        <PageHeader back={{ href: "/runs", label: "Episodes" }} title="Episode not found" />
        <ErrorNote message={error.status === 404 ? "This episode doesn't exist or isn't yours." : error.message} />
      </>
    );
  }
  if (!run) {
    return <EpisodeSkeleton />;
  }

  const out = run.output;
  return (
    <article className="mx-auto max-w-3xl">
      <PageHeader
        back={{ href: `/schedulers/${run.scheduler_id}`, label: run.scheduler_name }}
        title={out.title ?? run.scheduler_name}
        description={
          <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
            <RunStatusBadge run={run} />
            <span className="inline-flex items-center gap-1.5"><CalendarClock className="size-4" aria-hidden />{formatDateTime(run.scheduled_for)}</span>
            {out.duration_sec ? <span className="inline-flex items-center gap-1.5"><Clock className="size-4" aria-hidden />{formatDuration(out.duration_sec)}</span> : null}
            {run.trigger === "manual" && <span className="inline-flex items-center gap-1.5"><Zap className="size-4" aria-hidden />Run now</span>}
          </span>
        }
      />

      <div className="space-y-8">
        {run.status !== "completed" && (
          <Card className="space-y-5 p-5">
            <Progress run={run} />
            {run.status === "failed" ? (
              <RetryPanel run={run} onRetried={(r) => mutate(r, { revalidate: true })} />
            ) : (
              <p className="text-sm text-muted" role="status" aria-live="polite">
                {describeRun(run)}… usually 1–2 minutes. You can leave this page; we&apos;ll email you when it&apos;s ready.
              </p>
            )}
          </Card>
        )}

        {out.audio_error && <ErrorNote message={`Audio unavailable: ${out.audio_error}`} />}
        {(out.audio_url || out.script) && (
          <EpisodePlayer
            audioUrl={out.audio_url}
            script={out.script}
            timings={out.timings}
            duration={out.duration_sec}
            wordCount={out.word_count}
          />
        )}
        {out.voice && (
          <p className="-mt-4 text-xs text-muted">
            Voiced by Gnani.ai · {out.voice}
            {out.language && out.language !== "en-IN" ? ` · ${out.language}` : ""}
          </p>
        )}

        {out.sources && out.sources.length > 0 && (
          <section>
            <SectionTitle>Sources ({out.sources.length})</SectionTitle>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {out.sources.map((src) => (
                <li key={src.url}>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex h-full gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-border-strong hover:bg-surface-muted"
                  >
                    <FileText className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-sm font-medium group-hover:underline">{src.title}</span>
                      <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
                        {new URL(src.url).hostname.replace(/^www\./, "")}
                        <ExternalLink className="size-3" aria-hidden />
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <QualityPanel evaluation={out.evaluation} guardrails={out.guardrails} />

        <RunTraces runId={run.id} live={isActiveRun(run.status)} />
      </div>
    </article>
  );
}
