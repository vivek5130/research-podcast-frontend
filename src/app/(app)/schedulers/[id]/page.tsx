"use client";

/** Schedule detail: summary, run now, pause/resume, edit, delete, and its episode history. */
import { CalendarClock, CheckCircle2, Clock, Headphones, Pause, Pencil, Play, Trash2, Zap } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { ListSkeleton, SchedulerDetailSkeleton } from "@/components/skeletons";

import { startNavigationProgress } from "@/components/NavigationProgress";
import { RunList } from "@/components/RunList";
import { SchedulerForm, toScheduleFields } from "@/components/SchedulerForm";
import { ActiveBadge, Button, Card, ErrorNote, PageHeader, SectionTitle, StatCard } from "@/components/ui";
import { api, fetcher } from "@/lib/api";
import { formatCountdown, formatDateTime, formatSchedule, formatTotalMinutes, isActiveRun, isFinishedOnce, timezoneLabel } from "@/lib/format";
import type { RunSummary, Scheduler } from "@/lib/types";

export default function SchedulerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const justCreated = useSearchParams().get("created") === "1";
  const scheduler = useSWR<Scheduler>(`/api/schedulers/${id}`, fetcher);
  const runs = useSWR<RunSummary[]>(`/api/schedulers/${id}/runs`, fetcher, {
    refreshInterval: (data) => (data?.some((r) => isActiveRun(r.status)) ? 4000 : 0),
  });
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState<"run" | "toggle" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (scheduler.error) {
    return (
      <>
        <PageHeader back={{ href: "/schedulers", label: "Schedules" }} title="Schedule not found" />
        <ErrorNote message={scheduler.error.status === 404 ? "This schedule doesn't exist or isn't yours." : scheduler.error.message} />
      </>
    );
  }
  const s = scheduler.data;
  if (!s) {
    return <SchedulerDetailSkeleton />;
  }

  async function act(kind: "run" | "toggle" | "delete") {
    setBusy(kind);
    setError(null);
    try {
      if (kind === "run") {
        const run = await api.triggerScheduler(id);
        startNavigationProgress();
        router.push(`/runs/${run.id}`);
        return;
      }
      if (kind === "toggle") {
        await scheduler.mutate(api.updateScheduler(id, { is_active: !s!.is_active }), { revalidate: false });
      } else {
        await api.deleteScheduler(id);
        startNavigationProgress();
        router.replace("/schedulers");
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
    setBusy(null);
  }

  const done = (runs.data ?? []).filter((r) => r.status === "completed");
  const totalSec = done.reduce((n, r) => n + (r.duration_sec ?? 0), 0);

  if (editing) {
    return (
      <>
        <PageHeader back={{ href: `/schedulers/${id}`, label: s.name }} title="Edit schedule" />
        <SchedulerForm
          initial={s}
          submitLabel="Save changes"
          onCancel={() => setEditing(false)}
          onSubmit={async (v) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { run_now, ...schedule } = toScheduleFields(v);
            const updated = await api.updateScheduler(id, {
              name: v.name.trim() || v.topic.slice(0, 80),
              config: { topic: v.topic, duration_seconds: v.duration_seconds, voice: v.voice, language: v.language },
              ...schedule,
            });
            await scheduler.mutate(updated, { revalidate: false });
            setEditing(false);
          }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        back={{ href: "/schedulers", label: "Schedules" }}
        title={<span className="flex flex-wrap items-center gap-3">{s.name} <ActiveBadge active={s.is_active} done={isFinishedOnce(s)} /></span>}
        description={s.config.topic !== s.name ? s.config.topic : undefined}
        actions={
          <>
            <Button onClick={() => act("run")} loading={busy === "run"} disabled={busy !== null}>
              {busy !== "run" && <Zap className="size-4" aria-hidden />} Run now
            </Button>
            {!isFinishedOnce(s) && (
              <Button variant="secondary" onClick={() => act("toggle")} loading={busy === "toggle"} disabled={busy !== null}>
                {busy !== "toggle" && (s.is_active ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />)}
                {s.is_active ? "Pause" : "Resume"}
              </Button>
            )}
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil className="size-4" aria-hidden /> Edit
            </Button>
          </>
        }
      />

      <div className="space-y-8">
        {justCreated && (
          <p className="flex items-center gap-2 rounded-xl border border-accent/40 bg-accent-soft px-4 py-3 text-sm text-accent-text" role="status">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden />
            Schedule created. Press “Run now” to hear your first episode in about a minute.
          </p>
        )}
        <ErrorNote message={error} />

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Schedule"
            value={<span className="text-lg leading-tight">{formatSchedule(s)}</span>}
            hint={timezoneLabel(s.timezone)}
            icon={<Clock className="size-4" aria-hidden />}
          />
          <StatCard
            label="Next episode"
            value={isFinishedOnce(s) ? "Done" : s.is_active ? formatCountdown(s.next_run_at).replace(/^in /, "") : "Paused"}
            hint={isFinishedOnce(s) ? `Ran ${formatDateTime(s.next_run_at)}` : s.is_active ? formatDateTime(s.next_run_at) : "Resume to schedule"}
            icon={<CalendarClock className="size-4" aria-hidden />}
          />
          <StatCard label="Episodes" value={done.length} hint={`${(runs.data ?? []).length} runs total`} icon={<Headphones className="size-4" aria-hidden />} />
          <StatCard label="Listening time" value={formatTotalMinutes(totalSec)} hint="All episodes" icon={<Play className="size-4" aria-hidden />} />
        </section>

        <section>
          <SectionTitle>Episodes</SectionTitle>
          {runs.data ? <RunList runs={runs.data} showScheduler={false} /> : <ListSkeleton rows={3} />}
        </section>

        <Card className="flex flex-wrap items-center justify-between gap-4 border-danger/30 p-5">
          <div>
            <h2 className="font-semibold">Delete schedule</h2>
            <p className="text-sm text-muted">Removes this schedule and all {(runs.data ?? []).length} of its episodes. This can&apos;t be undone.</p>
          </div>
          {confirmDelete ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={busy === "delete"}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => act("delete")} loading={busy === "delete"}>
                Yes, delete
              </Button>
            </div>
          ) : (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" aria-hidden /> Delete
            </Button>
          )}
        </Card>
      </div>
    </>
  );
}
