/**
 * PT07 — Route progress (contracts/page-transitions.md §5).
 *
 * A package-rendered, indeterminate bar (`role="progressbar"`, labelled, no `aria-valuenow`: never a fake
 * percentage). `start()` shows it after `delay` (fast navigations never flash); `done()` completes it and
 * returns to idle after `minVisible`; `fail()` shows the failed state briefly; `cancel()` goes idle at once;
 * a navigation that never settles is cancelled after `timeout`. An optional one-shot status message is
 * written to a visually hidden `role="status"` child — never per frame. Animation is CSS on the package's
 * own element (`page-transitions.css`; reduced motion → static bar).
 */
import { devWarnOnce } from "../../core/dev.js";
import { validator } from "../../core/validate.js";

export type RouteProgressState = "idle" | "pending" | "complete" | "failed";

export interface RouteProgressOptions {
  /** ms before the bar appears (0–2000, default 120). */
  delay?: number;
  /** ms the completed/failed state stays visible (0–3000, default 300). */
  minVisible?: number;
  /** ms after which a pending navigation is cancelled (1000–120000, default 15000). */
  timeout?: number;
  /** Announce completion/failure once in a status region (default false). */
  announce?: boolean;
  labels?: Partial<Record<"loading" | "loaded" | "failed", string>>;
}

export interface RouteProgress {
  readonly state: RouteProgressState;
  start(): void;
  done(): void;
  fail(): void;
  cancel(): void;
  destroy(): void;
}

const LABELS = { loading: "Loading page", loaded: "Page loaded", failed: "Navigation failed" };
const v = /* @__PURE__ */ validator("createRouteProgress");

export function createRouteProgress(
  element: HTMLElement,
  options: RouteProgressOptions = {},
): RouteProgress {
  const o = v.options(options);
  const delay = v.number("delay", o.delay, 120, 0, 2000);
  const minVisible = v.number("minVisible", o.minVisible, 300, 0, 3000);
  const timeout = v.number("timeout", o.timeout, 15000, 1000, 120000);
  const announce = v.flag("announce", o.announce, false);
  const labels = { ...LABELS, ...o.labels };
  if (!element?.ownerDocument) v.fail('"element" must be an element.');
  let state: RouteProgressState = "idle";
  let shown = false;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let status = element.querySelector<HTMLElement>(":scope > .neshel-route-progress-status");
  if (announce && !status) {
    status = element.ownerDocument.createElement("span");
    status.className = "neshel-route-progress-status";
    status.setAttribute("role", "status");
    element.appendChild(status);
  }

  element.classList.add("neshel-route-progress");
  element.setAttribute("role", "progressbar");
  element.setAttribute("aria-label", labels.loading);
  element.setAttribute("data-state", "idle");
  element.hidden = true;

  const later = (ms: number, fn: () => void) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      fn();
    }, ms);
    timers.add(timer);
  };
  const clearTimers = () => {
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
  };
  function render(next: RouteProgressState): void {
    state = next;
    element.setAttribute("data-state", next);
    if (next === "pending") element.setAttribute("aria-busy", "true");
    else element.removeAttribute("aria-busy");
  }
  function idle(): void {
    clearTimers();
    render("idle");
    shown = false;
    element.hidden = true;
  }
  function settleTo(next: "complete" | "failed"): void {
    if (state !== "pending") return;
    clearTimers();
    if (announce && status)
      status.textContent = next === "complete" ? labels.loaded : labels.failed;
    if (!shown) {
      idle();
      return;
    }
    render(next);
    later(minVisible, idle);
  }

  return {
    get state() {
      return state;
    },
    start() {
      clearTimers();
      if (status) status.textContent = "";
      render("pending");
      if (shown) element.hidden = false;
      later(delay, () => {
        if (state !== "pending") return;
        shown = true;
        element.hidden = false;
      });
      later(timeout, () => {
        if (state !== "pending") return;
        devWarnOnce(
          "route-progress-timeout",
          `a navigation stayed pending for ${timeout} ms; the progress bar was cancelled.`,
        );
        idle();
      });
    },
    done() {
      settleTo("complete");
    },
    fail() {
      settleTo("failed");
    },
    cancel() {
      if (state !== "idle") idle();
    },
    destroy() {
      idle();
    },
  };
}
