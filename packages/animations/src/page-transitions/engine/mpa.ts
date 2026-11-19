/**
 * PT09 — Cross-document (MPA) View Transitions helper (contracts/page-transitions.md §6, research R2).
 *
 * The opt-in itself is CSS (`page-transitions-mpa.css`: `@view-transition { navigation: auto }` in both
 * same-origin documents, disabled under reduced motion). This optional helper adds effect and direction to
 * a cross-document transition from `navigation.activation` history indexes — in `pageswap` (old document)
 * and `pagereveal` (new document) — as View Transition types and `<html>` attributes, and names registered
 * shared elements on both sides. Engines without cross-document support (Firefox 159) navigate normally:
 * the helper does nothing there. No interception, no fetch-and-swap.
 */

import { validator } from "../../core/validate.js";
import { EFFECT_ATTRIBUTE, PAGE_EFFECTS, type PageEffect } from "./controller.js";
import { DIRECTION_ATTRIBUTE, directionOf } from "./direction.js";
import { createNameWrites, cssName, currentOwners } from "./names.js";

interface ActivationLike {
  navigationType?: string;
  from?: { index?: number } | null;
  entry?: { index?: number } | null;
}

interface CrossDocumentEvent extends Event {
  viewTransition?: { types?: Set<string>; finished?: Promise<void> } | null;
  activation?: ActivationLike | null;
}

export interface CrossDocumentOptions {
  effect?: PageEffect;
}

const v = /* @__PURE__ */ validator("enableCrossDocumentTransitions");

/** Returns the disposer; a no-op where cross-document transitions are unsupported. */
export function enableCrossDocumentTransitions(options: CrossDocumentOptions = {}): () => void {
  const o = v.options(options);
  const effect = v.oneOf("effect", o.effect, PAGE_EFFECTS, "fade");
  if (typeof window === "undefined" || !("onpagereveal" in window)) return () => {};
  const root = document.documentElement;
  const writes = createNameWrites("page/cross-document");

  function apply(event: CrossDocumentEvent, activation: ActivationLike | null | undefined): void {
    const transition = event.viewTransition;
    if (!transition) return;
    // `pageswap` reports index -1 for the entry a push creates: a push is forward anyway.
    const { direction } = directionOf(
      activation?.navigationType,
      activation?.from?.index ?? undefined,
      activation?.entry?.index ?? undefined,
    );
    root.setAttribute(EFFECT_ATTRIBUTE, effect);
    root.setAttribute(DIRECTION_ATTRIBUTE, direction);
    try {
      transition.types?.add(`neshel-${effect}`);
      transition.types?.add(`neshel-${direction}`);
    } catch {
      // Types unsupported: the attributes above still select the effect.
    }
    for (const [name, owner] of currentOwners()) {
      writes.write(
        owner.element,
        cssName(name),
        owner.persist ? "neshel-pt-persist" : "neshel-pt-morph",
      );
    }
    void transition.finished?.finally(() => {
      writes.release();
      root.removeAttribute(EFFECT_ATTRIBUTE);
    });
  }

  const onSwap = (event: Event) => {
    const swap = event as CrossDocumentEvent;
    apply(swap, swap.activation);
  };
  const onReveal = (event: Event) => {
    const activation = (window as { navigation?: { activation?: ActivationLike } }).navigation
      ?.activation;
    apply(event as CrossDocumentEvent, activation);
  };
  window.addEventListener("pageswap", onSwap);
  window.addEventListener("pagereveal", onReveal);
  return () => {
    window.removeEventListener("pageswap", onSwap);
    window.removeEventListener("pagereveal", onReveal);
    writes.release();
  };
}
