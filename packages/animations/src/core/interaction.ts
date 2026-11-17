/**
 * Interaction state for hover and press effects (Phase 010, internal; contracts/accessibility-010.md).
 *
 * - `watchHover`: active while an accepted pointer (mouse and pen by default; touch is opt-in because a
 *   finger over an element usually means scrolling) is inside the element's box, or while keyboard focus
 *   (`:focus-visible`) is inside it. Purely observational: no listener prevents defaults or stops
 *   propagation, so the element's own behaviour is untouched.
 * - `watchPress`: active while the primary pointer button is down on the element (released anywhere),
 *   or while Space/Enter is held with the element itself focused. Disabled elements (`:disabled`,
 *   `aria-disabled="true"`) never press.
 */
import { type PointerSample, trackPointer } from "./pointer.js";

export interface HoverWatchOptions {
  pointerTypes: ReadonlySet<string>;
  /** Keyboard focus inside the element also activates (default true). */
  focus?: boolean;
  onMove?(sample: PointerSample): void;
}

function focusVisible(target: Element): boolean {
  try {
    return target.matches(":focus-visible");
  } catch {
    return true;
  }
}

export function watchHover(
  element: HTMLElement,
  options: HoverWatchOptions,
  onChange: (active: boolean, source: "pointer" | "focus" | "none") => void,
): () => void {
  let pointer = false;
  let focus = false;
  let last = false;
  const emit = () => {
    const active = pointer || focus;
    if (active === last) return;
    last = active;
    onChange(active, pointer ? "pointer" : focus ? "focus" : "none");
  };
  const untrack = trackPointer(element, {
    get pointerTypes() {
      return options.pointerTypes;
    },
    onMove(sample) {
      if (!pointer) {
        pointer = true;
        emit();
      }
      options.onMove?.(sample);
    },
    onLeave() {
      pointer = false;
      emit();
    },
  });
  const onFocusIn = (event: FocusEvent) => {
    const next = focusVisible(event.target instanceof Element ? event.target : element);
    if (next === focus) return;
    focus = next;
    emit();
  };
  const onFocusOut = (event: FocusEvent) => {
    const next = event.relatedTarget;
    if (next instanceof Node && element.contains(next)) return;
    if (!focus) return;
    focus = false;
    emit();
  };
  if (options.focus !== false) {
    element.addEventListener("focusin", onFocusIn);
    element.addEventListener("focusout", onFocusOut);
  }
  return () => {
    untrack();
    element.removeEventListener("focusin", onFocusIn);
    element.removeEventListener("focusout", onFocusOut);
  };
}

export interface PressPoint {
  /** Position in px from the element's left/top edge (keyboard presses: the centre). */
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly source: "pointer" | "keyboard";
}

export function isDisabled(element: Element): boolean {
  try {
    return element.matches(":disabled, [aria-disabled='true']");
  } catch {
    return element.getAttribute("aria-disabled") === "true";
  }
}

export function watchPress(
  element: HTMLElement,
  onChange: (pressed: boolean, point: PressPoint | undefined) => void,
  options: { pointerTypes?: ReadonlySet<string> } = {},
): () => void {
  let pressed = false;
  const point = (source: PressPoint["source"], event?: PointerEvent): PressPoint => {
    const rect = element.getBoundingClientRect();
    const width = element.offsetWidth || rect.width;
    const height = element.offsetHeight || rect.height;
    if (!event) return { left: width / 2, top: height / 2, width, height, source };
    const scaleX = rect.width ? width / rect.width : 1;
    const scaleY = rect.height ? height / rect.height : 1;
    return {
      left: (event.clientX - rect.left) * scaleX,
      top: (event.clientY - rect.top) * scaleY,
      width,
      height,
      source,
    };
  };
  function release(): void {
    if (!pressed) return;
    pressed = false;
    window.removeEventListener("pointerup", release);
    window.removeEventListener("pointercancel", release);
    onChange(false, undefined);
  }
  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || event.isPrimary === false || pressed || isDisabled(element)) return;
    if (options.pointerTypes && !options.pointerTypes.has(event.pointerType || "mouse")) return;
    pressed = true;
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    onChange(true, point("pointer", event));
  }
  function onKeyDown(event: KeyboardEvent): void {
    if (event.repeat || pressed || event.target !== element || isDisabled(element)) return;
    if (event.key !== " " && event.key !== "Enter") return;
    pressed = true;
    onChange(true, point("keyboard"));
  }
  function onKeyUp(event: KeyboardEvent): void {
    if (event.key === " " || event.key === "Enter") release();
  }
  element.addEventListener("pointerdown", onPointerDown);
  element.addEventListener("keydown", onKeyDown);
  element.addEventListener("keyup", onKeyUp);
  element.addEventListener("blur", release);
  return () => {
    element.removeEventListener("pointerdown", onPointerDown);
    element.removeEventListener("keydown", onKeyDown);
    element.removeEventListener("keyup", onKeyUp);
    element.removeEventListener("blur", release);
    window.removeEventListener("pointerup", release);
    window.removeEventListener("pointercancel", release);
    pressed = false;
  };
}

/** Run `fn` while the page is visible; `onHidden` when it becomes hidden. Returns the unsubscribe. */
export function watchVisibility(onHidden: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  const listener = () => {
    if (document.hidden) onHidden();
  };
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
}

export const pageHidden = (): boolean => typeof document !== "undefined" && document.hidden;
