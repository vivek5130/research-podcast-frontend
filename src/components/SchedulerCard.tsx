"use client";

/** One scheduler: schedule summary, next delivery, run now, pause/resume. */
import { CalendarClock, ChevronRight, Pause, Play, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { startNavigationProgress } from "@/components/NavigationProgress";
import { ActiveBadge, Button, Card } from "@/components/ui";
import { api } from "@/lib/api";
import { formatCountdown, formatEpisodeLength, formatSchedule, isFinishedOnce, timezoneLabel } from "@/lib/format";
import type { Scheduler } from "@/lib/types";

export function SchedulerCard({ scheduler, onChanged }: { scheduler: Scheduler; onChanged: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"toggle" | "run" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(kind: "toggle" | "run") {
    setBusy(kind);
    setError(null);
    try {
      if (kind === "toggle") {
        await api.updateScheduler(scheduler.id, { is_active: !scheduler.is_active });
        onChanged();
      } else {
        const run = await api.triggerScheduler(scheduler.id);
        startNavigationProgress();
        router.push(`/runs/${run.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  const topic = scheduler.config.topic;
  const done = isFinishedOnce(scheduler);
  return (
    <Card className="flex min-w-0 flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/schedulers/${scheduler.id}`} className="group min-w-0">
          <h3 className="truncate text-[17px] font-semibold group-hover:underline">{scheduler.name}</h3>
        </Link>
        <ActiveBadge active={scheduler.is_active} done={done} />
      </div>
      {topic !== scheduler.name && <p className="mt-1 line-clamp-2 text-sm text-muted">{topic}</p>}

      <div className="mt-4 flex items-center gap-3 rounded-lg bg-surface-muted px-3 py-2.5">
        <CalendarClock className="size-[18px] shrink-0 text-muted" aria-hidden />
        <div className="min-w-0 text-sm">
          <p>
            <span className="font-semibold">{formatSchedule(scheduler)}</span>{" "}
            <span className="text-muted">· {formatEpisodeLength(scheduler.config.duration_seconds)} · {scheduler.config.voice ?? "Shivani"} · {timezoneLabel(scheduler.timezone)}</span>
          </p>
          <p className="text-[13px] text-muted">
            {done
              ? "One-time episode already generated"
              : scheduler.is_active
                ? `Next episode ${formatCountdown(scheduler.next_run_at)}`
                : "Paused: no episodes will be sent"}
          </p>
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-4 flex items-center gap-2">
        <Button size="sm" onClick={() => act("run")} loading={busy === "run"} disabled={busy !== null}>
          {busy !== "run" && <Zap className="size-4" aria-hidden />} Run now
        </Button>
        {!done && (
          <Button size="sm" variant="secondary" onClick={() => act("toggle")} loading={busy === "toggle"} disabled={busy !== null}>
            {busy !== "toggle" &&
              (scheduler.is_active ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />)}
            {scheduler.is_active ? "Pause" : "Resume"}
          </Button>
        )}
        <Link
          href={`/schedulers/${scheduler.id}`}
          className="ml-auto inline-flex items-center gap-0.5 text-sm text-muted hover:text-foreground"
        >
          Details <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
    </Card>
  );
}
