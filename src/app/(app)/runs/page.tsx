"use client";

/** All episodes across schedules, filterable by status. */
import { Plus } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { ListSkeleton } from "@/components/skeletons";

import { RunList } from "@/components/RunList";
import { ButtonLink, cx, ErrorNote, PageHeader } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { isActiveRun } from "@/lib/format";
import type { RunSummary } from "@/lib/types";

type Filter = "all" | "completed" | "in-progress" | "failed";
const LABELS: Record<Filter, string> = { all: "All", completed: "Ready", "in-progress": "In progress", failed: "Failed" };

const matches = (r: RunSummary, f: Filter) =>
  f === "all" ? true : f === "in-progress" ? isActiveRun(r.status) : r.status === f;

export default function RunsPage() {
  const { data, error } = useSWR<RunSummary[]>("/api/runs?limit=100", fetcher, {
    refreshInterval: (d) => (d?.some((r) => isActiveRun(r.status)) ? 4000 : 0),
  });
  const [filter, setFilter] = useState<Filter>("all");

  return (
    <>
      <PageHeader title="Episodes" description="Every podcast generated for you, newest first." />
      <ErrorNote message={error?.message} />

      {data && data.length > 0 && (
        <div role="tablist" aria-label="Filter episodes" className="mb-5 inline-flex flex-wrap rounded-lg bg-surface-muted p-1">
          {(Object.keys(LABELS) as Filter[]).map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={cx(
                "h-8 cursor-pointer rounded-md px-3 text-sm font-medium transition-colors",
                filter === f ? "bg-surface text-foreground shadow-card" : "text-muted hover:text-foreground",
              )}
            >
              {LABELS[f]} <span className="ml-1 tabular-nums text-subtle">{data.filter((r) => matches(r, f)).length}</span>
            </button>
          ))}
        </div>
      )}

      {data ? (
        <RunList
          runs={data.filter((r) => matches(r, filter))}
          emptyAction={
            <ButtonLink href="/schedulers/new">
              <Plus className="size-4" aria-hidden /> Create a podcast
            </ButtonLink>
          }
        />
      ) : (
        <ListSkeleton rows={6} />
      )}
    </>
  );
}
