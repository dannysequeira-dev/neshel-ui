/**
 * P11 `longPress` — long-press progress (catalogue §3; contracts/api-012.md §3, research R12). Holding the
 * element (primary pointer through the shared pointer session, or Space/Enter) for `duration` calls
 * `onLongPress` exactly once; a package-owned progress layer fills with WAAPI meanwhile. Early release reverses
 * it; moving beyond `moveTolerance`, `pointercancel`, lost capture, blur and a hidden page cancel. The click
 * that follows a completed long press is swallowed, so `onClick` and `onLongPress` never both run for one press.
 */
import { describeElement, devWarnOnce, elementKey } from "../core/dev.js";
import { defineEffect } from "../core/effect.js";
import { isDisabled, watchVisibility } from "../core/interaction.js";
import { type SessionPointer, subscribePointerSession } from "../core/pointer-session.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import { afterDelay } from "../core/springs.js";
import { addToken, FX_ACTIVE_ATTRIBUTE, FX_ATTRIBUTE, toggleToken } from "../core/tokens.js";
import { validator } from "../core/validate.js";

declare const process: { env: { NODE_ENV?: string } } | undefined;

export interface LongPressOptions {
  /** Hold time in ms (200–5000, default 600). */
  duration?: number;
  /** px of pointer movement that cancels (2–50, default 10). */
  moveTolerance?: number;
  /** Keyboard: hold Space/Enter for the duration (`"hold"`, default) or activate on one press (`"press"`). */
  keyboard?: "hold" | "press";
  /** Pointer types that may long-press (default mouse, pen and touch). */
  pointerTypes?: readonly ("mouse" | "pen" | "touch")[];
  /** Called once per completed long press. */
  onLongPress?: (source: "pointer" | "keyboard") => void;
  /** Called when a started press ends without completing. */
  onCancel?: () => void;
  /** Reduced motion keeps a linear, non-vestibular fill (the progress conveys state). Default `"user"`. */
  reducedMotion?: ReducedMotion;
  disabled?: boolean;
}

interface ResolvedLongPress {
  duration: number;
  moveTolerance: number;
  keyboard: "hold" | "press";
  pointerTypes: readonly string[];
  onLongPress: LongPressOptions["onLongPress"];
  onCancel: (() => void) | undefined;
  reducedMotion: ReducedMotion;
  disabled: boolean;
}

const VOID = /^(AREA|BR|COL|EMBED|HR|IMG|INPUT|LINK|META|SOURCE|TRACK|WBR|TEXTAREA|SELECT)$/;
const longV = /* @__PURE__ */ validator("longPress");

export const longPress = /* @__PURE__ */ defineEffect<LongPressOptions, ResolvedLongPress>({
  id: "press/long-press",
  family: "press",
  // Writes only its package-owned progress layer.
  channels: [],
  priority: 0,
  reducedMotion: "reduced",
  resolve(input) {
    const o = longV.options(input);
    const types = o.pointerTypes ?? ["mouse", "pen", "touch"];
    if (!Array.isArray(types) || types.some((t) => !["mouse", "pen", "touch"].includes(t))) {
      longV.fail(`invalid "pointerTypes"; expected an array of: "mouse", "pen", "touch".`);
    }
    return {
      duration: longV.number("duration", o.duration, 600, 200, 5000),
      moveTolerance: longV.number("moveTolerance", o.moveTolerance, 10, 2, 50),
      keyboard: longV.oneOf("keyboard", o.keyboard, ["hold", "press"] as const, "hold"),
      pointerTypes: types,
      onLongPress: longV.callback("onLongPress", o.onLongPress),
      onCancel: longV.callback("onCancel", o.onCancel),
      reducedMotion: longV.reducedMotion(o.reducedMotion),
      disabled: longV.flag("disabled", o.disabled, false),
    };
  },
  policy: (o) => o.reducedMotion,
  setup(context) {
    const element = context.element as HTMLElement;
    const removeToken = addToken(element, FX_ATTRIBUTE, "long-press");
    const activeToken = toggleToken(element, FX_ACTIVE_ATTRIBUTE, "long-press");
    let layer: HTMLElement | undefined;
    if (VOID.test(element.tagName)) {
      if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
        devWarnOnce(
          `long-press-void:${elementKey(element)}`,
          `longPress on ${describeElement(element)} cannot render its progress layer (void element); the long press still works.`,
        );
      }
    } else {
      layer = document.createElement("span");
      layer.className = "neshel-long-press";
      layer.setAttribute("aria-hidden", "true");
      element.append(layer);
    }

    let press:
      | {
          source: "pointer" | "keyboard";
          pointer?: SessionPointer;
          key?: string;
          cancelTimer: () => void;
        }
      | undefined;
    let animation: Animation | undefined;
    let swallow: { remove: () => void } | undefined;

    function fill(forward: boolean): void {
      if (!layer || typeof layer.animate !== "function") return;
      const reduced = context.reduced;
      if (forward) {
        animation?.cancel();
        animation = layer.animate(
          reduced
            ? [
                { transform: "scaleX(1)", opacity: 0.15 },
                { transform: "scaleX(1)", opacity: 1 },
              ]
            : [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
          { duration: context.options.duration, easing: "linear", fill: "forwards" },
        );
        return;
      }
      const current = animation;
      if (!current) return;
      if (reduced) {
        current.cancel();
        animation = undefined;
        return;
      }
      current.playbackRate = -4;
      current.onfinish = () => {
        current.cancel();
        if (animation === current) animation = undefined;
      };
    }
    function clearFill(): void {
      animation?.cancel();
      animation = undefined;
    }

    function begin(source: "pointer" | "keyboard", pointer?: SessionPointer, key?: string): void {
      const o = context.options;
      if (press || o.disabled || isDisabled(element)) return;
      swallow?.remove();
      const cancelTimer = afterDelay(context.scheduler, o.duration, complete);
      press = { source, pointer, key, cancelTimer };
      activeToken(true);
      fill(true);
    }
    function complete(): void {
      const current = press;
      if (!current) return;
      press = undefined;
      activeToken(false);
      armSwallow();
      // Leave the filled layer briefly visible, then clear it (no animation needed).
      afterDelay(context.scheduler, 160, clearFill);
      context.options.onLongPress?.(current.source);
    }
    function cancel(): void {
      const current = press;
      if (!current) return;
      press = undefined;
      current.cancelTimer();
      activeToken(false);
      fill(false);
      context.options.onCancel?.();
    }
    /** Swallow the one click that follows a completed long press (research R12). */
    function armSwallow(): void {
      swallow?.remove();
      const onClick = (event: Event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        remove();
      };
      const timer = setTimeout(() => remove(), 700);
      const remove = () => {
        clearTimeout(timer);
        element.removeEventListener("click", onClick, true);
        if (swallow?.remove === remove) swallow = undefined;
      };
      element.addEventListener("click", onClick, true);
      swallow = { remove };
    }

    const [session, unsubscribe] = subscribePointerSession(element, (type, pointer) => {
      if (type === "down") {
        if (!context.options.pointerTypes.includes(pointer.type)) return;
        if (press) return;
        session.capture(pointer.id);
        begin("pointer", pointer);
        return;
      }
      if (!press || press.pointer?.id !== pointer.id) return;
      if (type === "move") {
        const moved = Math.hypot(pointer.x - pointer.startX, pointer.y - pointer.startY);
        if (moved > context.options.moveTolerance) cancel();
      } else cancel(); // released early, pointercancel or lost capture
    });
    // A long touch opens the context menu on some platforms: not while a press is running on this element.
    const onContextMenu = (event: Event) => {
      if (press?.source === "pointer") event.preventDefault();
    };

    function onKeyDown(event: KeyboardEvent): void {
      if (event.target !== element || (event.key !== " " && event.key !== "Enter")) return;
      const o = context.options;
      if (o.disabled || isDisabled(element)) return;
      if (event.key === "Enter") event.preventDefault(); // Enter would click on keydown (double action)
      if (event.repeat) return;
      if (o.keyboard === "press") {
        if (event.key === " ") event.preventDefault();
        armSwallow();
        o.onLongPress?.("keyboard");
        return;
      }
      begin("keyboard", undefined, event.key);
    }
    function onKeyUp(event: KeyboardEvent): void {
      if (press?.source !== "keyboard" || event.key !== press.key) return;
      const key = press.key;
      cancel();
      // A short Enter press keeps the element's normal activation (prevented on keydown above).
      if (key === "Enter") element.click();
    }
    const onBlur = () => cancel();
    element.addEventListener("keydown", onKeyDown);
    element.addEventListener("keyup", onKeyUp);
    element.addEventListener("blur", onBlur);
    element.addEventListener("contextmenu", onContextMenu);
    const unwatchVisibility = watchVisibility(cancel);

    return {
      update() {},
      destroy() {
        if (press) {
          press.cancelTimer();
          press = undefined;
        }
        unsubscribe();
        unwatchVisibility();
        element.removeEventListener("keydown", onKeyDown);
        element.removeEventListener("keyup", onKeyUp);
        element.removeEventListener("blur", onBlur);
        element.removeEventListener("contextmenu", onContextMenu);
        swallow?.remove();
        clearFill();
        layer?.remove();
        activeToken(false);
        removeToken();
      },
    };
  },
});
