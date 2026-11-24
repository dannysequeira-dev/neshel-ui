"use client";
// Both same-origin documents import this stylesheet: it opts in to cross-document view transitions.
import "@neshel-ui/animations/page-transitions-mpa.css";
import { enableCrossDocumentTransitions } from "@neshel-ui/animations/page-transitions";
import { useEffect } from "react";

/** Optional: adds the effect and the navigation direction. Render it in both documents. */
export default function CrossDocumentTransitions() {
  useEffect(() => enableCrossDocumentTransitions({ effect: "slide" }), []);
  return null;
}
