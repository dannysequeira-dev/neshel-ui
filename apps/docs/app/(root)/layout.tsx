import "@fontsource-variable/inter";
import "../global.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { siteMetadata } from "@/lib/metadata";

export const metadata: Metadata = siteMetadata("en");

/** Root layout for the language chooser at "/" (static export has no locale negotiation). */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-neshel-theme="system">
      <body>{children}</body>
    </html>
  );
}
