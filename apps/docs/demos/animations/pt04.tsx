"use client";
import "@neshel-ui/animations/page-transitions.css";
import { useNavigationDirection } from "@neshel-ui/animations/page-transitions";

export default function PT04Example() {
  const { direction, type } = useNavigationDirection();
  return (
    <p className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground">
      Last navigation: <output>{direction}</output> (<output>{type}</output>)
    </p>
  );
}
