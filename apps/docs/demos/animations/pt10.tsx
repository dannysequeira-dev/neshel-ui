"use client";
import "@neshel-ui/animations/page-transitions.css";
import { PageTransition } from "@neshel-ui/animations/page-transitions";
import { NextPageTransitions, TransitionLink } from "@neshel-ui/animations/page-transitions/next";
import type { ReactNode } from "react";

/** Render it once in the root layout of a Next.js App Router application. */
export default function Shell({ children }: { children: ReactNode }) {
  return (
    <NextPageTransitions>
      <nav aria-label="Main">
        <TransitionLink href="/pricing">Pricing</TransitionLink>
      </nav>
      <PageTransition effect="slide">{children}</PageTransition>
    </NextPageTransitions>
  );
}
