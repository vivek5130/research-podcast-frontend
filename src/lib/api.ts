/**
 * Typed client for the DailyCast API.
 *
 * Requests go to the same origin (`/api/...`), which Next.js proxies to FastAPI.
 * The session lives in an httpOnly cookie the browser attaches automatically, so
 * no token handling happens in JavaScript.
 */
import type {
  RunDetail,
  RunSummary,
  ScheduleFields,
  SchedulePreview,
  Scheduler,
  SchedulerCreate,
  SchedulerCreated,
  SchedulerUpdate,
  Session,
  User,
  VoiceCatalog,
} from "./types";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = body?.detail;
    const message = Array.isArray(detail)
      ? detail.map((d: { msg: string }) => d.msg).join("; ") // FastAPI validation errors
      : (detail ?? `Request failed (${res.status})`);
    throw new ApiError(res.status, message);
  }
  return body as T;
}

const json = (data: unknown) => JSON.stringify(data);

export const api = {
  // ---- auth ----
  signInWithGoogle: (credential: string) =>
    request<Session>("/api/auth/signin/google", { method: "POST", body: json({ credential }) }),
  signInDev: (email: string, name?: string) =>
    request<Session>("/api/auth/signin/dev", { method: "POST", body: json({ email, name }) }),
  signOut: () => request<void>("/api/auth/signout", { method: "POST" }),
  session: () => request<User>("/api/auth/session"),

  // ---- schedulers ----
  listSchedulers: () => request<Scheduler[]>("/api/schedulers"),
  getScheduler: (id: string) => request<Scheduler>(`/api/schedulers/${id}`),
  createScheduler: (body: SchedulerCreate) =>
    request<SchedulerCreated>("/api/schedulers", { method: "POST", body: json(body) }),
  previewSchedule: (body: ScheduleFields & { count?: number }, signal?: AbortSignal) =>
    request<SchedulePreview>("/api/schedulers/preview", { method: "POST", body: json(body), signal }),
  updateScheduler: (id: string, body: SchedulerUpdate) =>
    request<Scheduler>(`/api/schedulers/${id}`, { method: "PATCH", body: json(body) }),
  deleteScheduler: (id: string) => request<void>(`/api/schedulers/${id}`, { method: "DELETE" }),
  triggerScheduler: (id: string) => request<RunDetail>(`/api/schedulers/${id}/trigger`, { method: "POST" }),
  listSchedulerRuns: (id: string) => request<RunSummary[]>(`/api/schedulers/${id}/runs`),

  // ---- podcast options ----
  voices: () => request<VoiceCatalog>("/api/podcast/voices"),
  voicePreview: (voice: string, language: string) =>
    request<{ voice: string; language: string; audio_url: string }>(
      `/api/podcast/voices/${encodeURIComponent(voice)}/preview?language=${encodeURIComponent(language)}`,
    ),

  // ---- runs ----
  listRuns: (limit = 20) => request<RunSummary[]>(`/api/runs?limit=${limit}`),
  getRun: (id: string) => request<RunDetail>(`/api/runs/${id}`),
  retryRun: (id: string) => request<RunDetail>(`/api/runs/${id}/retry`, { method: "POST" }),
};

/** SWR fetcher: keys are API paths. */
export const fetcher = <T,>(path: string) => request<T>(path);
