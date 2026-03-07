"use client";
import { ThemeProvider } from "next-themes";
import { AuthenticationProvider } from "./authentication-provider";
import { useInAppBrowserBypassing } from "./lib/hooks/use-in-app-browser-bypass";
import { PHProvider } from "./ph-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  useInAppBrowserBypassing();
  return (
    <ThemeProvider defaultTheme="dark" forcedTheme="dark" attribute="class">
      <PHProvider>
        <AuthenticationProvider>{children}</AuthenticationProvider>
      </PHProvider>
    </ThemeProvider>
  );
}
