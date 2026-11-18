import { SessionProvider } from "@/components/SessionProvider";
import { AppShell } from "@/components/Sidebar";

/** Shell for signed-in pages: session check + collapsible sidebar. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
