"use client";

/** All of the user's schedules, filterable by state (active / paused / done one-time). */
import { CalendarClock, Plus } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { CardGridSkeleton } from "@/components/skeletons";

import { SchedulerCard } from "@/components/SchedulerCard";
import { ButtonLink, cx, EmptyState, ErrorNote, PageHeader } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { isFinishedOnce } from "@/lib/format";
import type { Scheduler } from "@/lib/types";

type Filter = "all" | "active" | "paused" | "done";

const matches = (s: Scheduler, f: Filter) =>
  f === "all" ? true : f === "done" ? isFinishedOnce(s) : f === "active" ? s.is_active : !s.is_active && !isFinishedOnce(s);

export default function SchedulersPage() {
  const { data, error, mutate } = useSWR<Scheduler[]>("/api/schedulers", fetcher);
  const [filter, setFilter] = useState<Filter>("all");

  const list = (data ?? []).filter((s) => matches(s, filter));
  const count = (f: Filter) => (data ?? []).filter((s) => matches(s, f)).length;

  return (
    <>
      <PageHeader
        title="Schedules"
        description="One-time, daily, weekly and monthly podcasts. Each run researches fresh news."
        actions={
          <ButtonLink href="/schedulers/new">
            <Plus className="size-4" aria-hidden /> New podcast
          </ButtonLink>
        }
      />
      <ErrorNote message={error?.message} />

      {data && data.length > 0 && (
        <div role="tablist" aria-label="Filter schedules" className="mb-5 inline-flex rounded-lg bg-surface-muted p-1">
          {(["all", "active", "paused", "done"] as Filter[]).map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={cx(
                "h-8 cursor-pointer rounded-md px-3 text-sm font-medium capitalize transition-colors",
                filter === f ? "bg-surface text-foreground shadow-card" : "text-muted hover:text-foreground",
              )}
            >
              {f} <span className="ml-1 tabular-nums text-subtle">{count(f)}</span>
            </button>
          ))}
        </div>
      )}

      {!data ? (
        <CardGridSkeleton cards={2} />
      ) : list.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {list.map((s) => (
            <SchedulerCard key={s.id} scheduler={s} onChanged={() => mutate()} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarClock className="size-5" aria-hidden />}
          title={data.length ? `No ${filter} schedules` : "No schedules yet"}
          action={
            !data.length && (
              <ButtonLink href="/schedulers/new">
                <Plus className="size-4" aria-hidden /> Create your first podcast
              </ButtonLink>
            )
          }
        >
          {data.length ? "Try a different filter." : "Create a schedule and your first episode can be ready in about a minute."}
        </EmptyState>
      )}
    </>
  );
}
