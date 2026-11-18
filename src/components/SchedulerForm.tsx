"use client";

/**
 * Create/edit form for a podcast schedule.
 *
 * Sections: topic → when (once / daily / weekly / monthly) → name. The "when"
 * options adapt to the chosen frequency: one-time can start right now or on a
 * picked date & time; weekly picks weekdays; monthly picks a day of the month.
 * A live preview asks the API for the next run times, so what the user sees is
 * computed by the exact rule the scheduler uses.
 */
import { CalendarClock, CalendarDays, Clock, Headphones, Lightbulb, Mail, Mic, Repeat, Sparkles, Timer, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button, Card, cx, ErrorNote, Field, Input, Select, Textarea } from "@/components/ui";
import { VoicePicker } from "@/components/VoicePicker";
import { api } from "@/lib/api";
import {
  browserTimezone,
  DEFAULT_DURATION,
  DURATIONS,
  formatEpisodeLength,
  formatCountdown,
  formatDateTime,
  formatRunTime,
  formatSchedule,
  ordinal,
  timezoneLabel,
  timezoneOptions,
  todayIn,
  WEEKDAYS,
  WEEKDAYS_LONG,
} from "@/lib/format";
import type { Frequency, ScheduleFields, SchedulePreview, Scheduler } from "@/lib/types";

export interface SchedulerFormValues {
  name: string;
  topic: string;
  duration_seconds: number; // episode length
  voice: string; // Gnani voice name
  language: string; // e.g. en-IN
  frequency: Frequency;
  run_now: boolean; // once: start immediately
  run_time: string; // "HH:MM"
  run_date: string; // "YYYY-MM-DD" (once)
  days_of_week: number[]; // weekly
  day_of_month: number; // monthly
  timezone: string;
}

/** Only the fields that apply to the chosen frequency, in API shape. */
export function toScheduleFields(v: SchedulerFormValues): ScheduleFields {
  if (v.frequency === "once" && v.run_now) return { frequency: "once", run_now: true, timezone: v.timezone };
  return {
    frequency: v.frequency,
    run_time: v.run_time,
    timezone: v.timezone,
    run_date: v.frequency === "once" ? v.run_date : null,
    days_of_week: v.frequency === "weekly" ? v.days_of_week : null,
    day_of_month: v.frequency === "monthly" ? v.day_of_month : null,
  };
}

const TOPIC_MAX = 500;
const EXAMPLES = [
  "Find all startup funding announced in the last 24 hours",
  "Latest AI model releases and research breakthroughs",
  "Indian stock market and economy news today",
  "Climate and clean-energy policy updates worldwide",
];
const TIME_PRESETS = ["07:00", "08:00", "12:30", "18:00", "21:00"];
const FREQUENCIES: { value: Frequency; label: string; hint: string; Icon: typeof Clock }[] = [
  { value: "once", label: "Once", hint: "A single episode", Icon: Zap },
  { value: "daily", label: "Daily", hint: "Every day", Icon: Repeat },
  { value: "weekly", label: "Weekly", hint: "Chosen weekdays", Icon: CalendarDays },
  { value: "monthly", label: "Monthly", hint: "One day a month", Icon: CalendarClock },
];

type Errors = Partial<Record<"topic" | "run_time" | "run_date" | "days_of_week", string>>;

function validate(v: SchedulerFormValues): Errors {
  const e: Errors = {};
  const topic = v.topic.trim();
  if (!topic) e.topic = "Tell us what the podcast should cover.";
  else if (topic.length < 3) e.topic = "Use at least 3 characters.";
  else if (topic.length > TOPIC_MAX) e.topic = `Keep it under ${TOPIC_MAX} characters.`;
  const needsTime = !(v.frequency === "once" && v.run_now);
  if (needsTime && !/^\d{2}:\d{2}$/.test(v.run_time)) e.run_time = "Pick a delivery time.";
  if (v.frequency === "once" && !v.run_now && !v.run_date) e.run_date = "Pick a date.";
  if (v.frequency === "weekly" && v.days_of_week.length === 0) e.days_of_week = "Pick at least one day.";
  return e;
}

function Section({ step, title, icon, children }: { step: number; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="flex items-center gap-2.5 font-display text-base font-semibold">
        <span className="grid size-7 place-items-center rounded-full bg-foreground text-xs text-background">{step}</span>
        {title}
        <span className="text-muted" aria-hidden>{icon}</span>
      </legend>
      {children}
    </fieldset>
  );
}

function Chip({ active, onClick, children, label }: { active: boolean; onClick: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className={cx(
        "h-10 min-w-12 cursor-pointer rounded-lg border px-3 text-sm font-medium tabular-nums transition-colors",
        active ? "border-foreground bg-foreground text-background" : "border-border-strong hover:bg-surface-muted",
      )}
    >
      {children}
    </button>
  );
}

/** Upcoming run times from the API, refreshed (debounced) as the schedule changes. */
function useSchedulePreview(fields: ScheduleFields | null) {
  const [preview, setPreview] = useState<SchedulePreview | null>(null);
  const key = fields ? JSON.stringify(fields) : "";
  useEffect(() => {
    if (!fields) {
      setPreview(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      api.previewSchedule({ ...fields, count: 3 }, ctrl.signal).then(setPreview).catch(() => setPreview(null));
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return preview;
}

export function SchedulerForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Scheduler;
  submitLabel: string;
  onSubmit: (values: SchedulerFormValues) => Promise<void>;
  onCancel?: () => void;
}) {
  const tz0 = initial?.timezone ?? browserTimezone();
  const [values, setValues] = useState<SchedulerFormValues>({
    name: initial?.name ?? "",
    topic: initial?.config.topic ?? "",
    duration_seconds: initial?.config.duration_seconds ?? DEFAULT_DURATION,
    voice: initial?.config.voice ?? "Shivani",
    language: initial?.config.language ?? "en-IN",
    frequency: initial?.frequency ?? "daily",
    run_now: false,
    run_time: initial?.run_time.slice(0, 5) ?? "08:00",
    run_date: initial?.run_date ?? todayIn(tz0),
    days_of_week: initial?.days_of_week ?? [0, 1, 2, 3, 4],
    day_of_month: initial?.day_of_month ?? new Date().getDate(),
    timezone: tz0,
  });
  const [touched, setTouched] = useState<Partial<Record<keyof Errors, boolean>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const zones = useMemo(timezoneOptions, []);
  const isEdit = !!initial;

  const errors = validate(values);
  const shown = (k: keyof Errors) => (touched[k] ? errors[k] : undefined);
  const update = (patch: Partial<SchedulerFormValues>) => setValues((v) => ({ ...v, ...patch }));
  const set = (k: keyof SchedulerFormValues) => (e: { target: { value: string } }) => update({ [k]: e.target.value } as Partial<SchedulerFormValues>);
  const blur = (k: keyof Errors) => () => setTouched((t) => ({ ...t, [k]: true }));

  const scheduleValid = !errors.run_time && !errors.run_date && !errors.days_of_week;
  const preview = useSchedulePreview(scheduleValid ? toScheduleFields(values) : null);
  const runNow = values.frequency === "once" && values.run_now;
  const onceInPast = values.frequency === "once" && !values.run_now && preview && preview.next_runs.length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ topic: true, run_time: true, run_date: true, days_of_week: true });
    const first = (["topic", "run_date", "days_of_week", "run_time"] as const).find((k) => errors[k]);
    if (first) {
      document.getElementById(first)?.focus();
      return;
    }
    if (onceInPast) {
      setSubmitError("That date and time has already passed. Pick a time in the future.");
      return;
    }
    setBusy(true);
    setSubmitError(null);
    try {
      await onSubmit({ ...values, topic: values.topic.trim() });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  const timeField = (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium">Quick pick</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Delivery time presets">
          {TIME_PRESETS.map((t) => (
            <Chip key={t} active={values.run_time === t} onClick={() => update({ run_time: t })}>
              {formatRunTime(t)}
            </Chip>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="run_time" label="Delivery time" error={shown("run_time")} hint="Local time in the selected timezone.">
          <Input id="run_time" type="time" required value={values.run_time} onChange={set("run_time")} onBlur={blur("run_time")} invalid={!!shown("run_time")} />
        </Field>
        <Field id="timezone" label="Timezone" hint="Detected from your browser.">
          <Select id="timezone" value={values.timezone} onChange={set("timezone")}>
            {zones.map((z) => (
              <option key={z} value={z}>
                {timezoneLabel(z)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="space-y-8 p-5 md:p-7">
        <Section step={1} title="What should it cover?" icon={<Lightbulb className="size-4" />}>
          <Field
            id="topic"
            label="Topic"
            hint="Be specific. The agent searches news published in the last 24 hours."
            error={shown("topic")}
            counter={`${values.topic.length}/${TOPIC_MAX}`}
          >
            <Textarea
              id="topic"
              value={values.topic}
              onChange={set("topic")}
              onBlur={blur("topic")}
              invalid={!!shown("topic")}
              maxLength={TOPIC_MAX}
              placeholder="e.g. Find all startup funding announced in the last 24 hours"
              aria-describedby={shown("topic") ? "topic-error" : "topic-hint"}
            />
          </Field>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-subtle">Try an example</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    update({ topic: ex });
                    setTouched((t) => ({ ...t, topic: true }));
                  }}
                  className={cx(
                    "cursor-pointer rounded-full border px-3 py-1.5 text-[13px] transition-colors",
                    values.topic === ex ? "border-accent bg-accent-soft text-accent-text" : "border-border text-muted hover:border-border-strong hover:text-foreground",
                  )}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section step={2} title="How long should it be?" icon={<Timer className="size-4" />}>
          <div role="radiogroup" aria-label="Episode length" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {DURATIONS.map((d) => {
              const active = values.duration_seconds === d.seconds;
              return (
                <button
                  key={d.seconds}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => update({ duration_seconds: d.seconds })}
                  className={cx(
                    "flex cursor-pointer flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 transition-colors",
                    active ? "border-accent bg-accent-soft ring-1 ring-accent" : "border-border-strong hover:bg-surface-muted",
                  )}
                >
                  <span className="text-sm font-semibold tabular-nums">{d.label}</span>
                  <span className={cx("text-xs", active ? "text-accent-text" : "text-muted")}>{d.hint}</span>
                </button>
              );
            })}
          </div>
          <p className="text-sm text-muted">
            Shorter episodes cover only the top stories; longer ones go deeper with more sources.
          </p>
        </Section>

        <Section step={3} title="Who should read it?" icon={<Mic className="size-4" />}>
          <VoicePicker voice={values.voice} language={values.language} onChange={(patch) => update(patch)} />
        </Section>

        <Section step={4} title="When should it run?" icon={<CalendarClock className="size-4" />}>
          <div role="radiogroup" aria-label="Repeat" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {FREQUENCIES.map(({ value, label, hint, Icon }) => {
              const active = values.frequency === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => update({ frequency: value })}
                  className={cx(
                    "flex cursor-pointer flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors",
                    active ? "border-accent bg-accent-soft ring-1 ring-accent" : "border-border-strong hover:bg-surface-muted",
                  )}
                >
                  <Icon className={cx("size-[18px]", active ? "text-accent-text" : "text-muted")} aria-hidden />
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="text-xs text-muted">{hint}</span>
                </button>
              );
            })}
          </div>

          {values.frequency === "once" && (
            <div className="space-y-4">
              {!isEdit && (
                <div role="radiogroup" aria-label="When to run once" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[
                    { now: true, title: "Right now", text: "Generate immediately (about 1–2 minutes)" },
                    { now: false, title: "Pick a date & time", text: "Run once at a specific moment" },
                  ].map((o) => (
                    <button
                      key={o.title}
                      type="button"
                      role="radio"
                      aria-checked={values.run_now === o.now}
                      onClick={() => update({ run_now: o.now })}
                      className={cx(
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                        values.run_now === o.now ? "border-foreground bg-surface-muted" : "border-border-strong hover:bg-surface-muted",
                      )}
                    >
                      <span className={cx("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2", values.run_now === o.now ? "border-foreground" : "border-border-strong")}>
                        {values.run_now === o.now && <span className="size-2 rounded-full bg-foreground" />}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{o.title}</span>
                        <span className="text-xs text-muted">{o.text}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {!runNow && (
                <>
                  <Field id="run_date" label="Date" error={shown("run_date")}>
                    <Input id="run_date" type="date" min={todayIn(values.timezone)} value={values.run_date} onChange={set("run_date")} onBlur={blur("run_date")} invalid={!!shown("run_date")} />
                  </Field>
                  {timeField}
                </>
              )}
            </div>
          )}

          {values.frequency === "daily" && timeField}

          {values.frequency === "weekly" && (
            <div className="space-y-4">
              <Field id="days_of_week" label="On these days" error={shown("days_of_week")}>
                <div id="days_of_week" tabIndex={-1} className="flex flex-wrap gap-2" role="group" aria-label="Weekdays">
                  {WEEKDAYS.map((d, i) => {
                    const on = values.days_of_week.includes(i);
                    return (
                      <Chip
                        key={d}
                        active={on}
                        label={WEEKDAYS_LONG[i]}
                        onClick={() => {
                          setTouched((t) => ({ ...t, days_of_week: true }));
                          update({ days_of_week: on ? values.days_of_week.filter((x) => x !== i) : [...values.days_of_week, i].sort() });
                        }}
                      >
                        {d}
                      </Chip>
                    );
                  })}
                </div>
              </Field>
              <div className="flex flex-wrap gap-3 text-sm">
                {[
                  { label: "Weekdays", days: [0, 1, 2, 3, 4] },
                  { label: "Weekends", days: [5, 6] },
                  { label: "Every day", days: [0, 1, 2, 3, 4, 5, 6] },
                ].map((p) => (
                  <button key={p.label} type="button" onClick={() => update({ days_of_week: p.days })} className="cursor-pointer text-muted underline-offset-4 hover:text-foreground hover:underline">
                    {p.label}
                  </button>
                ))}
              </div>
              {timeField}
            </div>
          )}

          {values.frequency === "monthly" && (
            <div className="space-y-4">
              <Field id="day_of_month" label="Day of the month" hint="In shorter months (e.g. the 31st in April), it runs on the last day.">
                <Select id="day_of_month" value={values.day_of_month} onChange={(e) => update({ day_of_month: Number(e.target.value) })}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {ordinal(d)}
                    </option>
                  ))}
                </Select>
              </Field>
              {timeField}
            </div>
          )}
        </Section>

        <Section step={5} title="Give it a name" icon={<Sparkles className="size-4" />}>
          <Field id="name" label="Name" optional hint="Shown on your dashboard and in emails. Defaults to the topic.">
            <Input id="name" maxLength={200} value={values.name} onChange={set("name")} placeholder="Morning funding roundup" />
          </Field>
        </Section>

        <ErrorNote message={submitError} />

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-6 sm:flex-row sm:justify-end">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" size="lg" loading={busy}>
            {runNow && <Zap className="size-4" aria-hidden />}
            {runNow ? "Create & generate now" : submitLabel}
          </Button>
        </div>
      </Card>

      {/* Live preview */}
      <aside className="lg:sticky lg:top-8" aria-label="Preview" aria-live="polite">
        <Card className="overflow-hidden">
          <div className="bg-foreground p-5 text-background">
            <p className="text-xs font-medium uppercase tracking-wider opacity-60">Preview</p>
            <p className="mt-2 line-clamp-3 font-display text-lg font-semibold">{values.name.trim() || values.topic.trim() || "Your podcast"}</p>
          </div>
          <ul className="space-y-4 p-5 text-sm">
            <li className="flex gap-3">
              <Repeat className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden />
              <span>
                <strong>{runNow ? "Once, right now" : formatSchedule(values)}</strong>
                {!runNow && <span className="block text-muted">{timezoneLabel(values.timezone)}</span>}
              </span>
            </li>
            <li className="flex gap-3">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden />
              <span className="min-w-0">
                {runNow ? (
                  <strong>Starts as soon as you create it</strong>
                ) : onceInPast ? (
                  <span className="text-danger">That moment has already passed</span>
                ) : preview?.next_runs.length ? (
                  <>
                    First episode <strong>{formatCountdown(preview.next_runs[0])}</strong>
                    <span className="mt-1 block space-y-0.5 text-muted">
                      {preview.next_runs.map((r) => (
                        <span key={r} className="block">{formatDateTime(r)}</span>
                      ))}
                    </span>
                  </>
                ) : (
                  <span className="text-muted">Choose when it should run</span>
                )}
              </span>
            </li>
            <li className="flex gap-3">
              <Headphones className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden />
              <span>
                About <strong>{formatEpisodeLength(values.duration_seconds)}</strong>, researched from today&apos;s news, read by <strong>{values.voice}</strong>
              </span>
            </li>
            <li className="flex gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden />
              <span>A link is emailed to you as soon as it&apos;s ready</span>
            </li>
          </ul>
        </Card>
      </aside>
    </form>
  );
}
