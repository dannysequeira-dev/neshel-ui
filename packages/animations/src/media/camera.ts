/**
 * M01 Ken Burns and M10 hover pan (catalogue §12; contracts/media-api.md, research R2, R9). Both move the media
 * element inside a clipping frame through the exclusive `scale` and `translate` host channels (captured and
 * restored by the Motion Host ledger). Positions are unit fractions of the pan allowance `(scale − 1) × 50 %`,
 * so no option value can uncover an edge, and scale is uniform, so nothing distorts. Percentages refer to the
 * media's own box: no layout read, correct after resizes.
 */
import { type ChannelWriter, createChannelWriter } from "../core/channel.js";
import { isProduction } from "../core/dev.js";
import { trackPointer } from "../core/pointer.js";
import {
  createProgressEffect,
  type ProgressControl,
  type ProgressEffectOptions,
} from "../core/progress-effect.js";
import {
  prefersReducedMotion,
  type ReducedMotion,
  shouldReduceMotion,
  subscribeReducedMotion,
} from "../core/reduced-motion.js";
import { getFrameScheduler } from "../core/scheduler.js";
import type { SpringOptions } from "../core/spring.js";
import { createSpringRig } from "../core/springs.js";
import { validator } from "../core/validate.js";
import { counters } from "./engine/debug.js";

type Styled = Element & { readonly style: CSSStyleDeclaration };

export interface CameraPose {
  /** Uniform zoom 1–3. */
  scale?: number;
  /** −1 (left) … 1 (right) of the pan allowance. */
  x?: number;
  /** −1 (top) … 1 (bottom) of the pan allowance. */
  y?: number;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Bounded pose → channel values (`translate` in % of the media box). */
export function cameraValues(
  scale: number,
  x: number,
  y: number,
): { scale: string; translate: string } {
  const allowance = (Math.max(1, scale) - 1) * 50;
  const clampUnit = (n: number) => Math.min(1, Math.max(-1, n));
  return {
    scale: String(round(Math.max(1, scale))),
    translate: `${round(-clampUnit(x) * allowance)}% ${round(-clampUnit(y) * allowance)}%`,
  };
}

function writeCamera(writer: ChannelWriter, scale: number, x: number, y: number): void {
  const values = cameraValues(scale, x, y);
  writer.set("scale", values.scale);
  writer.set("translate", values.translate);
}

export interface KenBurnsOptions extends ProgressEffectOptions {
  /** Start pose (default `{ scale: 1.05, x: 0, y: 0 }`). */
  from?: CameraPose;
  /** End pose (default `{ scale: 1.18, x: 0.4, y: -0.3 }`). */
  to?: CameraPose;
  /** Extra runs (0–1000 or `Infinity`, explicit; default 0). Paused off-screen and on hidden pages. */
  repeat?: number;
  /** Alternate direction between runs (default true). */
  yoyo?: boolean;
}

/** M01 — slow bounded camera move over an image or video inside a clipping frame. */
export function createKenBurns(media: Element, options: KenBurnsOptions = {}): ProgressControl {
  const v = validator("createKenBurns");
  if (!media || media.nodeType !== 1) v.fail('"media" must be an element.');
  const pose = (name: string, p: CameraPose | undefined, fallback: Required<CameraPose>) => ({
    scale: v.number(`${name}.scale`, p?.scale, fallback.scale, 1, 3),
    x: v.number(`${name}.x`, p?.x, fallback.x, -1, 1),
    y: v.number(`${name}.y`, p?.y, fallback.y, -1, 1),
  });
  const from = pose("from", options.from, { scale: 1.05, x: 0, y: 0 });
  const to = pose("to", options.to, { scale: 1.18, x: 0.4, y: -0.3 });
  const repeat =
    options.repeat === Number.POSITIVE_INFINITY
      ? options.repeat
      : v.number("repeat", options.repeat, 0, 0, 1000);
  const writer = createChannelWriter(media as Styled, ["scale", "translate"], {
    id: "media/ken-burns",
  });
  let reduced = false;
  const effect = createProgressEffect(
    media,
    { duration: 9000, ...options },
    {
      name: "createKenBurns",
      defaults: { duration: 9000, easing: "linear" },
      repeat,
      yoyo: options.yoyo !== false,
      render(p) {
        // Reduced motion (catalogue `static`): the decorative camera is removed, the whole image shown.
        if (reduced) {
          writer.release();
          return;
        }
        writeCamera(
          writer,
          from.scale + (to.scale - from.scale) * p,
          from.x + (to.x - from.x) * p,
          from.y + (to.y - from.y) * p,
        );
      },
      onReduced(next) {
        reduced = next;
        effect.driver.refresh();
      },
    },
    counters,
  );
  reduced = effect.driver.reduced();
  if (reduced) writer.release();
  effect.onDestroy(() => writer.release());
  return effect.control;
}

export interface HoverPanOptions {
  /** The element that moves (default: the frame's first element child). */
  media?: Element;
  /** Zoom while hovering 1.05–3 (default 1.4). */
  scale?: number;
  spring?: SpringOptions;
  /** Pointer types that pan (default mouse and pen; touch scrolls the page). */
  pointerTypes?: readonly ("mouse" | "pen" | "touch")[];
  /** Focusable frame with arrow-key panning (for images whose detail is information; needs a name). */
  keyboard?: boolean;
  /** Keyboard step as a fraction of the pan range (0.02–0.5, default 0.1). */
  step?: number;
  reducedMotion?: ReducedMotion;
}

export interface HoverPanControl {
  /** Back to the rest pose. */
  reset(): void;
  destroy(): void;
}

/** M10 — the media follows the pointer inside its frame (bounded, springy, restored on leave). */
export function createHoverPan(frame: HTMLElement, options: HoverPanOptions = {}): HoverPanControl {
  const v = validator("createHoverPan");
  if (!frame || frame.nodeType !== 1) v.fail('"frame" must be an element.');
  const media = options.media ?? frame.firstElementChild;
  if (!media) v.fail("the frame has no media element.");
  const zoom = v.number("scale", options.scale, 1.4, 1.05, 3);
  const spring = v.spring(options.spring, { stiffness: 220, damping: 28 });
  const step = v.number("step", options.step, 0.1, 0.02, 0.5);
  const keyboard = v.flag("keyboard", options.keyboard, false);
  const policy = v.reducedMotion(options.reducedMotion);
  const types = new Set<string>(options.pointerTypes ?? ["mouse", "pen"]);
  const writer = createChannelWriter(media as Styled, ["scale", "translate"], {
    id: "media/hover-pan",
  });
  let systemReduced = prefersReducedMotion();
  const reduced = () => shouldReduceMotion(policy, systemReduced);
  counters.effects++;
  const rig = createSpringRig(
    getFrameScheduler(),
    { s: 1, x: 0, y: 0 },
    spring,
    (values, settled) => {
      if (settled && values.s <= 1.0005) writer.release();
      else writeCamera(writer, values.s, values.x, values.y);
    },
  );
  const rest = () => rig.to({ s: 1, x: 0, y: 0 });
  const untrack = trackPointer(frame, {
    pointerTypes: types,
    onMove(sample) {
      if (reduced()) return;
      // The pointer at the right edge shows the right edge: the media moves opposite to the pointer.
      rig.to({ s: zoom, x: sample.x, y: sample.y });
    },
    onLeave: rest,
  });
  const cleanups: Array<() => void> = [untrack];
  let keyPos = { x: 0, y: 0 };
  if (keyboard) {
    if (!frame.hasAttribute("tabindex")) {
      frame.setAttribute("tabindex", "0");
      cleanups.push(() => frame.removeAttribute("tabindex"));
    }
    if (
      !isProduction() &&
      !frame.getAttribute("aria-label") &&
      !frame.getAttribute("aria-labelledby")
    ) {
      v.fail('"keyboard: true" needs an accessible name on the frame (aria-label/labelledby).');
    }
    const onKey = (event: KeyboardEvent) => {
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const move = moves[event.key];
      if (move) {
        event.preventDefault();
        keyPos = {
          x: Math.min(1, Math.max(-1, keyPos.x + move[0])),
          y: Math.min(1, Math.max(-1, keyPos.y + move[1])),
        };
        if (reduced()) return;
        rig.to({ s: zoom, ...keyPos });
      } else if (event.key === "Escape" || event.key === "Home") {
        keyPos = { x: 0, y: 0 };
        rest();
      }
    };
    const onBlur = () => {
      keyPos = { x: 0, y: 0 };
      rest();
    };
    frame.addEventListener("keydown", onKey);
    frame.addEventListener("blur", onBlur);
    cleanups.push(() => {
      frame.removeEventListener("keydown", onKey);
      frame.removeEventListener("blur", onBlur);
    });
  }
  cleanups.push(
    subscribeReducedMotion((next) => {
      systemReduced = next;
      if (reduced()) {
        rig.stop();
        rig.set({ s: 1, x: 0, y: 0 });
        writer.release();
      }
    }),
  );
  let destroyed = false;
  return {
    reset() {
      if (destroyed) return;
      keyPos = { x: 0, y: 0 };
      rest();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const fn of cleanups.splice(0).reverse()) fn();
      rig.stop();
      writer.release();
      counters.effects--;
    },
  };
}
