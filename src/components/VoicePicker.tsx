"use client";

/**
 * Choose the narrator: language, gender filter, and one of Gnani's Timbre v3.0
 * voices (each with a persona and typical use). Every voice can be previewed; the
 * sample is generated once on the server and cached, so browsing is cheap.
 */
import { Loader2, Pause, Play } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import useSWR from "swr";

import { cx, Field, Select, Skeleton } from "@/components/ui";
import { api, fetcher } from "@/lib/api";
import type { VoiceCatalog } from "@/lib/types";

type Gender = "all" | "female" | "male";

export function VoicePicker({
  voice,
  language,
  onChange,
}: {
  voice: string;
  language: string;
  onChange: (patch: { voice?: string; language?: string }) => void;
}) {
  const { data: catalog } = useSWR<VoiceCatalog>("/api/podcast/voices", fetcher, { revalidateOnFocus: false });
  const [gender, setGender] = useState<Gender>("all");
  const [playing, setPlaying] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const voices = useMemo(
    () => (catalog?.voices ?? []).filter((v) => gender === "all" || v.gender === gender),
    [catalog, gender],
  );

  async function preview(name: string) {
    setError(null);
    if (playing === name) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    audioRef.current?.pause();
    setLoading(name);
    try {
      const { audio_url } = await api.voicePreview(name, language);
      const audio = new Audio(audio_url);
      audioRef.current = audio;
      audio.onended = () => setPlaying(null);
      await audio.play();
      setPlaying(name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview unavailable");
    } finally {
      setLoading(null);
    }
  }

  if (!catalog) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="language" label="Language" hint="The script is written and read in this language.">
          <Select id="language" value={language} onChange={(e) => onChange({ language: e.target.value })}>
            {catalog.languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="space-y-1.5">
          <span className="text-sm font-medium">Voice gender</span>
          <div role="radiogroup" aria-label="Voice gender" className="grid h-11 grid-cols-3 gap-1 rounded-lg bg-surface-muted p-1">
            {(["all", "female", "male"] as Gender[]).map((g) => (
              <button
                key={g}
                type="button"
                role="radio"
                aria-checked={gender === g}
                onClick={() => setGender(g)}
                className={cx(
                  "cursor-pointer rounded-md text-sm font-medium capitalize transition-colors",
                  gender === g ? "bg-surface text-foreground shadow-card" : "text-muted hover:text-foreground",
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div role="radiogroup" aria-label="Voice" className="grid max-h-80 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
        {voices.map((v) => {
          const selected = v.name === voice;
          return (
            <div
              key={v.name}
              className={cx(
                "flex items-start gap-2 rounded-xl border p-3 transition-colors",
                selected ? "border-accent bg-accent-soft ring-1 ring-accent" : "border-border-strong hover:bg-surface-muted",
              )}
            >
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange({ voice: v.name })}
                className="min-w-0 flex-1 cursor-pointer text-left"
              >
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{v.name}</span>
                  <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[11px] capitalize text-muted">{v.gender}</span>
                </span>
                <span className="mt-0.5 block text-[13px]">{v.persona}</span>
                <span className="block truncate text-xs text-muted">{v.use_case}</span>
              </button>
              <button
                type="button"
                onClick={() => preview(v.name)}
                aria-label={playing === v.name ? `Stop ${v.name} preview` : `Preview ${v.name}`}
                title="Preview voice"
                className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border border-border bg-surface text-foreground hover:bg-surface-muted"
              >
                {loading === v.name ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : playing === v.name ? (
                  <Pause className="size-4" aria-hidden />
                ) : (
                  <Play className="ml-0.5 size-4" aria-hidden />
                )}
              </button>
            </div>
          );
        })}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <p className="text-xs text-subtle">
        {catalog.voices.length} Gnani.ai voices · each speaks all {catalog.languages.length} languages. Previews are cached after first play.
      </p>
    </div>
  );
}
