"use client";

/**
 * Telemetry for one episode (from llm_run_traces): every Gemini attempt with
 * prompt, response, tokens and latency, and every tool call (Tavily searches,
 * Gnani TTS chunks). Collapsed by default; each step expands to show its data.
 */
import { AlertCircle, Bot, ChevronDown, Cpu, Mic, Search, Timer } from "lucide-react";
import useSWR from "swr";

import { Card, cx, SectionTitle, Skeleton } from "@/components/ui";
import { fetcher } from "@/lib/api";
import type { RunTraces, Trace } from "@/lib/types";

const fmt = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString());
const secs = (ms: number | null | undefined) => (ms == null ? "—" : ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`);

const ICONS: Record<string, typeof Bot> = {
  "gemini.generate_content": Bot,
  "tavily.search": Search,
  "gnani.tts": Mic,
};

function label(t: Trace): string {
  if (t.kind === "llm") return t.model ?? "LLM";
  if (t.name === "tavily.search") return `“${String(t.input.query ?? "")}”`;
  if (t.name === "gnani.tts") return `${fmt(t.input.chars as number)} chars → ${t.output.duration_sec ?? "?"} s audio`;
  return t.name;
}

function Block({ title, value }: { title: string; value: unknown }) {
  if (value == null || value === "") return null;
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wider text-subtle">{title}</p>
      <pre className="max-h-72 overflow-auto rounded-lg bg-surface-sunken p-3 text-xs leading-relaxed whitespace-pre-wrap break-words">
        {text}
      </pre>
    </div>
  );
}

function TraceRow({ t }: { t: Trace }) {
  const Icon = ICONS[t.name] ?? Cpu;
  const failed = t.status === "error";
  return (
    <li>
      <details className="group">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-2.5 hover:bg-surface-muted [&::-webkit-details-marker]:hidden">
          <span className={cx("grid size-8 shrink-0 place-items-center rounded-lg", failed ? "bg-danger-soft text-danger" : "bg-surface-muted text-muted")}>
            {failed ? <AlertCircle className="size-4" aria-hidden /> : <Icon className="size-4" aria-hidden />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-sm font-medium">{t.node ?? t.stage ?? "step"}</span>
              <span className="truncate text-[13px] text-muted">{label(t)}</span>
              {t.kind === "llm" && t.attempt > 1 && <span className="text-xs text-subtle">attempt {t.attempt}</span>}
            </span>
            {failed && <span className="block truncate text-xs text-danger">{t.error}</span>}
          </span>
          {t.kind === "llm" && !failed && (
            <span className="hidden text-xs tabular-nums text-muted sm:block">
              {fmt(t.input_tokens)} in · {fmt(t.output_tokens)} out
            </span>
          )}
          <span className="w-14 text-right text-xs tabular-nums text-muted">{secs(t.latency_ms)}</span>
          <ChevronDown className="size-4 shrink-0 text-subtle transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-3 border-t border-border bg-surface px-4 py-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
            {[
              ["Started", new Date(t.started_at).toLocaleTimeString()],
              ["Latency", secs(t.latency_ms)],
              ...(t.kind === "llm"
                ? [
                    ["Model", t.model ?? "—"],
                    ["Requested", t.requested_model ?? "—"],
                    ["Input tokens", fmt(t.input_tokens)],
                    ["Output tokens", fmt(t.output_tokens)],
                    ["Thinking tokens", fmt(t.thinking_tokens)],
                    ["Prompt size", `${fmt(t.input_chars)} chars`],
                  ]
                : [["Tool", t.name]]),
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-subtle">{k}</dt>
                <dd className="font-medium tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          {t.error && <Block title="Error" value={t.error} />}
          {t.kind === "llm" ? (
            <>
              <Block title="System prompt" value={t.input.system} />
              <Block title="Prompt" value={t.input.prompt} />
              <Block title="Response" value={t.output.response} />
            </>
          ) : (
            <>
              <Block title="Input" value={t.input} />
              <Block title="Output" value={t.output} />
            </>
          )}
        </div>
      </details>
    </li>
  );
}

export function RunTraces({ runId, live }: { runId: string; live: boolean }) {
  const { data, error } = useSWR<RunTraces>(`/api/runs/${runId}/traces`, fetcher, { refreshInterval: live ? 4000 : 0 });

  if (error) return null;
  if (!data) return <Skeleton className="h-24" />;
  const s = data.summary;
  if (data.traces.length === 0) {
    return (
      <section>
        <SectionTitle>Trace</SectionTitle>
        <p className="text-sm text-muted">No telemetry recorded yet. Episodes that ran before tracing was added have none; new attempts and retries appear here live.</p>
      </section>
    );
  }

  const stats = [
    { label: "LLM calls", value: fmt(s.llm_calls), hint: s.llm_failed_attempts ? `${s.llm_failed_attempts} failed attempts` : "no retries" },
    { label: "Input tokens", value: fmt(s.input_tokens), hint: `largest prompt ${fmt(s.max_input_chars)} chars` },
    { label: "Output tokens", value: fmt(s.output_tokens), hint: s.thinking_tokens ? `+${fmt(s.thinking_tokens)} thinking` : `${fmt(s.total_tokens)} total` },
    { label: "Tool calls", value: fmt(s.tool_calls), hint: s.tool_errors ? `${s.tool_errors} errors` : "Tavily + Gnani" },
  ];

  return (
    <section>
      <SectionTitle
        action={
          <span className="inline-flex items-center gap-1.5 text-sm text-muted">
            <Timer className="size-4" aria-hidden /> {secs(s.total_latency_ms)} in external calls
          </span>
        }
      >
        Trace
      </SectionTitle>
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((x) => (
          <Card key={x.label} className="p-3">
            <p className="text-xs text-muted">{x.label}</p>
            <p className="font-display text-lg font-semibold tabular-nums">{x.value}</p>
            <p className="truncate text-xs text-subtle">{x.hint}</p>
          </Card>
        ))}
      </div>
      {s.models_used.length > 0 && (
        <p className="mb-3 text-xs text-muted">
          Answered by: {s.models_used.map((m) => <code key={m} className="mr-1.5 rounded bg-surface-muted px-1.5 py-0.5">{m}</code>)}
        </p>
      )}
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        {data.traces.map((t) => (
          <TraceRow key={t.id} t={t} />
        ))}
      </ul>
    </section>
  );
}
