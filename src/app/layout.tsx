import type { Metadata, Viewport } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import { Suspense } from "react";

import { NavigationProgress } from "@/components/NavigationProgress";
import "./globals.css";

const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "DailyCast", template: "%s · DailyCast" },
  description: "A five-minute audio briefing on any topic, researched fresh, on your schedule.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a", // dark is the default theme
};

/**
 * Runs before first paint: applies the saved theme ("light" | "dark" | "system"),
 * defaulting to dark, so there is no flash of the wrong theme. <html> is also rendered
 * with the `dark` class, so dark shows even before this runs. Keep it tiny and dependency-free.
 */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme")||"dark";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${dmSans.variable} ${spaceGrotesk.variable} min-h-dvh`}>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
