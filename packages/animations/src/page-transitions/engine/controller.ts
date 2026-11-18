/**
 * `startPageTransition` — PT01–PT06 driver (contracts/page-transitions.md §2, ADR 0028 §5).
 *
 * Native first: when same-document View Transitions are supported, motion is allowed for the effect and the
 * page is visible, the update runs inside `document.startViewTransition`; effects are CSS animations of the
 * browser's snapshot pseudo-elements keyed on `view-transition-class` (`neshel-pt-<effect>`). Otherwise the
 * update runs directly — navigation never waits for an effect. One transition per document: a newer call
 * interrupts the active one (`interrupted`). Rendering may be held by the browser only for `maxWait` ms;
 * after that the transition is skipped and the update keeps running. Names, classes and `<html>`
 * attributes exist only during the transition and are restored exactly afterwards.
 */
import { createFlipAnimator } from "../../core/flip.js";
import { getMotionHost } from "../../core/host.js";
import { type Box, measureBox } from "../../core/layout-box.js";
import {
  prefersReducedMotion,
  type ReducedMotion,
  shouldReduceMotion,
} from "../../core/reduced-motion.js";
import { getFrameScheduler } from "../../core/scheduler.js";
import { validator } from "../../core/validate.js";
import { currentDirection, DIRECTION_ATTRIBUTE, type NavigationDirection } from "./direction.js";
import { createNameWrites, cssName, currentOwners } from "./names.js";
import { getViewTransitionSupport } from "./support.js";

export type PageEffect = "fade" | "slide" | "scale" | "wipe" | "none";
export const PAGE_EFFECTS: readonly PageEffect[] = ["fade", "slide", "scale", "wipe", "none"];
export const EFFECT_ATTRIBUTE = "data-neshel-pt-effect";

/** Reduced behaviour per effect (catalogue §8): `instant` skips the transition, `fade` cross-fades. */
const REDUCED: Record<PageEffect, "instant" | "fade"> = {
  fade: "instant",
  slide: "fade",
  scale: "fade",
  wipe: "instant",
  none: "instant",
};

export interface PageTransitionOptions {
  effect?: PageEffect;
  direction?: NavigationDirection | "auto";
  /** Element whose content changes (default: the document root). */
  scope?: Element;
  types?: readonly string[];
  reducedMotion?: ReducedMotion;
  /** ms the browser may hold rendering for the update (0–10000, default 1500). */
  maxWait?: number;
  /** Shared elements without the API: FLIP from the old box (default `"none"`). */
  fallback?: "none" | "flip";
}

export interface PageTransitionResult {
  status: "completed" | "skipped" | "interrupted";
  native: boolean;
  direction: NavigationDirection;
}

export type PageTransitionState =
  | "pending"
  | "updating"
  | "animating"
  | "completed"
  | "skipped"
  | "interrupted"
  | "failed";

export interface PageTransition {
  readonly native: boolean;
  readonly state: PageTransitionState;
  readonly direction: NavigationDirection;
  /** Resolves when the update ran (rejects with its error). */
  readonly updated: Promise<void>;
  /** Resolves when everything is cleaned up; rejects only when the update failed. */
  readonly finished: Promise<PageTransitionResult>;
  skip(): void;
}

interface ViewTransitionLike {
  ready: Promise<void>;
  finished: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition(): void;
}

type StartViewTransition = (
  arg: (() => Promise<void>) | { update: () => Promise<void>; types?: string[] },
) => ViewTransitionLike;

const v = /* @__PURE__ */ validator("startPageTransition");
let active: { interrupt(): void } | undefined;

function settleable<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Run the update; FLIP shared elements from their old boxes when asked (fallback path). */
async function runFallback(update: () => void | Promise<void>, flip: boolean): Promise<boolean> {
  const before = new Map<string, { element: Element; box: Box }>();
  if (flip) {
    for (const [name, entry] of currentOwners()) {
      before.set(name, { element: entry.element, box: measureBox(entry.element) });
    }
  }
  await update();
  if (!flip || before.size === 0) return false;
  let animated = false;
  const scheduler = getFrameScheduler();
  for (const [name, entry] of currentOwners()) {
    const old = before.get(name);
    if (!old) continue;
    const last = measureBox(entry.element);
    const host = getMotionHost(entry.element as Element & { style: CSSStyleDeclaration });
    const key = Symbol("page/shared-flip");
    const animator = createFlipAnimator(
      scheduler,
      { type: "tween", duration: 320, easing: (t: number) => 1 - (1 - t) ** 3 },
      (layer) => host.setLayer(key, layer),
    );
    animator.from(old.box, last, "both");
    animated = true;
  }
  return animated;
}

export function startPageTransition(
  update: () => void | Promise<void>,
  options: PageTransitionOptions = {},
): PageTransition {
  if (typeof update !== "function") v.fail('"update" must be a function.');
  const o = v.options(options);
  const effect = v.oneOf("effect", o.effect, PAGE_EFFECTS, "fade");
  const policy = v.reducedMotion(o.reducedMotion);
  const maxWait = v.number("maxWait", o.maxWait, 1500, 0, 10000);
  const fallback = v.oneOf("fallback", o.fallback, ["none", "flip"] as const, "none");
  const requested = o.direction ?? "auto";
  const direction: NavigationDirection =
    requested === "auto"
      ? currentDirection()
      : v.oneOf(
          "direction",
          requested,
          ["forward", "back", "replace", "unknown"] as const,
          "unknown",
        );
  const types = (o.types ?? []).map((type) => {
    if (typeof type !== "string" || !/^[a-z][a-z0-9-]*$/.test(type))
      v.fail(`invalid type ${JSON.stringify(type)}.`);
    return type;
  });

  active?.interrupt();
  const updated = settleable<void>();
  const finished = settleable<PageTransitionResult>();
  updated.promise.catch(() => {});
  let state: PageTransitionState = "pending";
  let done = false;
  let native = false;
  let vt: ViewTransitionLike | undefined;
  let skipped = false;
  const writes = createNameWrites("page/transition");
  const root = typeof document !== "undefined" ? document.documentElement : undefined;
  const saved = root
    ? {
        effect: root.getAttribute(EFFECT_ATTRIBUTE),
        direction: root.getAttribute(DIRECTION_ATTRIBUTE),
      }
    : undefined;

  function restoreAttributes(): void {
    if (!root || !saved) return;
    if (saved.effect === null) root.removeAttribute(EFFECT_ATTRIBUTE);
    else root.setAttribute(EFFECT_ATTRIBUTE, saved.effect);
    // The direction attribute belongs to the tracker when one runs: keep its latest value.
    if (saved.direction === null && root.getAttribute(DIRECTION_ATTRIBUTE) === direction) {
      root.removeAttribute(DIRECTION_ATTRIBUTE);
    }
  }

  function settle(status: PageTransitionResult["status"]): void {
    if (done) return;
    done = true;
    state = status;
    writes.release();
    restoreAttributes();
    if (active === entry) active = undefined;
    finished.resolve({ status, native, direction });
  }

  function fail(error: unknown): void {
    if (done) return;
    done = true;
    state = "failed";
    writes.release();
    restoreAttributes();
    if (active === entry) active = undefined;
    finished.reject(error);
  }

  const entry = {
    interrupt() {
      if (done) return;
      vt?.skipTransition();
      settle("interrupted");
    },
  };
  active = entry;

  const support = getViewTransitionSupport();
  const reduced = shouldReduceMotion(policy, prefersReducedMotion());
  const behaviour = reduced ? REDUCED[effect] : undefined;
  const hidden = typeof document !== "undefined" && document.hidden;
  const useNative = support.sameDocument && behaviour !== "instant" && !hidden;
  const shownEffect: PageEffect = behaviour === "fade" ? "fade" : effect;

  if (!useNative) {
    state = "updating";
    Promise.resolve()
      .then(() => runFallback(update, fallback === "flip" && !reduced && !hidden))
      .then(
        (animated) => {
          updated.resolve();
          settle(animated ? "completed" : "skipped");
        },
        (error) => {
          updated.reject(error);
          fail(error);
        },
      );
    return api();
  }

  // Native path: classes, attributes and the old elements' names, flushed before the capture.
  native = true;
  const scope = o.scope ?? root;
  const scopeClass = `neshel-pt-${shownEffect}`;
  if (scope && scope !== root) writes.write(scope, "neshel-page", scopeClass);
  else if (root) writes.write(root, undefined, scopeClass);
  root?.setAttribute(EFFECT_ATTRIBUTE, shownEffect);
  root?.setAttribute(DIRECTION_ATTRIBUTE, direction);
  const before = currentOwners();
  for (const [name, owner] of before) {
    writes.write(
      owner.element,
      cssName(name),
      owner.persist ? "neshel-pt-persist" : "neshel-pt-morph",
    );
  }

  const wrapped = async () => {
    state = "updating";
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = Promise.resolve().then(update);
    run.then(
      () => updated.resolve(),
      (error) => updated.reject(error),
    );
    const timeout = new Promise<"timeout">((resolve) => {
      timer = setTimeout(() => resolve("timeout"), maxWait);
    });
    const outcome = await Promise.race([run.then(() => "done" as const), timeout]);
    clearTimeout(timer);
    if (outcome === "timeout") {
      // Unfreeze rendering: the transition is skipped, the update keeps running.
      skipped = true;
      vt?.skipTransition();
      return;
    }
    if (done) return;
    // Move names from the old elements to the new ones (old first: never two elements with one name).
    const after = currentOwners();
    for (const [name, owner] of before) {
      if (after.get(name)?.element !== owner.element) writes.clear(owner.element);
    }
    for (const [name, owner] of after) {
      writes.write(
        owner.element,
        cssName(name),
        owner.persist ? "neshel-pt-persist" : "neshel-pt-morph",
      );
    }
  };

  const start = (document as unknown as { startViewTransition: StartViewTransition })
    .startViewTransition;
  const allTypes = [`neshel-${shownEffect}`, `neshel-${direction}`, ...types];
  try {
    vt = support.types
      ? start.call(document, { update: wrapped, types: allTypes })
      : start.call(document, wrapped);
  } catch (error) {
    // The platform refused (e.g. hidden document): run the update without a transition.
    native = false;
    writes.release();
    Promise.resolve()
      .then(update)
      .then(
        () => {
          updated.resolve();
          settle("skipped");
        },
        (failure) => {
          updated.reject(failure);
          fail(failure);
        },
      );
    void error;
    return api();
  }
  vt.ready.then(
    () => {
      if (!done) state = "animating";
    },
    () => {},
  );
  vt.updateCallbackDone.catch(() => {});
  vt.finished.then(
    () => {
      updated.promise.then(
        () => settle(state === "animating" && !skipped ? "completed" : "skipped"),
        (error) => fail(error),
      );
    },
    () => {
      // `finished` rejects when the update callback failed; a skipped transition resolves.
      updated.promise.then(
        () => settle("skipped"),
        (error) => fail(error),
      );
    },
  );
  return api();

  function api(): PageTransition {
    return {
      get native() {
        return native;
      },
      get state() {
        return state;
      },
      direction,
      updated: updated.promise,
      finished: finished.promise,
      skip() {
        skipped = true;
        vt?.skipTransition();
      },
    };
  }
}
