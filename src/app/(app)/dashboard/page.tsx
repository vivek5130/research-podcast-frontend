"use client";

/**
 * Home: at-a-glance stats, the next delivery, the latest episode with a player,
 * a 7-day activity chart, upcoming deliveries and recent episodes. New users get
 * a short onboarding instead of empty widgets.
 */
import { ListSkeleton, StatsSkeleton } from "@/components/skeletons";
import {
  ArrowRight,
  AudioLines,
  CalendarClock,
  CheckCircle2,
  Clock,
  Headphones,
  Loader2,
  Mail,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import useSWR from "swr";

import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { InsightsPanel } from "@/components/dashboard/InsightsPanel";
import { LatestEpisode } from "@/components/dashboard/LatestEpisode";
import { RunList } from "@/components/RunList";
import { useUser } from "@/components/SessionProvider";
import { ButtonLink, Card, ErrorNote, PageHeader, SectionTitle, Skeleton, StatCard } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { formatCountdown, formatDateTime, formatSchedule, formatTotalMinutes, greeting, isActiveRun } from "@/lib/format";
import type { RunSummary, Scheduler } from "@/lib/types";

const WEEK_MS = 7 * 24 * 3600 * 1000;

function Onboarding() {
  const steps = [
    { Icon: Search, title: "Pick a topic", text: "Anything from “startup funding today” to “Indian markets”." },
    { Icon: CalendarClock, title: "Choose a time", text: "Once, daily, weekly or monthly. Each episode is researched fresh." },
    { Icon: Mail, title: "Listen", text: "A 15-second to 10-minute podcast lands in your inbox, voiced by Gnani.ai." },
  ];
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-1 gap-8 p-6 md:grid-cols-[1.1fr_1fr] md:p-8">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-text">
            <Sparkles className="size-3.5" aria-hidden /> Get started
          </span>
          <h2 className="mt-3 text-2xl font-semibold">Create your first podcast</h2>
          <p className="mt-2 text-muted">
            An AI agent researches today&apos;s news on your topic, writes a five-minute script and turns it into audio.
          </p>
          <ButtonLink href="/schedulers/new" size="lg" className="mt-6">
            <Plus className="size-4" aria-hidden /> Create a podcast
          </ButtonLink>
        </div>
        <ol className="space-y-4">
          {steps.map(({ Icon, title, text }, i) => (
            <li key={title} className="flex gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-muted">
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <div>
                <p className="font-medium">
                  {i + 1}. {title}
                </p>
                <p className="text-sm text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}

function NextUp({ schedulers }: { schedulers: Scheduler[] }) {
  const upcoming = schedulers
    .filter((s) => s.is_active)
    .sort((a, b) => +new Date(a.next_run_at) - +new Date(b.next_run_at));
  const next = upcoming[0];
  return (
    <Card inverted className="flex flex-col p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider opacity-70">
        <CalendarClock className="size-4" aria-hidden /> Next episode
      </div>
      {next ? (
        <>
          <p className="mt-3 font-display text-3xl font-semibold">{formatCountdown(next.next_run_at)}</p>
          <p className="mt-1 line-clamp-2 opacity-80">{next.name}</p>
          <p className="mt-0.5 text-sm opacity-60">{formatSchedule(next)}</p>
          <p className="mt-1 text-sm opacity-60">{formatDateTime(next.next_run_at)}</p>
          {upcoming.length > 1 && (
            <ul className="mt-4 space-y-2 border-t border-background/15 pt-4 text-sm">
              {upcoming.slice(1, 4).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3">
                  <Link href={`/schedulers/${s.id}`} className="truncate opacity-80 hover:underline">
                    {s.name}
                  </Link>
                  <span className="shrink-0 opacity-60">{formatSchedule(s)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <p className="mt-3 font-display text-2xl font-semibold">Nothing scheduled</p>
          <p className="mt-1 text-sm opacity-70">No active schedules. Create one or resume a paused one.</p>
          <Link href="/schedulers" className="mt-4 inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline">
            Manage schedules <ArrowRight className="size-4" aria-hidden />
          </Link>
        </>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const user = useUser();
  const schedulers = useSWR<Scheduler[]>("/api/schedulers", fetcher);
  const runs = useSWR<RunSummary[]>("/api/runs?limit=100", fetcher, {
    refreshInterval: (data) => (data?.some((r) => isActiveRun(r.status)) ? 4000 : 0),
  });

  const firstName = user.name?.split(" ")[0] ?? user.email.split("@")[0];
  const loading = !schedulers.data || !runs.data;
  const allRuns = runs.data ?? [];
  const completed = allRuns.filter((r) => r.status === "completed");
  const failed = allRuns.filter((r) => r.status === "failed");
  const inProgress = allRuns.filter((r) => isActiveRun(r.status));
  const thisWeek = completed.filter((r) => Date.now() - +new Date(r.scheduled_for) < WEEK_MS);
  const totalSec = completed.reduce((n, r) => n + (r.duration_sec ?? 0), 0);
  const finished = completed.length + failed.length;
  const activeCount = schedulers.data?.filter((s) => s.is_active).length ?? 0;
  const isNewUser = schedulers.data?.length === 0 && allRuns.length === 0;

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description="Here’s what’s happening with your podcasts."
        actions={
          !isNewUser && (
            <ButtonLink href="/schedulers/new">
              <Plus className="size-4" aria-hidden /> New podcast
            </ButtonLink>
          )
        }
      />

      <ErrorNote message={schedulers.error?.message ?? runs.error?.message} />

      {loading ? (
        <div className="space-y-8">
          <StatsSkeleton />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Skeleton className="h-56" />
            <Skeleton className="h-56 lg:col-span-2" />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ListSkeleton rows={4} />
            </div>
            <Skeleton className="h-64" />
          </div>
        </div>
      ) : isNewUser ? (
        <Onboarding />
      ) : (
        <div className="space-y-8">
          {inProgress.length > 0 && (
            <Link
              href={`/runs/${inProgress[0].id}`}
              className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning hover:underline"
            >
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
              <span className="flex-1">
                {inProgress.length === 1 ? "An episode is" : `${inProgress.length} episodes are`} being generated now.
              </span>
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}

          <section aria-label="Statistics" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Active schedules"
              value={activeCount}
              hint={`${schedulers.data!.length} total`}
              icon={<CalendarClock className="size-4" aria-hidden />}
            />
            <StatCard
              label="Episodes this week"
              value={thisWeek.length}
              hint={`${completed.length} all time`}
              icon={<Headphones className="size-4" aria-hidden />}
            />
            <StatCard
              label="Listening time"
              value={formatTotalMinutes(totalSec)}
              hint="Across all episodes"
              icon={<Clock className="size-4" aria-hidden />}
            />
            <StatCard
              label="Success rate"
              value={finished ? `${Math.round((completed.length / finished) * 100)}%` : "—"}
              hint={failed.length ? `${failed.length} failed` : "No failures"}
              icon={<CheckCircle2 className="size-4" aria-hidden />}
            />
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <NextUp schedulers={schedulers.data!} />
            <div className="lg:col-span-2">
              {completed[0] ? (
                <LatestEpisode run={completed[0]} />
              ) : (
                <Card className="flex h-full flex-col items-center justify-center p-8 text-center">
                  <AudioLines className="size-8 text-muted" aria-hidden />
                  <p className="mt-3 font-medium">Your first episode is on its way</p>
                  <p className="mt-1 text-sm text-muted">Open a schedule and press “Run now” to hear it right away.</p>
                </Card>
              )}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionTitle
                action={
                  <Link href="/runs" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
                    View all <ArrowRight className="size-4" aria-hidden />
                  </Link>
                }
              >
                Recent episodes
              </SectionTitle>
              <RunList runs={allRuns.slice(0, 5)} />
            </div>
            <div>
              <SectionTitle>Activity</SectionTitle>
              <ActivityChart runs={allRuns} />
            </div>
          </section>

          <InsightsPanel />
        </div>
      )}
    </>
  );
}
