/**
 * T06 — Rotating words (catalogue §10, structure S; contracts/text-api.md §3). The package renders the
 * words stacked in one grid cell inside the element, so the box always fits the largest word (no layout
 * shift at any width); the accessible copy is `accessibleText` (default: the words joined by ", "), never a
 * live region. The rotation is a deterministic function of the loop time: word `floor(t / interval) mod n`,
 * swap progress `(t mod interval) / duration` written as `--neshel-rotate-progress`. It pauses on hover/focus
 * (default), off-screen and on hidden pages; reduced motion (`static`) shows the first word.
 */
import {
  createLoopTextEffect,
  type LoopEffectControl,
  type LoopTextOptions,
} from "./engine/loop-effect.js";

export interface RotatingWordsOptions extends Omit<LoopTextOptions, "duration"> {
  words: readonly string[];
  /** ms each word stays (1000–20000; default 2500). */
  interval?: number;
  /** Swap transition ms (0–2000; default 450). */
  duration?: number;
  variant?: "slide-up" | "slide-down" | "fade";
  /** Pause while hovered or focused (default true). */
  pauseOnHover?: boolean;
  /** Accessible text (default: the words joined by ", "). */
  accessibleText?: string;
}

export interface RotatingWordsControl extends LoopEffectControl {
  /** Index of the word currently shown. */
  readonly index: number;
}

const A11Y_STYLE =
  "position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;user-select:none;-webkit-user-select:none";

export function createRotatingWords(
  element: HTMLElement,
  options: RotatingWordsOptions,
): RotatingWordsControl {
  if (!element || element.nodeType !== 1)
    throw new TypeError("createRotatingWords: element must be an HTML element");
  const words = options?.words;
  if (
    !Array.isArray(words) ||
    words.length < 1 ||
    words.some((w) => typeof w !== "string" || !w.trim())
  )
    throw new TypeError(
      'createRotatingWords: "words" must be a non-empty array of non-empty strings.',
    );
  const interval = options.interval ?? 2500;
  const swap = options.duration ?? 450;
  if (typeof interval !== "number" || !(interval >= 1000 && interval <= 20000))
    throw new TypeError('createRotatingWords: "interval" must be from 1000 to 20000.');
  if (typeof swap !== "number" || !(swap >= 0 && swap <= Math.min(2000, interval)))
    throw new TypeError('createRotatingWords: "duration" must be from 0 to min(2000, interval).');
  const variant = options.variant ?? "slide-up";
  if (!["slide-up", "slide-down", "fade"].includes(variant))
    throw new TypeError(`createRotatingWords: invalid variant ${JSON.stringify(variant)}`);
  const doc = element.ownerDocument;
  const originals = [...element.childNodes];
  const a11y = doc.createElement("span");
  a11y.className = "neshel-text-a11y";
  a11y.setAttribute("style", A11Y_STYLE);
  a11y.textContent = options.accessibleText ?? words.join(", ");
  const stack = doc.createElement("span");
  stack.className = "neshel-rotator";
  stack.setAttribute("aria-hidden", "true");
  stack.setAttribute("data-variant", variant);
  stack.style.display = "inline-grid";
  const items = words.map((word, i) => {
    const item = doc.createElement("span");
    item.className = "neshel-rotator-word";
    item.textContent = word;
    item.style.gridArea = "1 / 1";
    item.style.whiteSpace = "nowrap";
    if (i !== 0) item.style.visibility = "hidden";
    stack.appendChild(item);
    return item;
  });
  for (const node of originals) node.parentNode?.removeChild(node);
  element.append(a11y, stack);
  let current = 0;
  let previous = -1;
  const show = (index: number, leaving: number) => {
    if (index === current && leaving === previous) return;
    current = index;
    previous = leaving;
    items.forEach((item, i) => {
      const state = i === index ? "current" : i === leaving ? "leaving" : undefined;
      if (state) item.setAttribute("data-state", state);
      else item.removeAttribute("data-state");
      item.style.visibility = state ? "" : "hidden";
    });
  };
  show(0, -1);
  const n = words.length;
  const effect = createLoopTextEffect(
    stack,
    element,
    { ...options, duration: interval * n, repeat: options.repeat ?? 0 },
    {
      name: "createRotatingWords",
      token: "rotate-words",
      channels: ["--neshel-rotate-progress"],
      defaults: { duration: interval * n, repeat: 0, minDuration: 1000 },
      frame(time) {
        const step = Math.floor(time / interval);
        const index = step % n;
        const local = time - step * interval;
        const p = swap === 0 ? 1 : Math.min(1, local / swap);
        show(index, step === 0 || p >= 1 ? -1 : (index - 1 + n) % n);
        return { "--neshel-rotate-progress": String(Math.round(p * 10000) / 10000) };
      },
      rest() {
        show(0, -1);
        return { "--neshel-rotate-progress": undefined };
      },
    },
  );
  const control = effect.control;
  const basePause = control.pause;
  const basePlay = control.play;
  let userPaused = false;
  let held = false;
  if (options.pauseOnHover !== false) {
    const hold = () => {
      if (held) return;
      held = true;
      if (control.state === "running") basePause();
    };
    const resume = () => {
      if (!held || element.matches(":hover") || element.contains(doc.activeElement)) return;
      held = false;
      if (!userPaused && control.state === "paused") basePlay();
    };
    element.addEventListener("pointerenter", hold);
    element.addEventListener("pointerleave", resume);
    element.addEventListener("focusin", hold);
    element.addEventListener("focusout", () => queueMicrotask(resume));
    effect.onDestroy(() => {
      element.removeEventListener("pointerenter", hold);
      element.removeEventListener("pointerleave", resume);
      element.removeEventListener("focusin", hold);
    });
  }
  effect.onDestroy(() => {
    // Defensive: React may have replaced the element's text meanwhile (then nothing is restored).
    if (stack.parentNode !== element) return;
    a11y.remove();
    stack.remove();
    for (const node of originals) element.appendChild(node);
  });
  control.pause = () => {
    userPaused = true;
    basePause();
  };
  control.play = () => {
    userPaused = false;
    basePlay();
  };
  Object.defineProperty(control, "index", { get: () => current, enumerable: true });
  return control as RotatingWordsControl;
}
