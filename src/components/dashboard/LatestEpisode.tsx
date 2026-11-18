"use client";

/** Spotlight for the newest completed episode with an inline player. */
import { ArrowRight, Clock, FileText, Headphones } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";

import { Card, Skeleton } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { formatDateTime, formatDuration } from "@/lib/format";
import type { RunDetail, RunSummary } from "@/lib/types";

export function LatestEpisode({ run }: { run: RunSummary }) {
  const { data } = useSWR<RunDetail>(`/api/runs/${run.id}`, fetcher, { revalidateOnFocus: false });

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-accent-text">
        <Headphones className="size-4" aria-hidden /> Latest episode
      </div>
      <Link href={`/runs/${run.id}`} className="mt-2 hover:underline">
        <h2 className="line-clamp-2 text-xl font-semibold">{run.title ?? run.scheduler_name}</h2>
      </Link>
      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
        <span>{formatDateTime(run.scheduled_for)}</span>
        {run.duration_sec ? (
          <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden /> {formatDuration(run.duration_sec)}</span>
        ) : null}
        {data?.output.sources && (
          <span className="inline-flex items-center gap-1"><FileText className="size-3.5" aria-hidden /> {data.output.sources.length} sources</span>
        )}
      </p>
      <div className="mt-4">
        {data?.output.audio_url ? (
          <audio controls preload="none" src={data.output.audio_url} aria-label={`Play ${run.title ?? "episode"}`} />
        ) : (
          <Skeleton className="h-12" />
        )}
      </div>
      <Link href={`/runs/${run.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-text hover:underline">
        Read script & sources <ArrowRight className="size-4" aria-hidden />
      </Link>
    </Card>
  );
}
