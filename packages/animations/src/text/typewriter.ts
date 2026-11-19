/**
 * T02 — Typewriter (catalogue §10, structure S; contracts/text-api.md §3). The complete text is in the
 * accessible copy from the start; the visual clusters appear one by one from a single progress value
 * (`--neshel-type-progress`, CSS step math), so hidden clusters keep their space (stable layout). The caret
 * is a package pseudo-element on the boundary cluster (`data-caret`, `aria-hidden` with its root), solid while
 * typing, blinking at rest only for `caret: "always"` (at most five blinks) and never under reduced motion.
 * Duration follows the text length: `graphemes / speed` (unless `duration` is given).
 */
import {
  createTextEffect,
  type ProgressControl,
  type TextEffect,
  type TextEffectOptions,
} from "./engine/effect.js";

export interface TypewriterOptions extends TextEffectOptions {
  /** Graphemes per second (1–200; default 30). */
  speed?: number;
  /** `"typing"` (default): caret while typing; `"always"`: also at rest; `"none"`. */
  caret?: "typing" | "always" | "none";
  locale?: string;
  maxPieces?: number;
}

export interface TypewriterControl extends ProgressControl {
  /** `seek(0)` then `play()`. */
  restart(): void;
}

const CARETS = ["typing", "always", "none"] as const;

export function createTypewriter(
  element: HTMLElement,
  options: TypewriterOptions = {},
): TypewriterControl {
  const speed = options?.speed ?? 30;
  if (typeof speed !== "number" || !(speed >= 1 && speed <= 200)) {
    throw new TypeError('createTypewriter: "speed" must be a number from 1 to 200.');
  }
  const caret = options?.caret ?? "typing";
  if (!CARETS.includes(caret)) {
    throw new TypeError(`createTypewriter: invalid caret ${JSON.stringify(caret)}`);
  }
  let pieces: readonly HTMLElement[] = [];
  let root: HTMLElement | undefined;
  let caretAt: HTMLElement | undefined;
  let typing = false;
  let ref: TextEffect | undefined;

  function placeCaret(progress: number): void {
    const n = pieces.length;
    const count = Math.max(0, Math.min(n, Math.ceil(progress * n - 1e-5)));
    const show = caret === "always" || (caret === "typing" && typing);
    // Before the first cluster the caret is the visual root's ::before (a hidden piece cannot show it).
    const next = !show || n === 0 ? undefined : count <= 0 ? root : pieces[count - 1];
    const mode = typing ? "typing" : "rest";
    if (next === caretAt && next?.getAttribute("data-caret") === mode) return;
    caretAt?.removeAttribute("data-caret");
    caretAt = next;
    caretAt?.setAttribute("data-caret", mode);
  }

  const effect = createTextEffect(element, options, {
    name: "createTypewriter",
    token: "typewriter",
    property: "--neshel-type-progress",
    split: { split: "chars", locale: options?.locale, maxPieces: options?.maxPieces },
    defaults: { duration: 1000, easing: "linear" },
    durationFor: (n) => Math.min(60_000, Math.max(16, (n / speed) * 1000)),
    render(progress) {
      typing = ref?.driver.state === "running";
      placeCaret(progress);
    },
    onSettle() {
      typing = false;
      placeCaret(ref?.driver.progress ?? 1);
    },
  });
  ref = effect;
  pieces = effect.split?.pieces ?? [];
  root = effect.split?.root ?? undefined;
  placeCaret(effect.driver.progress);
  effect.onDestroy(() => caretAt?.removeAttribute("data-caret"));
  const control = effect.control as TypewriterControl;
  const play = control.play;
  control.play = () => {
    play();
    typing = effect.driver.state === "running";
    placeCaret(effect.driver.progress);
  };
  control.restart = () => {
    control.seek(0);
    control.play();
  };
  return control;
}
