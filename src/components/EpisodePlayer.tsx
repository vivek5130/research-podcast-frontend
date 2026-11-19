"use client";

/**
 * Audio player + script with live highlighting of the sentence being spoken.
 *
 * The backend stores sentence timings for each episode (exact per TTS chunk,
 * shared by length within a chunk). The sentence being spoken is highlighted,
 * past sentences stay readable, and clicking any sentence jumps the audio there.
 * The script scrolls along (eased) only when the line leaves the reading band, and
 * pauses while the reader scrolls themselves ("Back to current line" brings it back).
 * Older episodes without timings fall back to an estimate from text length.
 */
import { Check, Copy, Download, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button, Card, cx, SectionTitle } from "@/components/ui";
import type { SentenceTiming } from "@/lib/types";

const SENTENCE_SPLIT = /(?<=[.!?।])\s+/;

interface Sentence {
  text: string;
  start: number;
  end: number;
  paragraph: number;
}

/** Script paragraphs -> sentences with start/end times (server timings when they line up, else estimated). */
function buildSentences(script: string, timings: SentenceTiming[] | undefined, duration: number): Sentence[] {
  const paragraphs = script.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const flat = paragraphs.flatMap((p, i) =>
    p.split(SENTENCE_SPLIT).filter((s) => s.trim()).map((text) => ({ text, paragraph: i })),
  );
  if (timings && timings.length === flat.length) {
    return flat.map((s, i) => ({ ...s, start: timings[i].start, end: timings[i].end }));
  }
  const total = flat.reduce((n, s) => n + s.text.length, 0) || 1;
  let t = 0;
  return flat.map((s) => {
    const span = (duration * s.text.length) / total;
    const out = { ...s, start: t, end: t + span };
    t += span;
    return out;
  });
}

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

// ---------- eased scrolling ----------

let scrollAnimation = 0;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const reducedMotion = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Scroll the window to ``targetY`` with an ease-in-out curve (native smooth scroll varies by browser). */
function glideTo(targetY: number, duration = 700) {
  cancelAnimationFrame(scrollAnimation);
  const startY = window.scrollY;
  const distance = targetY - startY;
  if (Math.abs(distance) < 2) return;
  if (reducedMotion()) {
    window.scrollTo(0, targetY);
    return;
  }
  const t0 = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / duration);
    window.scrollTo(0, startY + distance * easeInOutCubic(t));
    if (t < 1) scrollAnimation = requestAnimationFrame(step);
  };
  scrollAnimation = requestAnimationFrame(step);
}

/**
 * Keep ``el`` in a comfortable reading band (between 30% and 70% of the viewport).
 * Only when it drifts outside does the page glide so the line sits at ~40% height,
 * so the page moves occasionally and calmly instead of on every sentence.
 */
function glideIntoView(el: HTMLElement, force = false) {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const inBand = rect.top > vh * 0.3 && rect.bottom < vh * 0.7;
  if (inBand && !force) return;
  glideTo(window.scrollY + rect.top - vh * 0.4 + rect.height / 2);
}

export function EpisodePlayer({
  audioUrl,
  script,
  timings,
  duration,
  wordCount,
}: {
  audioUrl: string | null | undefined;
  script: string | undefined;
  timings?: SentenceTiming[];
  duration?: number;
  wordCount?: number;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const activeRef = useRef<HTMLSpanElement>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [length, setLength] = useState(duration ?? 0);

  const sentences = useMemo(() => (script ? buildSentences(script, timings, length || duration || 1) : []), [script, timings, length, duration]);
  const active = playing || time > 0 ? sentences.findIndex((s) => time >= s.start && time < s.end) : -1;

  // Smooth updates while playing (timeupdate alone fires only ~4x/second).
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      if (audioRef.current) setTime(audioRef.current.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // Auto-scroll: glide only when the spoken sentence leaves a comfortable
  // reading band, and step aside while the reader scrolls on their own.
  const [userScrolled, setUserScrolled] = useState(false);
  const following = playing && !userScrolled;

  useEffect(() => {
    if (!playing) return;
    const pause = () => setUserScrolled(true);
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(e.key) && e.target === document.body) pause();
    };
    window.addEventListener("wheel", pause, { passive: true });
    window.addEventListener("touchmove", pause, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", pause);
      window.removeEventListener("touchmove", pause);
      window.removeEventListener("keydown", onKey);
    };
  }, [playing]);

  useEffect(() => {
    if (following && activeRef.current) glideIntoView(activeRef.current);
  }, [active, following]);

  const resumeFollow = useCallback(() => {
    setUserScrolled(false);
    if (activeRef.current) glideIntoView(activeRef.current, true);
  }, []);

  const seek = useCallback((start: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = start + 0.01;
    setTime(start);
    setUserScrolled(false);
    void audio.play();
  }, []);

  const byParagraph = useMemo(() => {
    const groups: { sentence: Sentence; index: number }[][] = [];
    sentences.forEach((sentence, index) => (groups[sentence.paragraph] ??= []).push({ sentence, index }));
    return groups;
  }, [sentences]);

  return (
    <>
      {audioUrl && (
        <Card className="sticky top-16 z-10 p-4 lg:top-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => (audioRef.current?.paused ? audioRef.current.play() : audioRef.current?.pause())}
              aria-label={playing ? "Pause" : "Play"}
              className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-accent text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              {playing ? <Pause className="size-5" aria-hidden /> : <Play className="ml-0.5 size-5" aria-hidden />}
            </button>
            <div className="min-w-0 flex-1">
              <input
                type="range"
                min={0}
                max={length || 1}
                step={0.1}
                value={time}
                onChange={(e) => {
                  const t = Number(e.target.value);
                  if (audioRef.current) audioRef.current.currentTime = t;
                  setTime(t);
                }}
                aria-label="Seek"
                className="w-full cursor-pointer accent-[var(--accent)]"
              />
              <div className="flex justify-between text-xs tabular-nums text-muted">
                <span>{clock(time)}</span>
                <span>{clock(length)}</span>
              </div>
            </div>
            <a href={audioUrl} download className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-muted hover:text-foreground" aria-label="Download MP3" title="Download MP3">
              <Download className="size-4" aria-hidden />
            </a>
          </div>
          <audio
            ref={audioRef}
            src={audioUrl}
            preload="metadata"
            onLoadedMetadata={(e) => setLength(e.currentTarget.duration || duration || 0)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onTimeUpdate={(e) => !playing && setTime(e.currentTarget.currentTime)}
            className="hidden"
          />
        </Card>
      )}

      {script && (
        <section>
          <SectionTitle
            action={
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await navigator.clipboard.writeText(script);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            }
          >
            Script{wordCount ? <span className="ml-2 text-sm font-normal text-muted">{wordCount} words</span> : null}
          </SectionTitle>
          <Card className="p-5 md:p-7">
            <div className="space-y-4 text-[15px] leading-8">
              {byParagraph.map((group, p) => (
                <p key={p}>
                  {group.map(({ sentence, index }) => {
                    const isActive = index === active;
                    return (
                      <span
                        key={index}
                        ref={isActive ? activeRef : undefined}
                        onClick={audioUrl ? () => seek(sentence.start) : undefined}
                        title={audioUrl ? `Play from ${clock(sentence.start)}` : undefined}
                        className={cx(
                          "rounded px-0.5 transition-[background-color,color,box-shadow] duration-500 ease-out",
                          audioUrl && "cursor-pointer hover:bg-surface-muted",
                          isActive && "bg-accent-soft text-foreground ring-1 ring-accent/40",
                          active >= 0 && index > active && "text-muted",
                        )}
                      >
                        {sentence.text}{" "}
                      </span>
                    );
                  })}
                </p>
              ))}
            </div>
          </Card>
          {audioUrl && <p className="mt-2 text-xs text-subtle">Tip: click any sentence to play from there.</p>}
          {playing && userScrolled && (
            <button
              type="button"
              onClick={resumeFollow}
              className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2 cursor-pointer rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-card transition-opacity duration-300 hover:opacity-90"
            >
              Back to current line
            </button>
          )}
        </section>
      )}
    </>
  );
}
