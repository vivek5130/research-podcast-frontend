"use client";

/** Sign-in card: Google button, plus an email-only dev sign-in when enabled for local testing. */
import { Lock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { Button, Card, ErrorNote, Field, Input } from "@/components/ui";
import { api } from "@/lib/api";

const DEV_LOGIN = process.env.NEXT_PUBLIC_ALLOW_DEV_LOGIN === "true";

/** Only allow relative in-app redirects (prevents open redirects via ?next=). */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export function SignInPanel() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [devEmail, setDevEmail] = useState("");

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

  return (
    <Card className="w-full max-w-sm p-6 md:p-7">
      <h2 className="text-xl font-semibold">Sign in to DailyCast</h2>
      <p className="mt-1 text-sm text-muted">
        {next !== "/dashboard" ? "Sign in to listen to your episode." : "Start your first podcast in under a minute."}
      </p>

      <div className="mt-6">
        <GoogleSignInButton onCredential={(credential) => finish(() => api.signInWithGoogle(credential))} />
      </div>

      {DEV_LOGIN && (
        <form
          className="mt-6 space-y-3 border-t border-border pt-5"
          onSubmit={(e) => {
            e.preventDefault();
            finish(() => api.signInDev(devEmail));
          }}
        >
          <Field id="dev-email" label="Local dev sign-in" hint="Only shown when ALLOW_DEV_LOGIN is on.">
            <Input id="dev-email" type="email" required autoComplete="email" placeholder="you@example.com" value={devEmail} onChange={(e) => setDevEmail(e.target.value)} />
          </Field>
          <Button type="submit" variant="inverse" className="w-full" loading={busy}>
            Continue with email
          </Button>
        </form>
      )}

      <div className="mt-4">
        <ErrorNote message={error} />
      </div>
      <p className="mt-5 flex items-center gap-1.5 text-xs text-muted">
        <Lock className="size-3.5" aria-hidden /> Your schedules and episodes are private to your account.
      </p>
    </Card>
  );
}
