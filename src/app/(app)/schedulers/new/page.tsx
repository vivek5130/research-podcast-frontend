"use client";

/** Create a podcast schedule: once (now or at a time), daily, weekly or monthly. */
import { useRouter } from "next/navigation";

import { startNavigationProgress } from "@/components/NavigationProgress";
import { SchedulerForm, toScheduleFields } from "@/components/SchedulerForm";
import { PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

export default function NewSchedulerPage() {
  const router = useRouter();
  return (
    <>
      <PageHeader
        back={{ href: "/schedulers", label: "Schedules" }}
        title="New podcast"
        description="Pick a topic and when it should run: once, daily, weekly or monthly."
      />
      <SchedulerForm
        submitLabel="Create schedule"
        onCancel={() => router.back()}
        onSubmit={async (v) => {
          const created = await api.createScheduler({
            type: "podcast",
            name: v.name.trim() || undefined,
            config: { topic: v.topic, duration_seconds: v.duration_seconds, voice: v.voice, language: v.language },
            ...toScheduleFields(v),
          });
          // "Once, right now" starts a run immediately: go straight to its live progress.
          startNavigationProgress();
          router.push(created.triggered_run_id ? `/runs/${created.triggered_run_id}` : `/schedulers/${created.id}?created=1`);
        }}
      />
    </>
  );
}
