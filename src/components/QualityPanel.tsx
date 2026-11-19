"use client";

/**
 * "Quality & safety" for one episode: the evaluation metrics computed after the
 * script is written (faithfulness, relevance, freshness, ...) and what the
 * guardrails removed. PII is reported by type only, never by value.
 */
import { ShieldCheck } from "lucide-react";

import { Card, cx, SectionTitle } from "@/components/ui";
import type { Evaluation, Guardrails } from "@/lib/types";

const PII_LABELS: Record<string, string> = {
  email: "email address",
  credit_card: "card number",
  ip: "IP address",
  phone: "phone number",
  aadhaar: "Aadhaar number",
  pan: "PAN",
  api_key: "API key",
};

const pct = (v?: number | null) => (v == null ? "—" : `${Math.round(v * 100)}%`);
const tone = (v?: number | null, good = 0.85, ok = 0.6) =>
  v == null ? "text-muted" : v >= good ? "text-accent-text" : v >= ok ? "text-warning" : "text-danger";
const labels = (types?: string[]) => (types ?? []).map((t) => PII_LABELS[t] ?? t).join(", ");

function Metric({ label, value, hint, className }: { label: string; value: string; hint: string; className?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={cx("mt-1 text-lg font-semibold tabular-nums", className)}>{value}</p>
      <p className="mt-0.5 text-xs text-subtle">{hint}</p>
    </div>
  );
}

export function QualityPanel({ evaluation, guardrails }: { evaluation?: Evaluation; guardrails?: Guardrails }) {
  if (!evaluation || Object.keys(evaluation).length === 0) return null;
  const e = evaluation;
  const g = guardrails ?? {};
  const relevance = e.relevance == null ? null : (e.relevance - 1) / 4;

  const notes: string[] = [];
  if (g.topic_pii_removed?.length) notes.push(`Removed from your topic before searching: ${labels(g.topic_pii_removed)}.`);
  if (g.script_pii_removed?.length) notes.push(`Removed from the script before voicing: ${labels(g.script_pii_removed)}.`);
  if (g.source_pii_redactions) notes.push(`Contact details stripped from ${g.source_pii_redactions} source article(s).`);
  if (g.injection_sentences_removed) notes.push(`${g.injection_sentences_removed} prompt-injection sentence(s) stripped from sources.`);
  if (g.ungrounded_sentences_removed) notes.push(`${g.ungrounded_sentences_removed} sentence(s) with claims not found in any source were cut before voicing.`);
  if (g.unsafe_sentences_removed) notes.push(`${g.unsafe_sentences_removed} sentence(s) breaking the content policy were cut before voicing.`);
  if (g.ungrounded_claims_kept) notes.push(`${g.ungrounded_claims_kept} unsupported claim(s) could not be matched to a sentence and were kept: review below.`);
  if (g.queries_blocked) notes.push(`${g.queries_blocked} search quer${g.queries_blocked === 1 ? "y was" : "ies were"} blocked by the content policy.`);

  return (
    <section>
      <SectionTitle>Quality &amp; safety</SectionTitle>
      <Card className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Metric
            label="Faithfulness"
            value={pct(e.faithfulness)}
            hint={e.claims_checked ? `${e.claims_supported}/${e.claims_checked} claims backed by a source` : "Claims backed by sources"}
            className={tone(e.faithfulness)}
          />
          <Metric
            label="Topic relevance"
            value={e.relevance == null ? "—" : `${e.relevance}/5`}
            hint="How well it covers the request"
            className={tone(relevance, 0.75, 0.5)}
          />
          <Metric label="Freshness" value={pct(e.freshness)} hint="Sources from the last 3 days" className={tone(e.freshness)} />
          <Metric label="Source utilization" value={pct(e.source_utilization)} hint="Sources actually cited" className={tone(e.source_utilization, 0.6, 0.3)} />
          <Metric label="Source diversity" value={pct(e.source_diversity)} hint="Distinct outlets" className={tone(e.source_diversity, 0.6, 0.4)} />
          <Metric
            label="Length accuracy"
            value={pct(e.duration_accuracy ?? e.length_accuracy)}
            hint={
              e.duration_sec && e.target_duration_sec
                ? `${e.duration_sec}s of ${e.target_duration_sec}s requested`
                : `${e.word_count ?? "?"} of ${e.target_words ?? "?"} words`
            }
            className={tone(e.duration_accuracy ?? e.length_accuracy, 0.85, 0.7)}
          />
        </div>

        {e.relevance_reason && <p className="text-sm text-muted">{e.relevance_reason}</p>}
        {e.judge_error && <p className="text-xs text-subtle">Faithfulness and relevance couldn&apos;t be scored this time ({e.judge_error}).</p>}

        {e.unsupported_claims && e.unsupported_claims.length > 0 && (
          <details className="rounded-lg border border-border p-3 text-sm">
            <summary className="cursor-pointer font-medium">Claims not found in the sources ({e.unsupported_claims.length})</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
              {e.unsupported_claims.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </details>
        )}

        <div className="flex items-start gap-2 text-sm">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden />
          <div className="text-muted">
            {notes.length ? notes.map((n) => <p key={n}>{n}</p>) : <p>Guardrails: no personal data or blocked content found.</p>}
          </div>
        </div>
      </Card>
    </section>
  );
}
