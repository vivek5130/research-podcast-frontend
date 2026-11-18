"use client";

/**
 * Slim progress bar at the top of the window during page navigation.
 *
 * Starts the instant an internal link is clicked (or back/forward is used, or
 * `startNavigationProgress()` is called before a programmatic `router.push`),
 * trickles toward 90% while the next route loads, and completes + fades once the
 * URL actually changes. Gives immediate feedback even when a route takes a moment
 * (e.g. first compile in dev, or a slow network).
 */
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const START_EVENT = "navigation-progress:start";

/** Call before `router.push(...)` so programmatic navigations show the bar too. */
export function startNavigationProgress() {
  window.dispatchEvent(new Event(START_EVENT));
}

function isInternalNavigation(e: MouseEvent): boolean {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  const a = (e.target as Element | null)?.closest("a");
  if (!a || a.target === "_blank" || a.hasAttribute("download")) return false;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return false;
  return url.pathname !== location.pathname || url.search !== location.search;
}

export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const trickle = useRef<ReturnType<typeof setInterval> | null>(null);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(false);

  function stopTimers() {
    if (trickle.current) clearInterval(trickle.current);
    if (safety.current) clearTimeout(safety.current);
    trickle.current = safety.current = null;
  }

  function start() {
    if (active.current) return;
    active.current = true;
    stopTimers();
    setVisible(true);
    setProgress(12);
    // Ease toward 90%: big steps first, smaller ones later (never "finishes" on its own).
    trickle.current = setInterval(() => setProgress((p) => (p < 90 ? p + (90 - p) * 0.12 : p)), 200);
    safety.current = setTimeout(done, 15_000); // never leave a stuck bar
  }

  function done() {
    if (!active.current) return;
    active.current = false;
    stopTimers();
    setProgress(100);
    setTimeout(() => setVisible(false), 250);
    setTimeout(() => setProgress(0), 500);
  }

  useEffect(() => {
    const onClick = (e: MouseEvent) => isInternalNavigation(e) && start();
    window.addEventListener("click", onClick, true);
    window.addEventListener("popstate", start);
    window.addEventListener(START_EVENT, start);
    return () => {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", start);
      window.removeEventListener(START_EVENT, start);
      stopTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The URL changed: the new route has rendered (its loading.tsx skeleton at least).
  useEffect(() => {
    done();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]">
      <div
        className="h-full bg-accent shadow-[0_0_8px_var(--accent)] transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${progress}%`, opacity: visible ? 1 : 0 }}
      />
    </div>
  );
}
