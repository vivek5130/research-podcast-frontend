import { AudioLines, CalendarClock, FileSearch, Mail, Mic, Newspaper, Pause, Play } from "lucide-react";
import { Suspense } from "react";

import { Logo } from "@/components/Logo";
import { SignInPanel } from "@/components/SignInPanel";
import { ThemeToggle } from "@/components/ThemeToggle";

/** Landing + sign-in page. */

const FEATURES = [
  { Icon: Newspaper, title: "Fresh, real sources", text: "Live news search limited to the last 24 hours, deduplicated and ranked. Every story is cited." },
  { Icon: FileSearch, title: "Written by an AI agent", text: "Plans searches, curates sources and writes a tight script from 15 seconds to 10 minutes." },
  { Icon: Mic, title: "Voiced by Gnani.ai", text: "Natural Indian-English narration from Gnani's text-to-speech, delivered as an MP3." },
  { Icon: Mail, title: "In your inbox, on time", text: "Pick a time and timezone. Each day's episode is emailed as soon as it's ready." },
];

function SampleEpisode() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-card" aria-hidden>
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
          <AudioLines className="size-6" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-display font-semibold">Startup Funding: $280M for Payhawk, $90M for Sparxity</p>
          <p className="text-sm text-muted">Today · 8:00 AM · 4:58</p>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-foreground text-background">
          <Pause className="size-4" />
        </span>
        <div className="flex h-9 flex-1 items-center gap-[3px]">
          {[4, 7, 11, 6, 13, 9, 15, 8, 12, 5, 10, 14, 7, 11, 6, 9, 13, 5, 8, 12, 6, 10, 4, 7].map((h, i) => (
            <span key={i} className={`w-full rounded-full ${i < 9 ? "bg-accent" : "bg-surface-muted"}`} style={{ height: `${h * 2}px` }} />
          ))}
        </div>
        <span className="text-xs tabular-nums text-muted">1:42</span>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 text-xs">
        {["techcrunch.com", "fintechfutures.com", "dealroom.co", "+9 sources"].map((s) => (
          <span key={s} className="rounded-full bg-surface-muted px-2.5 py-1 text-muted">{s}</span>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
        <Logo />
        <div className="w-56"><ThemeToggle /></div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-10 md:px-8 md:py-16 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted">
              <span className="size-1.5 animate-pulse rounded-full bg-accent" /> AI research agent · Gnani.ai voice
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.1] md:text-[56px]">
              Your daily briefing,
              <br />
              <span className="text-accent-text">researched and voiced</span> for you.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Tell DailyCast what you care about and when. Every day it reads the latest news, writes a five-minute
              script and emails you the episode.
            </p>
            <div className="mt-8 max-w-md">
              <SampleEpisode />
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <Suspense>
              <SignInPanel />
            </Suspense>
          </div>
        </section>

        <section className="border-y border-border bg-surface-sunken">
          <div className="mx-auto max-w-6xl px-4 py-14 md:px-8">
            <h2 className="text-2xl font-semibold md:text-3xl">How it works</h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {[
                { Icon: CalendarClock, title: "Schedule", text: "“Find all startup funding announced in the last 24 hours”: once, daily, weekly or monthly." },
                { Icon: FileSearch, title: "Research & write", text: "The agent searches current sources and writes a grounded script at the length you choose." },
                { Icon: Play, title: "Listen", text: "Gnani.ai voices it, and a link arrives in your inbox at your chosen time." },
              ].map(({ Icon, title, text }, i) => (
                <li key={title} className="rounded-xl border border-border bg-surface p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-lg bg-foreground text-background">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="text-sm font-medium text-muted">Step {i + 1}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                  <p className="mt-1 text-muted">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 md:px-8">
          <h2 className="text-2xl font-semibold md:text-3xl">Built for busy mornings</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ Icon, title, text }) => (
              <div key={title} className="rounded-xl border border-border bg-surface p-5">
                <Icon className="size-6 text-accent-text" aria-hidden />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted md:px-8">
          <span>© {new Date().getFullYear()} DailyCast</span>
          <span>Next.js · FastAPI · LangGraph · Gnani.ai TTS</span>
        </div>
      </footer>
    </div>
  );
}
