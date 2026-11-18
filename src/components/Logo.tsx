import { AudioLines } from "lucide-react";

/**
 * Brand mark: green tile with an audio waveform, plus the wordmark.
 * `wordmarkHidden` fades the wordmark out (used by the collapsing sidebar) instead of
 * removing it, so the tile never moves while the sidebar animates.
 */
export function Logo({ wordmarkHidden = false }: { wordmarkHidden?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
        <AudioLines className="size-5" aria-hidden />
      </span>
      <span
        aria-hidden={wordmarkHidden || undefined}
        className={`whitespace-nowrap font-display text-[17px] font-semibold tracking-tight transition-[opacity,transform] ease-out ${
          wordmarkHidden ? "-translate-x-1 opacity-0 duration-150" : "translate-x-0 opacity-100 duration-300 delay-150"
        }`}
      >
        DailyCast
      </span>
    </span>
  );
}
