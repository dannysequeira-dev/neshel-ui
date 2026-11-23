/**
 * F07 button loading morph and F08 optimistic pulse (catalogue §14; contracts/feedback-api.md §3, research R15).
 * Both attach to the consumer's element (any button — including a Components `Button` without its own `loading`
 * prop — or any element) and change it only through engine tokens (rendered by package `::before`/`::after`
 * layers in `feedback.css`, rule R-1), ARIA state attributes (originals restored) and Motion Host channels
 * (`min-inline-size`, `position`, `--neshel-loading-color`), restored exactly on release.
 */
import { createChannelWriter } from "../core/channel.js";
import { addToken, FX_ATTRIBUTE } from "../core/tokens.js";
import { validator } from "../core/validate.js";
import { feedbackCounters } from "./counters.js";

type Styled = HTMLElement;

function restoreAttribute(element: Element, name: string, value: string | null): void {
  if (value === null) element.removeAttribute(name);
  else element.setAttribute(name, value);
}

export interface LoadingButtonOptions {
  /** Initial state (default false). */
  loading?: boolean;
}

export interface LoadingButtonControl {
  readonly loading: boolean;
  set(loading: boolean): void;
  destroy(): void;
}

/**
 * F07 — keep the same button (identity, accessible name, focus) while an operation runs: `aria-disabled`,
 * activation blocked in the capture phase (click, Enter/Space and implicit submission all arrive as a click),
 * width locked from one measurement, label hidden visually (still in the DOM), spinner on the `::after` layer.
 */
export function createLoadingButton(
  button: HTMLElement,
  options: LoadingButtonOptions = {},
): LoadingButtonControl {
  const v = validator("createLoadingButton");
  if (!button || button.nodeType !== 1) v.fail('"button" must be an element.');
  let loading = false;
  let destroyed = false;
  let originalDisabled: string | null = null;
  let removeToken: (() => void) | undefined;
  const writer = createChannelWriter(
    button as Styled,
    ["min-inline-size", "position", "--neshel-loading-color"],
    { id: "feedback/loading-button" },
  );
  feedbackCounters.loadingButtons++;

  const block = (event: Event) => {
    if (!loading) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  button.addEventListener("click", block, true);

  function set(next: boolean): void {
    if (destroyed || next === loading) return;
    loading = next;
    if (next) {
      // One measurement per loading start (width lock and the spinner colour).
      const width = button.offsetWidth;
      const style = button.ownerDocument.defaultView?.getComputedStyle(button);
      if (width > 0) writer.set("min-inline-size", `${width}px`);
      if (style && style.position === "static") writer.set("position", "relative");
      if (style?.color) writer.set("--neshel-loading-color", style.color);
      originalDisabled = button.getAttribute("aria-disabled");
      button.setAttribute("aria-disabled", "true");
      removeToken = addToken(button, FX_ATTRIBUTE, "loading");
    } else {
      removeToken?.();
      removeToken = undefined;
      restoreAttribute(button, "aria-disabled", originalDisabled);
      writer.release();
    }
  }
  set(v.flag("loading", options.loading, false));

  return {
    get loading() {
      return loading;
    },
    set,
    destroy() {
      if (destroyed) return;
      set(false);
      destroyed = true;
      button.removeEventListener("click", block, true);
      feedbackCounters.loadingButtons--;
    },
  };
}

export type OptimisticStatus = "idle" | "pending" | "confirmed" | "failed";

export interface OptimisticPulseOptions {
  status?: OptimisticStatus;
  /** Called when the status becomes `failed` (undo the optimistic change). */
  onRollback?(): void;
}

export interface OptimisticPulseControl {
  readonly status: OptimisticStatus;
  set(status: OptimisticStatus): void;
  destroy(): void;
}

/**
 * F08 — an optimistic change is shown as pending (soft `::before` pulse, `aria-busy`), never as confirmed until the
 * caller says so; `failed` shows a distinct static state and calls `onRollback`.
 */
export function createOptimisticPulse(
  element: HTMLElement,
  options: OptimisticPulseOptions = {},
): OptimisticPulseControl {
  const v = validator("createOptimisticPulse");
  if (!element || element.nodeType !== 1) v.fail('"element" must be an element.');
  const onRollback = v.callback<() => void>("onRollback", options.onRollback);
  const writer = createChannelWriter(element as Styled, ["position"], {
    id: "feedback/optimistic",
  });
  const originalBusy = element.getAttribute("aria-busy");
  const removeToken = addToken(element, FX_ATTRIBUTE, "optimistic");
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  if (style && style.position === "static") writer.set("position", "relative");
  let status: OptimisticStatus = "idle";
  let destroyed = false;
  feedbackCounters.optimistic++;

  function set(next: OptimisticStatus): void {
    if (destroyed) return;
    if (!["idle", "pending", "confirmed", "failed"].includes(next))
      v.fail(`invalid status ${JSON.stringify(next)}.`);
    if (next === status) return;
    status = next;
    element.setAttribute("data-neshel-optimistic", next);
    if (next === "pending") element.setAttribute("aria-busy", "true");
    else restoreAttribute(element, "aria-busy", originalBusy);
    if (next === "failed") onRollback?.();
  }
  set(v.oneOf("status", options.status, ["idle", "pending", "confirmed", "failed"], "idle"));
  element.setAttribute("data-neshel-optimistic", status);

  return {
    get status() {
      return status;
    },
    set,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      element.removeAttribute("data-neshel-optimistic");
      restoreAttribute(element, "aria-busy", originalBusy);
      removeToken();
      writer.release();
      feedbackCounters.optimistic--;
    },
  };
}
