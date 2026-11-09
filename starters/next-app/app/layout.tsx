import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neshel-UI starter — Next.js",
  description: "Next.js App Router with Neshel-UI",
};

const THEMES = new Set(["light", "dark", "system", "harbor"]);

/** Server Component: the theme comes from a cookie, so the first paint already has it. */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const saved = (await cookies()).get("theme")?.value;
  const theme = saved && THEMES.has(saved) ? saved : "system";
  return (
    <html lang="en" data-neshel-theme={theme}>
      <body>{children}</body>
    </html>
  );
}
