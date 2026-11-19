/** Types mirroring the backend's API schemas (backend/app/schemas). */

export type SchedulerType = "podcast";
export type RunStatus = "pending" | "running" | "completed" | "failed";
export type RunTrigger = "scheduled" | "manual";

export interface User {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
}

export interface Session {
  user: User;
  expires_at: number;
}

export interface PodcastConfig {
  topic: string;
  duration_seconds?: number; // 15 | 30 | 60 | 120 | 300 | 600 (default 300)
  voice?: string; // Gnani Timbre v3.0 voice name (default Shivani)
  language?: string; // e.g. en-IN, hi-IN (default en-IN)
}

export interface Voice {
  name: string;
  gender: "female" | "male";
  persona: string;
  use_case: string;
}

export interface VoiceCatalog {
  model: string;
  default_voice: string;
  default_language: string;
  voices: Voice[];
  languages: { code: string; name: string }[];
}

export type Frequency = "once" | "daily" | "weekly" | "monthly";

/** Timing fields shared by create/update/preview. days_of_week: 0 = Monday ... 6 = Sunday. */
export interface ScheduleFields {
  frequency: Frequency;
  run_time?: string; // "08:00"
  timezone: string;
  run_date?: string | null; // "2026-11-20" (once)
  days_of_week?: number[] | null; // weekly
  day_of_month?: number | null; // monthly, 1-31
  run_now?: boolean; // once: start immediately
}

export interface Scheduler {
  id: string;
  type: SchedulerType;
  name: string;
  config: PodcastConfig;
  frequency: Frequency;
  run_time: string; // "08:00:00"
  run_date: string | null;
  days_of_week: number[] | null;
  day_of_month: number | null;
  timezone: string;
  schedule_description: string;
  next_run_at: string; // ISO UTC
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SchedulerCreate extends ScheduleFields {
  type: SchedulerType;
  name?: string;
  config: PodcastConfig;
}

export interface SchedulerCreated extends Scheduler {
  triggered_run_id: string | null;
}

export type SchedulerUpdate = Partial<Pick<Scheduler, "name" | "config" | "timezone" | "is_active">> &
  Partial<Omit<ScheduleFields, "run_now">>;

export interface SchedulePreview {
  description: string;
  next_runs: string[];
}

export interface RunSummary {
  id: string;
  scheduler_id: string;
  scheduler_name: string;
  scheduler_type: SchedulerType;
  trigger: RunTrigger;
  status: RunStatus;
  stage: string | null;
  title: string | null;
  duration_sec: number | null;
  scheduled_for: string;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
  attempts: number; // stage executions started, automatic retries included
  retry_count: number; // manual retries
  created_at: string;
}

export interface PodcastSource {
  title: string;
  url: string;
  published_date: string | null;
}

export interface PodcastOutput {
  title?: string;
  script?: string;
  word_count?: number;
  sources?: PodcastSource[];
  duration_sec?: number;
  audio_format?: string;
  audio_url?: string | null;
  /** Why the audio link couldn't be created (storage problem); the script is still shown. */
  audio_error?: string | null;
  timings?: SentenceTiming[];
  voice?: string;
  language?: string;
}

/** When each sentence is spoken (seconds), for follow-along highlighting. */
export interface SentenceTiming {
  text: string;
  start: number;
  end: number;
}

export interface RunDetail extends RunSummary {
  output: PodcastOutput;
}

/** One LLM attempt or tool call (GET /api/runs/{id}/traces). */
export interface Trace {
  id: string;
  stage: string | null;
  node: string | null;
  kind: "llm" | "tool";
  name: string;
  requested_model: string | null;
  model: string | null;
  attempt: number;
  status: "ok" | "error";
  error: string | null;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  input_tokens: number | null;
  output_tokens: number | null;
  thinking_tokens: number | null;
  total_tokens: number | null;
  input_chars: number | null;
  latency_ms: number | null;
  metadata: Record<string, unknown>;
  started_at: string;
}

export interface TraceSummary {
  llm_calls: number;
  llm_failed_attempts: number;
  tool_calls: number;
  tool_errors: number;
  input_tokens: number;
  output_tokens: number;
  thinking_tokens: number;
  total_tokens: number;
  max_input_chars: number;
  total_latency_ms: number;
  models_used: string[];
}

export interface RunTraces {
  summary: TraceSummary;
  traces: Trace[];
}
