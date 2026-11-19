"use client";

/**
 * Dashboard "Quality & reliability" section, from GET /api/runs/insights (last 30 days):
 * averaged episode evaluation (faithfulness, relevance, freshness, length...),
 * reliability (success rate, retries, failure reasons), cost/latency per episode
 * (tokens, LLM calls, time) and guardrail activity.
 */
import { Activity, Gauge, ShieldCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import useSWR from "swr";

import { Card, cx, SectionTitle, Skeleton } from "@/components/ui";
import { fetcher } from "@/lib/api";
import type { Insights } from "@/lib/types";

const pct = (v?: number | null) => (v == null ? "—" : `${Math.round(v * 100)}%`);
const num = (v?: number | null, digits = 0) => (v == null ? "—" : v.toLocaleString(undefined, { maximumFractionDigits: digits }));
const tone = (v?: number | null, good = 0.85, ok = 0.6) =>
  v == null ? "" : v >= good ? "text-accent-text" : v >= ok ? "text-warning" : "text-danger";

function Row({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className={cx("font-medium tabular-nums", className)}>{value}</span>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Card className="p-4">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <span className="text-accent-text">{icon}</span>
        {title}
      </p>
      <div className="divide-y divide-border">{children}</div>
    </Card>
  );
}

export function InsightsPanel() {
  const { data, error } = useSWR<Insights>("/api/runs/insights?days=30", fetcher);

  return (
    <section>
      <SectionTitle>Quality &amp; reliability · last 30 days</SectionTitle>
      {error ? (
        <p className="text-sm text-muted">Insights are unavailable right now.</p>
      ) : !data ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" aria-hidden>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Panel title="Episode quality" icon={<Sparkles className="size-4" aria-hidden />}>
            <Row label="Faithfulness" value={pct(data.quality.faithfulness)} className={tone(data.quality.faithfulness)} />
            <Row
              label="Topic relevance"
              value={data.quality.relevance == null ? "—" : `${num(data.quality.relevance, 1)}/5`}
              className={tone(data.quality.relevance == null ? null : (data.quality.relevance - 1) / 4, 0.75, 0.5)}
            />
            <Row label="Fresh sources" value={pct(data.quality.freshness)} className={tone(data.quality.freshness)} />
            <Row label="Source diversity" value={pct(data.quality.source_diversity)} />
            <Row label="Avg. sources" value={num(data.quality.avg_sources, 1)} />
            <Row
              label="Length accuracy"
              value={pct(data.quality.duration_accuracy ?? data.quality.length_accuracy)}
              className={tone(data.quality.duration_accuracy ?? data.quality.length_accuracy, 0.85, 0.7)}
            />
            <p className="pt-2 text-xs text-subtle">
              {data.quality.episodes_scored
                ? `Averaged over ${data.quality.episodes_scored} scored episode${data.quality.episodes_scored === 1 ? "" : "s"}.`
                : "New episodes are scored automatically."}
            </p>
          </Panel>

          <Panel title="Reliability" icon={<Activity className="size-4" aria-hidden />}>
            <Row label="Success rate" value={pct(data.reliability.success_rate)} className={tone(data.reliability.success_rate, 0.9, 0.7)} />
            <Row label="Completed / failed" value={`${data.reliability.completed} / ${data.reliability.failed}`} />
            <Row label="Automatic retries" value={data.reliability.automatic_retries} />
            <Row label="Manual retries" value={data.reliability.manual_retries} />
            {data.reliability.failure_reasons.length > 0 && (
              <div className="pt-2">
                <p className="mb-1 text-xs text-subtle">Failure reasons</p>
                {data.reliability.failure_reasons.map((f) => (
                  <Row key={f.reason} label={f.reason} value={f.count} className="text-danger" />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Cost & latency per episode" icon={<Gauge className="size-4" aria-hidden />}>
            <Row label="Tokens" value={num(data.cost.avg_tokens)} />
            <Row label="LLM calls" value={num(data.cost.avg_llm_calls, 1)} />
            <Row label="Time to ready" value={data.cost.avg_seconds == null ? "—" : `${num(data.cost.avg_seconds)} s`} />
            <Row label="Tokens (30 days)" value={num(data.cost.total_tokens)} />
          </Panel>

          <Panel title="Guardrails" icon={<ShieldCheck className="size-4" aria-hidden />}>
            <Row label="Personal data removed" value={data.safety.pii_redactions} />
            <Row label="Topics blocked by policy" value={data.safety.policy_blocks} />
            <Row label="Search queries blocked" value={data.safety.queries_blocked} />
            <Row label="Injection attempts stripped" value={data.safety.injections_removed} />
            <Row label="Unsupported claims cut" value={data.safety.ungrounded_removed} />
            <Row label="Unsafe sentences cut" value={data.safety.unsafe_removed} />
          </Panel>
        </div>
      )}
    </section>
  );
}
