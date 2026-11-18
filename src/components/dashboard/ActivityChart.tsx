"use client";

/**
 * Episodes per day for the last 7 days (completed vs failed), as simple CSS bars.
 * Counts are printed above each bar and in the accessible label, so color is
 * never the only carrier of meaning.
 */
import { Card } from "@/components/ui";
import type { RunSummary } from "@/lib/types";

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function ActivityChart({ runs }: { runs: RunSummary[] }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const counts = days.map((d) => {
    const key = dayKey(d);
    const sameDay = runs.filter((r) => dayKey(new Date(r.scheduled_for)) === key);
    return {
      date: d,
      completed: sameDay.filter((r) => r.status === "completed").length,
      failed: sameDay.filter((r) => r.status === "failed").length,
    };
  });
  const max = Math.max(1, ...counts.map((c) => c.completed + c.failed));
  const total = counts.reduce((n, c) => n + c.completed, 0);

  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">Last 7 days</h2>
        <span className="text-sm text-muted">{total} episodes delivered</span>
      </div>
      <div className="mt-5 grid h-36 grid-cols-7 items-end gap-2" role="list" aria-label="Episodes per day">
        {counts.map(({ date, completed, failed }) => {
          const label = date.toLocaleDateString([], { weekday: "short" });
          const isToday = dayKey(date) === dayKey(new Date());
          return (
            <div
              key={label + date.getDate()}
              role="listitem"
              aria-label={`${label}: ${completed} delivered${failed ? `, ${failed} failed` : ""}`}
              className="flex h-full flex-col items-center justify-end gap-1.5"
            >
              <span className="text-xs tabular-nums text-muted">{completed + failed || ""}</span>
              <div className="flex w-full max-w-9 flex-col overflow-hidden rounded-md">
                {failed > 0 && <div className="bg-danger/70" style={{ height: `${(failed / max) * 88}px` }} />}
                <div
                  className={completed ? "bg-accent" : "bg-surface-muted"}
                  style={{ height: completed ? `${(completed / max) * 88}px` : "4px" }}
                />
              </div>
              <span className={`text-xs ${isToday ? "font-semibold text-foreground" : "text-muted"}`}>{label}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-accent" aria-hidden /> Delivered</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-danger/70" aria-hidden /> Failed</span>
      </div>
    </Card>
  );
}
