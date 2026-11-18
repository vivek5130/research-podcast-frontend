"use client";

/**
 * App navigation.
 *
 * Desktop (lg+): fixed left sidebar that collapses to an icon rail (choice saved in
 * localStorage). Mobile: a top bar with a menu button that opens the same nav as a
 * slide-in drawer (closes on navigation, Escape, or backdrop click).
 */
import {
  CalendarClock,
  Loader2,
  Headphones,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  X,
} from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Logo } from "@/components/Logo";
import { useUser } from "@/components/SessionProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cx } from "@/components/ui";
import { api } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Home", Icon: LayoutDashboard },
  { href: "/schedulers", label: "Schedules", Icon: CalendarClock },
  { href: "/runs", label: "Episodes", Icon: Headphones },
];

function isActive(pathname: string, href: string) {
  if (href === "/schedulers") return pathname.startsWith("/schedulers") && pathname !== "/schedulers/new";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function CollapseButton({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!collapsed}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-muted transition-colors duration-200 hover:bg-surface-muted hover:text-foreground"
    >
      {collapsed ? <PanelLeftOpen className="size-[18px]" aria-hidden /> : <PanelLeftClose className="size-[18px]" aria-hidden />}
    </button>
  );
}

function NavContent({
  collapsed,
  onNavigate,
  onToggleCollapse,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useUser();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await api.signOut().catch(() => {});
    router.replace("/");
  }

  // Smooth collapse: every icon keeps the same position in both states (fixed padding,
  // centered in the 48px rail), labels fade instead of unmounting, and the two items that
  // must move (collapse toggle, sign-out) glide via `left`/`top` on the same curve.
  return (
    <div className="flex h-full flex-col gap-6 p-3">
      <div className={cx("relative shrink-0 transition-[height]", EASE, collapsed && onToggleCollapse ? "h-[84px]" : "h-10")}>
        <Link href="/dashboard" onClick={onNavigate} className="flex h-10 items-center rounded-lg px-1.5">
          <Logo wordmarkHidden={collapsed} />
        </Link>
        {onToggleCollapse && (
          <div
            className={cx("absolute transition-[left,top]", EASE)}
            style={{ left: collapsed ? 6 : "calc(100% - 36px)", top: collapsed ? 48 : 2 }}
          >
            <CollapseButton collapsed={collapsed} onToggle={onToggleCollapse} />
          </div>
        )}
      </div>

      <Link
        href="/schedulers/new"
        onClick={onNavigate}
        title={collapsed ? "New podcast" : undefined}
        aria-label={collapsed ? "New podcast" : undefined}
        className="flex h-10 shrink-0 items-center gap-2 overflow-hidden rounded-lg bg-accent px-[15px] font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
      >
        <Plus className="size-[18px] shrink-0" aria-hidden />
        <FadeLabel hidden={collapsed} className="text-sm">New podcast</FadeLabel>
      </Link>

      <nav aria-label="Main" className="flex flex-col gap-1">
        {NAV.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={collapsed ? label : undefined}
              aria-label={collapsed ? label : undefined}
              className={cx(
                "relative flex h-10 items-center gap-3 overflow-hidden rounded-lg px-[15px] text-sm font-medium transition-colors",
                active ? "bg-surface-muted text-foreground" : "text-muted hover:bg-surface-muted hover:text-foreground",
              )}
            >
              {active && <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-accent" />}
              <PendingIcon Icon={Icon} />
              <FadeLabel hidden={collapsed}>{label}</FadeLabel>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        {/* Full theme switch and the compact one cross-fade in the same spot. */}
        <div className="relative h-10">
          <div className={cx("absolute inset-y-0 left-0 w-[232px] transition-opacity", collapsed ? "pointer-events-none opacity-0 duration-150" : "opacity-100 delay-150 duration-300")}>
            <ThemeToggle />
          </div>
          <div className={cx("absolute top-0 left-1 transition-opacity", collapsed ? "opacity-100 delay-150 duration-300" : "pointer-events-none opacity-0 duration-150")}>
            <ThemeToggle compact />
          </div>
        </div>

        {/* Account card: avatar fixed, name fades, sign-out glides from the right edge to under the avatar. */}
        <div className={cx("relative overflow-hidden rounded-lg border border-border transition-[height]", EASE, collapsed ? "h-[86px]" : "h-[50px]")}>
          <span className="absolute top-2 left-[7px]">
            {user.picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.picture} alt="" className="size-8 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <span className="grid size-8 place-items-center rounded-full bg-foreground text-sm font-semibold text-background">
                {(user.name ?? user.email)[0]?.toUpperCase()}
              </span>
            )}
          </span>
          <FadeLabel hidden={collapsed} className="absolute top-1.5 left-12 w-[136px]">
            <span className="block truncate text-sm font-medium">{user.name ?? user.email.split("@")[0]}</span>
            <span className="block truncate text-xs text-muted">{user.email}</span>
          </FadeLabel>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            aria-label="Sign out"
            title="Sign out"
            style={{ left: collapsed ? 7 : "calc(100% - 40px)", top: collapsed ? 46 : 8 }}
            className={cx(
              "absolute grid size-8 cursor-pointer place-items-center rounded-md text-muted transition-[left,top,background-color,color] hover:bg-danger-soft hover:text-danger disabled:opacity-50",
              EASE,
            )}
          >
            <LogOut className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Nav icon that turns into a spinner while its link's page is loading (Next's
 * useLinkStatus), so a click is acknowledged instantly even on a slow route.
 */
function PendingIcon({ Icon }: { Icon: typeof Plus }) {
  const { pending } = useLinkStatus();
  return pending ? (
    <Loader2 className="size-[18px] shrink-0 animate-spin text-accent-text" aria-hidden />
  ) : (
    <Icon className="size-[18px] shrink-0" aria-hidden />
  );
}

/** Shared motion for the sidebar: a soft ease-out, long enough to read as a glide. */
const EASE = "duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)]";

/**
 * Text that fades + slides instead of unmounting. On collapse it leaves quickly (before
 * the width shrinks over it); on expand it arrives after the sidebar has mostly opened.
 */
function FadeLabel({ hidden, className, children }: { hidden: boolean; className?: string; children: ReactNode }) {
  return (
    <span
      aria-hidden={hidden || undefined}
      className={cx(
        "whitespace-nowrap transition-[opacity,transform] ease-out",
        hidden ? "-translate-x-1 opacity-0 duration-150" : "translate-x-0 opacity-100 delay-150 duration-300",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
    } catch {}
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function toggleCollapsed() {
    setCollapsed((c) => {
      try {
        localStorage.setItem("sidebar-collapsed", c ? "0" : "1");
      } catch {}
      return !c;
    });
  }

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-30 hidden overflow-hidden border-r border-border bg-surface-sunken transition-[width] lg:block",
          EASE,
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <NavContent collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          className="grid size-10 cursor-pointer place-items-center rounded-lg text-foreground hover:bg-surface-muted"
        >
          <Menu className="size-5" aria-hidden />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-border bg-surface-sunken shadow-card">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="absolute top-3 right-3 grid size-10 cursor-pointer place-items-center rounded-lg text-muted hover:bg-surface-muted"
            >
              <X className="size-5" aria-hidden />
            </button>
            <NavContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <main className={cx("transition-[padding]", EASE, collapsed ? "lg:pl-[72px]" : "lg:pl-64")}>
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">{children}</div>
      </main>
    </div>
  );
}
