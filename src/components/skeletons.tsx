/**
 * Page-shaped loading skeletons. Each mirrors the layout of the real page so the
 * switch from skeleton to content doesn't jump. Used by the routes' `loading.tsx`
 * (shown instantly on navigation) and inside pages while their data loads.
 */
import { Card, Skeleton } from "@/components/ui";

export function HeaderSkeleton({ back = false, actions = 1 }: { back?: boolean; actions?: number }) {
  return (
    <div className="mb-8 space-y-3" aria-hidden>
      {back && <Skeleton className="h-4 w-28" />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 max-w-[70vw]" />
          <Skeleton className="h-4 w-80 max-w-[80vw]" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: actions }, (_, i) => (
            <Skeleton key={i} className="h-10 w-32" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="space-y-3 p-4">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="size-8" />
          </div>
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-20" />
        </Card>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="size-10 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-hidden>
      {Array.from({ length: cards }, (_, i) => (
        <Card key={i} className="space-y-4 p-5">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-14 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </Card>
      ))}
    </div>
  );
}

/** Screen-reader announcement that content is loading (skeletons themselves are aria-hidden). */
export function LoadingAnnouncement({ label = "Loading" }: { label?: string }) {
  return (
    <p className="sr-only" role="status" aria-live="polite">
      {label}…
    </p>
  );
}

export function DashboardSkeleton() {
  return (
    <>
      <LoadingAnnouncement label="Loading dashboard" />
      <HeaderSkeleton />
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
    </>
  );
}

export function EpisodeSkeleton() {
  return (
    <div className="mx-auto max-w-3xl">
      <LoadingAnnouncement label="Loading episode" />
      <HeaderSkeleton back actions={0} />
      <div className="space-y-8" aria-hidden>
        <Card className="flex items-center gap-3 p-4">
          <Skeleton className="size-11 shrink-0 rounded-full" />
          <Skeleton className="h-2 flex-1" />
        </Card>
        <Card className="space-y-3 p-6">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className={`h-4 ${i % 3 === 2 ? "w-4/6" : "w-full"}`} />
          ))}
        </Card>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SchedulerDetailSkeleton() {
  return (
    <>
      <LoadingAnnouncement label="Loading schedule" />
      <HeaderSkeleton back actions={3} />
      <div className="space-y-8">
        <StatsSkeleton />
        <ListSkeleton rows={3} />
      </div>
    </>
  );
}

export function FormSkeleton() {
  return (
    <>
      <LoadingAnnouncement label="Loading form" />
      <HeaderSkeleton back actions={0} />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]" aria-hidden>
        <Card className="space-y-6 p-6">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
        </Card>
        <Skeleton className="h-72" />
      </div>
    </>
  );
}

/** Whole-app placeholder (sidebar + page) while the session is checked on a cold load. */
export function AppShellSkeleton() {
  return (
    <div className="min-h-dvh">
      <LoadingAnnouncement label="Loading DailyCast" />
      <div aria-hidden className="fixed inset-y-0 left-0 hidden w-64 space-y-6 border-r border-border bg-surface-sunken p-3 lg:block">
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
      <div className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
          <HeaderSkeleton />
          <ListSkeleton />
        </div>
      </div>
    </div>
  );
}
