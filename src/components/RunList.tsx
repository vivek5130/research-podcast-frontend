"use client";

/** List of runs (episodes) linking to their player pages. */
import { ChevronRight, Clock, Headphones, Zap } from "lucide-react";
import Link from "next/link";
import { preload } from "swr";

import { EmptyState, RunStatusBadge } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { formatDateTime, formatDuration } from "@/lib/format";
import type { RunSummary } from "@/lib/types";

export function RunList({
  runs,
  showScheduler = true,
  emptyAction,
}: {
  runs: RunSummary[];
  showScheduler?: boolean;
  emptyAction?: React.ReactNode;
}) {
  if (runs.length === 0) {
    return (
      <EmptyState icon={<Headphones className="size-5" aria-hidden />} title="No episodes yet" action={emptyAction}>
        Episodes appear here after each scheduled delivery. Use “Run now” to generate one immediately.
      </EmptyState>
    );
  }
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      {runs.map((run) => (
        <li key={run.id}>
          <Link
            href={`/runs/${run.id}`}
            // Start fetching the episode while the pointer is on its way: the page is usually ready on click.
            onMouseEnter={() => preload(`/api/runs/${run.id}`, fetcher)}
            onFocus={() => preload(`/api/runs/${run.id}`, fetcher)}
            className="group flex min-h-16 items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-muted"
          >
            <span
              className={`grid size-10 shrink-0 place-items-center rounded-lg ${
                run.status === "completed" ? "bg-accent-soft text-accent-text" : "bg-surface-muted text-muted"
              }`}
            >
              <Headphones className="size-[18px]" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{run.title ?? run.scheduler_name}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-muted">
                {showScheduler && run.title && <span className="truncate">{run.scheduler_name}</span>}
                <span>{formatDateTime(run.scheduled_for)}</span>
                {run.duration_sec ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" aria-hidden />
                    {formatDuration(run.duration_sec)}
                  </span>
                ) : null}
                {run.trigger === "manual" && (
                  <span className="inline-flex items-center gap-1">
                    <Zap className="size-3.5" aria-hidden /> Run now
                  </span>
                )}
              </p>
            </div>
            <RunStatusBadge run={run} />
            <ChevronRight className="hidden size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 sm:block" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
