/** Display helpers for times, durations and run states. */
import type { RunStatus, RunSummary } from "./types";

/** "08:00:00" -> "8:00 AM" */
export function formatRunTime(runTime: string): string {
  const [h, m] = runTime.split(":").map(Number);
  const d = new Date(2000, 0, 1, h, m);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** ISO instant -> "Tue, 19 Nov, 8:00 AM" in the viewer's local time. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** ISO instant -> "in 3 h" / "5 min ago". */
export function formatRelative(iso: string): string {
  const diffSec = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(Math.round(diffSec), "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  return rtf.format(Math.round(diffSec / 86400), "day");
}

/** 312 -> "5:12" */
export function formatDuration(sec: number | null | undefined): string {
  if (!sec) return "—";
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

/** Legacy IANA aliases some browsers still report, mapped to their canonical names. */
const TZ_ALIASES: Record<string, string> = { "Asia/Calcutta": "Asia/Kolkata", "Asia/Saigon": "Asia/Ho_Chi_Minh" };

export function browserTimezone(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  return TZ_ALIASES[tz] ?? tz;
}

/** All IANA zones the browser knows (falls back to a short list). */
export function timezoneOptions(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
  const zones = intl.supportedValuesOf?.("timeZone") ?? [
    "Asia/Kolkata", "UTC", "Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Singapore",
  ];
  const tz = browserTimezone();
  return zones.includes(tz) ? zones : [tz, ...zones];
}

export const isActiveRun = (status: RunStatus) => status === "pending" || status === "running";

/** Minutes since midnight of the current wall-clock time in `tz`. */
function minutesNowIn(tz: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

/** When "HH:MM" next occurs in `tz` (client-side preview; the server computes the real schedule). */
export function nextOccurrence(runTime: string, tz: string): Date | null {
  const [h, m] = runTime.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  try {
    let diff = h * 60 + m - minutesNowIn(tz);
    if (diff <= 0) diff += 24 * 60;
    return new Date(Date.now() + diff * 60_000);
  } catch {
    return null;
  }
}

/** "in 3 h 12 min" style countdown to an instant. */
export function formatCountdown(target: Date | string): string {
  const mins = Math.max(0, Math.round((new Date(target).getTime() - Date.now()) / 60_000));
  if (mins < 1) return "any moment now";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h >= 48) return `in ${Math.round(h / 24)} days`;
  if (h >= 24) return `in 1 day ${h - 24} h`;
  return h ? `in ${h} h ${m} min` : `in ${m} min`;
}

/** "Asia/Kolkata" -> "Kolkata (GMT+5:30)" */
export function timezoneLabel(tz: string): string {
  try {
    const offset = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value;
    const city = tz.split("/").pop()?.replaceAll("_", " ") ?? tz;
    return offset ? `${city} (${offset})` : city;
  } catch {
    return tz;
  }
}

/** Episode lengths the API accepts (seconds), with labels for the picker. */
export const DURATIONS = [
  { seconds: 15, label: "15 sec", hint: "Headline" },
  { seconds: 30, label: "30 sec", hint: "Quick hit" },
  { seconds: 60, label: "1 min", hint: "Snapshot" },
  { seconds: 120, label: "2 min", hint: "Brief" },
  { seconds: 300, label: "5 min", hint: "Standard" },
  { seconds: 600, label: "10 min", hint: "Deep dive" },
] as const;
export const DEFAULT_DURATION = 300;

/** 15 -> "15 sec", 300 -> "5 min" */
export function formatEpisodeLength(seconds: number | undefined | null): string {
  const s = seconds ?? DEFAULT_DURATION;
  return s < 60 ? `${s} sec` : `${Math.round(s / 60)} min`;
}

/** Weekday labels; index matches the API (0 = Monday ... 6 = Sunday). */
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const WEEKDAYS_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${s}`;
}

/** "Daily at 8:00 AM" · "Weekly on Mon, Fri at 8:00 AM" · "Monthly on the 15th at 8:00 AM" · "Once on Thu, 20 Nov at 8:00 AM" */
export function formatSchedule(s: {
  frequency: string;
  run_time?: string;
  run_date?: string | null;
  days_of_week?: number[] | null;
  day_of_month?: number | null;
}): string {
  const at = s.run_time ? ` at ${formatRunTime(s.run_time)}` : "";
  switch (s.frequency) {
    case "once": {
      if (!s.run_date) return "Once, right now";
      const d = new Date(`${s.run_date}T00:00:00`);
      return `Once on ${d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}${at}`;
    }
    case "weekly": {
      const days = [...(s.days_of_week ?? [])].sort();
      const label =
        days.length === 7 ? "every day" : days.join() === "0,1,2,3,4" ? "weekdays" : days.join() === "5,6" ? "weekends" : days.map((d) => WEEKDAYS[d]).join(", ");
      return `Weekly on ${label}${at}`;
    }
    case "monthly":
      return `Monthly on the ${ordinal(s.day_of_month ?? 1)}${at}`;
    default:
      return `Daily${at}`;
  }
}

/** A one-time scheduler that has already fired (inactive). */
export const isFinishedOnce = (s: { frequency: string; is_active: boolean }) => s.frequency === "once" && !s.is_active;

/** Today's date ("YYYY-MM-DD") in `tz`, for the date picker's minimum. */
export function todayIn(tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/** 1830 sec -> "30 min", 5400 -> "1 h 30 min" */
export function formatTotalMinutes(sec: number): string {
  const mins = Math.round(sec / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min`;
}

const STAGE_LABELS: Record<string, string> = {
  research: "Researching sources & writing script",
  synthesize: "Generating audio with Gnani TTS",
};

/** Human description of where a run is. */
export function describeRun(run: Pick<RunSummary, "status" | "stage">): string {
  if (run.status === "pending") return "Queued";
  if (run.status === "running") return STAGE_LABELS[run.stage ?? ""] ?? "Running";
  if (run.status === "completed") return "Ready";
  return "Failed";
}
