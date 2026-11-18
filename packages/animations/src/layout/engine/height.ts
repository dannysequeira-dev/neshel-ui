/**
 * Height drivers (Phase 012; contracts/layout-engine.md §6, research R1). The measured driver animates a
 * package-rendered wrapper with a transient WAAPI `height` animation (no fill: when it ends, the element's
 * natural CSS state applies); a change while it runs starts from the current computed height (one read).
 * The CSS driver (`interpolate-size`) is selected only where the behavioural support check passes.
 */
import type { Easing } from "../../core/easing.js";
import { toCssEasing } from "../../core/easing.js";
import { FX_ACTIVE_ATTRIBUTE, toggleToken } from "../../core/tokens.js";

/** Whether `height: auto` can be transitioned with CSS here (research R1: Chromium, WebKit yes; Firefox no). */
export function supportsSizeInterpolation(): boolean {
  return (
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("interpolate-size", "allow-keywords")
  );
}

export interface HeightAnimator {
  /** Animate from `from` px to `to` px (`to` may be `"auto"`-equivalent px of the natural height). */
  run(from: number, to: number, duration: number, easing: Easing, done?: () => void): void;
  /** The height currently shown while an animation runs (one computed-style read), else `undefined`. */
  current(): number | undefined;
  readonly running: boolean;
  cancel(): void;
}

export function createHeightAnimator(element: HTMLElement, token: string): HeightAnimator {
  const active = toggleToken(element, FX_ACTIVE_ATTRIBUTE, token);
  let animation: Animation | undefined;

  function end(): void {
    animation = undefined;
    active(false);
  }

  return {
    run(from, to, duration, easing, done) {
      animation?.cancel();
      animation = undefined;
      if (typeof element.animate !== "function" || duration <= 0 || Math.abs(to - from) < 0.5) {
        end();
        done?.();
        return;
      }
      active(true);
      const current = element.animate([{ height: `${from}px` }, { height: `${to}px` }], {
        duration,
        easing: toCssEasing(easing),
      });
      animation = current;
      current.onfinish = () => {
        if (animation !== current) return;
        end();
        done?.();
      };
      current.oncancel = () => {
        if (animation === current) end();
      };
    },
    current() {
      if (!animation) return undefined;
      const value = Number.parseFloat(getComputedStyle(element).height);
      return Number.isFinite(value) ? value : undefined;
    },
    get running() {
      return animation !== undefined;
    },
    cancel() {
      const current = animation;
      animation = undefined;
      current?.cancel();
      active(false);
    },
  };
}
