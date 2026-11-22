/**
 * M02 blur-up progressive load and M03 reveal mask on load (catalogue §12; contracts/media-api.md §3, research
 * R1). Never-invisible rules: only an image that is still `loading` when the effect attaches is hidden; a
 * load error, the `revealTimeout`, reduced motion (instant) and `destroy()` always reveal it; an image that is
 * already loaded (cache, SSR, before hydration) is shown at once unless `replay: true`. A later source change
 * never hides an image that was already shown. Native attributes are never written; the image's styles change
 * only through its Motion Host (host opacity, exclusive `clip-path`), restored exactly.
 */
import { createChannelWriter } from "../core/channel.js";
import type { Easing, EasingPreset } from "../core/easing.js";
import { getMotionHost } from "../core/host.js";
import { type ImageLoadState, watchImage } from "../core/media-load.js";
import { createProgressDriver, type ProgressDriver } from "../core/progress-driver.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import { type Validator, validator } from "../core/validate.js";
import { counters } from "./engine/debug.js";

type Styled = Element & { readonly style: CSSStyleDeclaration };

export type MediaRevealState = "loading" | "revealing" | "shown" | "error";

export interface MediaRevealControl {
  readonly state: MediaRevealState;
  /** Show the image now (no animation). */
  reveal(): void;
  destroy(): void;
}

export interface MediaRevealOptions {
  /** ms (0–10000; default per effect). */
  duration?: number;
  easing?: Easing | EasingPreset;
  /** Animate an image that is already loaded at attach time (default false: shown at once). */
  replay?: boolean;
  /** ms after which a still-loading image is revealed anyway (500–60000, default 8000). */
  revealTimeout?: number;
  reducedMotion?: ReducedMotion;
  onStateChange?(state: MediaRevealState): void;
}

interface RevealHooks {
  /** Hide the image (loading). */
  hide(): void;
  /** Render the reveal progress 0–1. */
  render(progress: number): void;
  /** Restore everything (shown/error/destroy). */
  clear(): void;
}

function attachReveal(
  img: HTMLImageElement,
  options: MediaRevealOptions,
  v: Validator,
  defaults: { duration: number; easing: Easing | EasingPreset },
  hooks: RevealHooks,
): MediaRevealControl {
  const duration = v.duration("duration", options.duration, defaults.duration);
  const easing = options.easing === undefined ? defaults.easing : v.easing(options.easing);
  const replay = v.flag("replay", options.replay, false);
  const timeoutMs = v.number("revealTimeout", options.revealTimeout, 8000, 500, 60000);
  const policy = v.reducedMotion(options.reducedMotion);
  const onState = v.callback<(state: MediaRevealState) => void>(
    "onStateChange",
    options.onStateChange,
  );
  let state: MediaRevealState = "loading";
  let hidden = false;
  let destroyed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let driver: ProgressDriver | undefined;
  counters.effects++;

  const set = (next: MediaRevealState) => {
    if (state === next) return;
    state = next;
    onState?.(next);
  };
  const unhide = () => {
    if (!hidden) return;
    hidden = false;
    counters.hidden--;
  };
  const clearTimer = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  function showNow(final: MediaRevealState): void {
    clearTimer();
    driver?.destroy();
    driver = undefined;
    hooks.clear();
    unhide();
    set(final);
  }
  function animate(): void {
    clearTimer();
    set("revealing");
    driver = createProgressDriver({
      duration,
      easing,
      reducedMotion: policy,
      render: (p) => hooks.render(p),
      onComplete: () => {
        if (!destroyed) showNow("shown");
      },
    });
    if (driver.reduced()) {
      showNow("shown");
      return;
    }
    driver.play();
  }
  const onLoad = (next: ImageLoadState) => {
    if (destroyed) return;
    if (next === "error") showNow("error");
    else if (next === "loaded") {
      if (hidden) animate();
      else if (state === "loading") set("shown");
    }
    // `loading` after a shown image (source change): never hide again.
  };

  // Decide BEFORE subscribing: hide only what is still loading now (or replay an already loaded image).
  const initiallyLoaded = img.complete && img.naturalWidth > 0;
  if (!initiallyLoaded || replay) {
    const broken = img.complete && img.naturalWidth === 0 && Boolean(img.currentSrc || img.src);
    if (!broken) {
      hidden = true;
      counters.hidden++;
      hooks.hide();
      hooks.render(0);
      timer = setTimeout(() => {
        timer = undefined;
        if (!destroyed && hidden && state === "loading") showNow("shown");
      }, timeoutMs);
    }
  }
  const unwatch = watchImage(img, (next) => {
    if (next === "loaded" && hidden && initiallyLoaded && replay && state === "loading") {
      animate();
      return;
    }
    onLoad(next);
  });

  return {
    get state() {
      return state;
    },
    reveal() {
      if (!destroyed && state !== "shown" && state !== "error") showNow("shown");
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unwatch();
      clearTimer();
      driver?.destroy();
      driver = undefined;
      hooks.clear();
      unhide();
      counters.effects--;
    },
  };
}

function imageIn(scope: Element, given: Element | undefined, v: Validator): HTMLImageElement {
  const img = (given ??
    (scope.tagName === "IMG" ? scope : scope.querySelector("img"))) as HTMLImageElement | null;
  if (!img || img.tagName !== "IMG") v.fail("expected an <img> (or a frame containing one).");
  return img as HTMLImageElement;
}

/** A CSS image/colour, or a URL turned into `url("…")`. */
function placeholderValue(value: string): string {
  if (/^(?:data:|https?:|blob:|\/|\.\.?\/)/.test(value))
    return `url("${value.replace(/"/g, "%22")}")`;
  return value;
}

export interface BlurUpOptions extends MediaRevealOptions {
  /** The image (default: the frame's first `img`). */
  image?: HTMLImageElement;
  /** Placeholder: a tiny image URL/data URI, a CSS gradient or a colour (default a neutral tint). */
  placeholder?: string;
  /** Placeholder blur in px (0–40, default 16). */
  blur?: number;
}

/** M02 — a blurred placeholder layer fades out as the decoded image fades in. */
export function createBlurUp(frame: HTMLElement, options: BlurUpOptions = {}): MediaRevealControl {
  const v = validator("createBlurUp");
  if (!frame || frame.nodeType !== 1) v.fail('"frame" must be an element.');
  const img = imageIn(frame, options.image, v);
  const placeholder = placeholderValue(
    v.css("placeholder", options.placeholder, "color-mix(in srgb, currentColor 12%, transparent)"),
  );
  const blur = v.number("blur", options.blur, 16, 0, 40);
  const host = getMotionHost(img as Styled);
  const key = Symbol("media/blur-up");
  let layer: HTMLSpanElement | undefined;
  let layerKey: symbol | undefined;
  return attachReveal(
    img,
    options,
    v,
    { duration: 400, easing: "standard" },
    {
      hide() {
        layer = frame.ownerDocument.createElement("span");
        layer.className = "neshel-blurup-layer";
        layer.setAttribute("aria-hidden", "true");
        // Inline so the placeholder works without media.css (scaled to hide the blurred edges).
        layer.setAttribute(
          "style",
          `position:absolute;inset:0;pointer-events:none;background:${placeholder} center/cover no-repeat;filter:blur(${blur}px);transform:scale(1.08)`,
        );
        frame.appendChild(layer);
        layerKey = Symbol("media/blur-up-layer");
      },
      render(p) {
        host.setOpacity(key, p);
        if (layer && layerKey) getMotionHost(layer).setOpacity(layerKey, 1 - p);
      },
      clear() {
        host.setOpacity(key, undefined);
        host.flush();
        if (layer) {
          layer.remove();
          layer = undefined;
        }
      },
    },
  );
}

export interface LoadRevealOptions extends MediaRevealOptions {
  /** `inset` (edge wipe, default), `circle` (from the centre) or `wipe` (horizontal). */
  shape?: "inset" | "circle" | "wipe";
  /** Edge the reveal travels toward (default `up` for inset, `right` for wipe). */
  direction?: "up" | "down" | "left" | "right";
}

/** M03 — the image is revealed by a clip when (and only if) it finishes loading. */
export function createLoadReveal(
  img: HTMLImageElement,
  options: LoadRevealOptions = {},
): MediaRevealControl {
  const v = validator("createLoadReveal");
  const image = imageIn(img, undefined, v);
  const shape = v.oneOf("shape", options.shape, ["inset", "circle", "wipe"], "inset");
  const direction = v.oneOf(
    "direction",
    options.direction,
    ["up", "down", "left", "right"],
    shape === "wipe" ? "right" : "up",
  );
  const writer = createChannelWriter(image as Styled, ["clip-path"], { id: "media/load-reveal" });
  const r = (n: number) => Math.round(n * 100) / 100;
  const clip = (p: number) => {
    const hidden = r((1 - p) * 100);
    if (shape === "circle") return `circle(${r(p * 75)}% at 50% 50%)`;
    switch (direction) {
      case "up":
        return `inset(${hidden}% 0 0 0)`;
      case "down":
        return `inset(0 0 ${hidden}% 0)`;
      case "left":
        return `inset(0 0 0 ${hidden}%)`;
      default:
        return `inset(0 ${hidden}% 0 0)`;
    }
  };
  return attachReveal(
    image,
    options,
    v,
    { duration: 600, easing: "emphasized" },
    {
      hide() {},
      render(p) {
        writer.set("clip-path", clip(p));
      },
      clear() {
        writer.release();
      },
    },
  );
}
