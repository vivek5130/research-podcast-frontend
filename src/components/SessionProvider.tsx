"use client";

/**
 * Loads the signed-in user once for all app pages. If the backend says the session
 * is invalid (expired, or the account was deleted), the cookie is cleared and the
 * user is sent back to sign in.
 */
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import useSWR from "swr";

import { AppShellSkeleton } from "@/components/skeletons";
import { ApiError, api, fetcher } from "@/lib/api";
import type { User } from "@/lib/types";

const SessionContext = createContext<User | null>(null);

export function useUser(): User {
  const user = useContext(SessionContext);
  if (!user) throw new Error("useUser must be used inside <SessionProvider>");
  return user;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, error } = useSWR<User>("/api/auth/session", fetcher, { revalidateOnFocus: false });

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      api.signOut().finally(() => router.replace(`/?next=${encodeURIComponent(pathname)}`));
    }
  }, [error, pathname, router]);

  if (!user) {
    return (
      error && !(error instanceof ApiError && error.status === 401) ? (
        <div className="grid min-h-dvh place-items-center text-muted">
          <p className="text-sm">Could not reach the server. Is the backend running?</p>
        </div>
      ) : (
        <AppShellSkeleton />
      )
    );
  }
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}
