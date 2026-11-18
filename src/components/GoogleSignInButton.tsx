"use client";

/**
 * Renders Google's official "Sign in with Google" button (Google Identity Services).
 * On success Google gives us an ID token (`credential`), which we pass up; the
 * backend verifies it and sets the session cookie.
 */
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

type GoogleId = {
  initialize: (opts: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string }) => void;
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

export function GoogleSignInButton({ onCredential }: { onCredential: (credential: string) => void }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  const render = useCallback(() => {
    const gis = window.google?.accounts.id;
    if (!gis || !ref.current || !clientId) return;
    gis.initialize({ client_id: clientId, callback: (r) => callbackRef.current(r.credential) });
    gis.renderButton(ref.current, { theme: "outline", size: "large", shape: "pill", text: "continue_with", width: 280 });
    setReady(true);
  }, [clientId]);

  useEffect(() => {
    if (window.google) render(); // script already loaded (client-side navigation)
  }, [render]);

  if (!clientId) {
    return <p className="text-sm text-danger">NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set.</p>;
  }
  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={render} />
      <div ref={ref} className="flex min-h-11 justify-center" aria-busy={!ready} />
    </>
  );
}
