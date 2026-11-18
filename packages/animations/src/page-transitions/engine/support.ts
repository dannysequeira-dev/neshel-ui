/**
 * View Transition capability detection (Phase 013; contracts/page-transitions.md §2, research R1–R3).
 * Behavioural checks per capability, never user-agent sniffing; all `false` on the server.
 */

export interface ViewTransitionSupport {
  /** `document.startViewTransition` (same-document transitions). */
  sameDocument: boolean;
  /** Transition types (`:active-view-transition-type()`, `{ types }`). */
  types: boolean;
  /** `view-transition-class`. */
  classes: boolean;
  /** Cross-document transitions (`@view-transition`, `pagereveal`). */
  crossDocument: boolean;
  /** Navigation API with history entry indexes (direction detection). */
  navigationApi: boolean;
}

const NONE: ViewTransitionSupport = Object.freeze({
  sameDocument: false,
  types: false,
  classes: false,
  crossDocument: false,
  navigationApi: false,
});

function supportsSelector(selector: string): boolean {
  try {
    return typeof CSS !== "undefined" && CSS.supports(`selector(${selector})`);
  } catch {
    return false;
  }
}

function supportsProperty(property: string, value: string): boolean {
  try {
    return typeof CSS !== "undefined" && CSS.supports(property, value);
  } catch {
    return false;
  }
}

/** Current capabilities (computed on every call: cheap, and test/polyfill friendly). */
export function getViewTransitionSupport(): ViewTransitionSupport {
  if (typeof document === "undefined" || typeof window === "undefined") return NONE;
  const sameDocument =
    typeof (document as { startViewTransition?: unknown }).startViewTransition === "function";
  const navigation = (window as { navigation?: { currentEntry?: { index?: unknown } } }).navigation;
  return {
    sameDocument,
    types: sameDocument && supportsSelector(":active-view-transition-type(a)"),
    classes: sameDocument && supportsProperty("view-transition-class", "a"),
    crossDocument:
      "onpagereveal" in window &&
      typeof (globalThis as { CSSViewTransitionRule?: unknown }).CSSViewTransitionRule !==
        "undefined",
    navigationApi: typeof navigation?.currentEntry?.index === "number",
  };
}
