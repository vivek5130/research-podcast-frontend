"use client";

/**
 * Sign-in card: Google, or email + password (sign in / create account).
 * Both end in the same httpOnly session cookie set by the backend.
 */
import { Eye, EyeOff, Lock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { Button, Card, cx, ErrorNote, Field, Input } from "@/components/ui";
import { api } from "@/lib/api";

type Mode = "signin" | "signup";
const MIN_PASSWORD = 8;

/** Only allow relative in-app redirects (prevents open redirects via ?next=). */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export function SignInPanel() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [mode, setMode] = useState<Mode>("signin");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Already signed in? Skip straight to the app.
  useEffect(() => {
    api.session().then(() => router.replace(next)).catch(() => {});
  }, [next, router]);

  async function finish(signIn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await signIn();
      router.replace(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
      setBusy(false);
    }
  }

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
  }

  const signup = mode === "signup";
  const passwordTooShort = signup && password.length > 0 && password.length < MIN_PASSWORD;

  return (
    <Card className="w-full max-w-sm p-6 md:p-7">
      <h2 className="text-xl font-semibold">{signup ? "Create your account" : "Sign in to DailyCast"}</h2>
      <p className="mt-1 text-sm text-muted">
        {next !== "/dashboard" ? "Sign in to listen to your episode." : "Start your first podcast in under a minute."}
      </p>

      <div className="mt-6">
        <GoogleSignInButton onCredential={(credential) => finish(() => api.signInWithGoogle(credential))} />
      </div>

      <div className="my-5 flex items-center gap-3 text-xs text-subtle" aria-hidden>
        <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
      </div>

      <div role="tablist" aria-label="Email sign-in" className="mb-4 grid grid-cols-2 rounded-lg bg-surface-muted p-1">
        {(["signin", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={cx(
              "h-8 cursor-pointer rounded-md text-sm font-medium transition-colors",
              mode === m ? "bg-surface text-foreground shadow-card" : "text-muted hover:text-foreground",
            )}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (passwordTooShort) return;
          finish(() => (signup ? api.signUp(email, password, name || undefined) : api.signInWithPassword(email, password)));
        }}
      >
        {signup && (
          <Field id="name" label="Name" optional>
            <Input id="name" autoComplete="name" maxLength={80} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        )}
        <Field id="email" label="Email">
          <Input id="email" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field
          id="password"
          label="Password"
          hint={signup ? `At least ${MIN_PASSWORD} characters.` : undefined}
          error={passwordTooShort ? `Use at least ${MIN_PASSWORD} characters.` : null}
        >
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={signup ? MIN_PASSWORD : 1}
              maxLength={128}
              autoComplete={signup ? "new-password" : "current-password"}
              value={password}
              invalid={passwordTooShort}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 grid w-11 cursor-pointer place-items-center text-muted hover:text-foreground"
            >
              {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            </button>
          </div>
        </Field>
        <Button type="submit" variant="inverse" className="w-full" loading={busy}>
          {signup ? "Create account" : "Sign in"}
        </Button>
      </form>

      <div className="mt-4">
        <ErrorNote message={error} />
      </div>
      <p className="mt-5 flex items-center gap-1.5 text-xs text-muted">
        <Lock className="size-3.5" aria-hidden /> Your schedules and episodes are private to your account.
      </p>
    </Card>
  );
}
