/** Shared UI primitives. Colors come only from theme tokens (globals.css), never raw hex. */
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { describeRun } from "@/lib/format";
import type { RunSummary } from "@/lib/types";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// ---------- buttons ----------

type Variant = "primary" | "secondary" | "ghost" | "danger" | "inverse";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-foreground hover:bg-accent-hover",
  inverse: "bg-foreground text-background hover:opacity-90",
  secondary: "border border-border bg-surface text-foreground hover:bg-surface-muted",
  ghost: "text-muted hover:bg-surface-muted hover:text-foreground",
  danger: "border border-border bg-surface text-danger hover:border-danger hover:bg-danger-soft",
};
const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-[15px] gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg font-medium transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors duration-150",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 aria-hidden className={cx("size-4 animate-spin text-muted", className)} />;
}

// ---------- surfaces ----------

/** Bordered surface. Pass `inverted` for the high-contrast black (light) / white (dark) variant. */
export function Card({ className, inverted, children }: { className?: string; inverted?: boolean; children: ReactNode }) {
  return (
    <div
      className={cx(
        "rounded-xl border shadow-card",
        inverted ? "border-foreground bg-foreground text-background" : "border-border bg-surface",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-8 space-y-3">
      {back && (
        <Link href={back.href} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold md:text-[28px]">{title}</h1>
          {description && <p className="mt-1 text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <h2 className="text-base font-semibold">{children}</h2>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx("animate-pulse rounded-lg bg-surface-muted", className)} />;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2 text-[13px] leading-5 text-muted">
        {label}
        <span className="grid size-8 place-items-center rounded-lg bg-surface-muted text-foreground">{icon}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border-strong px-6 py-12 text-center">
      {icon && <div className="mb-3 grid size-11 place-items-center rounded-full bg-surface-muted text-muted">{icon}</div>}
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ---------- form controls ----------

const fieldBase =
  "w-full rounded-lg border bg-surface px-3 text-[15px] text-foreground placeholder:text-subtle transition-colors " +
  "focus:outline-none focus:ring-3 disabled:opacity-60";
// Exactly one of these is applied, so the error (red) and focus (green) borders never compete.
const fieldTone = (invalid?: boolean) =>
  invalid ? "border-danger focus:border-danger focus:ring-danger/20" : "border-border-strong focus:border-ring focus:ring-ring/20";

export function Input({ invalid, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input {...props} aria-invalid={invalid || undefined} className={cx(fieldBase, "h-11", fieldTone(invalid), className)} />
  );
}

export function Textarea({ invalid, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      {...props}
      aria-invalid={invalid || undefined}
      className={cx(fieldBase, "min-h-28 resize-y py-2.5", fieldTone(invalid), className)}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(fieldBase, "h-11 cursor-pointer", fieldTone(false), className)} />;
}

/** Label + control + helper/error text, wired with ids for screen readers. */
export function Field({
  id,
  label,
  hint,
  error,
  optional,
  counter,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  counter?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label} {optional && <span className="font-normal text-subtle">(optional)</span>}
        </label>
        {counter && <span className="text-xs tabular-nums text-subtle">{counter}</span>}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-sm text-danger" role="alert">
          <AlertCircle className="size-4 shrink-0" aria-hidden /> {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-sm text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function ErrorNote({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> <span>{message}</span>
    </p>
  );
}

// ---------- status ----------

const STATUS_STYLES: Record<RunSummary["status"], string> = {
  pending: "bg-surface-muted text-muted",
  running: "bg-warning-soft text-warning",
  completed: "bg-accent-soft text-accent-text",
  failed: "bg-danger-soft text-danger",
};

export function RunStatusBadge({ run }: { run: Pick<RunSummary, "status" | "stage"> }) {
  const active = run.status === "running" || run.status === "pending";
  const label = run.status === "running" ? (run.stage === "synthesize" ? "Voicing" : "Researching") : describeRun(run);
  return (
    <span className={cx("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[run.status])}>
      {active ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {label}
    </span>
  );
}

/** Scheduler state: Active, Paused, or Done (a one-time schedule that already ran). */
export function ActiveBadge({ active, done = false }: { active: boolean; done?: boolean }) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        active ? "bg-accent-soft text-accent-text" : "bg-surface-muted text-muted",
      )}
    >
      <span className={cx("size-1.5 rounded-full", active ? "bg-accent" : "bg-subtle")} aria-hidden />
      {done ? "Done" : active ? "Active" : "Paused"}
    </span>
  );
}
