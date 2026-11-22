/**
 * M07 lightbox zoom from a thumbnail (catalogue §12; contracts/media-api.md §3, research R6). The overlay is a
 * NATIVE modal `<dialog>` (top layer, inert background, Escape → `cancel`): no overlay manager, no z-index, the
 * Components `Dialog` contract is untouched. The large image zooms from the thumbnail's box with the shared core
 * FLIP animator (host transform layer; one rect read per open/close) and back on close when the thumbnail is
 * still on screen (fade otherwise). Focus goes to the close control on open and back to the opener on close;
 * page scroll is locked by a reference-counted lock on `<html>` written through its Motion Host. Reduced motion:
 * fade only (CSS on the package dialog class).
 */
import { createChannelWriter } from "../core/channel.js";
import { resolveEasing } from "../core/easing.js";
import { createFlipAnimator, type FlipTransition } from "../core/flip.js";
import { getMotionHost } from "../core/host.js";
import type { Box } from "../core/layout-box.js";
import {
  prefersReducedMotion,
  type ReducedMotion,
  shouldReduceMotion,
} from "../core/reduced-motion.js";
import { getFrameScheduler } from "../core/scheduler.js";
import { validator } from "../core/validate.js";
import { counters } from "./engine/debug.js";

type Styled = Element & { readonly style: CSSStyleDeclaration };

// --- Reference-counted scroll lock (shared by every lightbox on the page) ---------------------------------
let locks = 0;
let lockWriter: ReturnType<typeof createChannelWriter> | undefined;
function lockScroll(doc: Document): () => void {
  const root = doc.documentElement as Styled;
  if (locks === 0) {
    lockWriter = createChannelWriter(root, ["overflow", "scrollbar-gutter"], {
      id: "media/scroll-lock",
    });
    // Keep the scrollbar's space when the page had one, so nothing shifts under the dialog.
    const hasScrollbar = root.scrollHeight > root.clientHeight;
    lockWriter.set("overflow", "hidden");
    if (hasScrollbar) lockWriter.set("scrollbar-gutter", "stable");
    getMotionHost(root).flush();
  }
  locks++;
  counters.scrollLocks++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks--;
    counters.scrollLocks--;
    if (locks === 0 && lockWriter) {
      lockWriter.release();
      getMotionHost(root).flush();
      lockWriter = undefined;
    }
  };
}

export interface LightboxZoomOptions {
  dialog: HTMLDialogElement;
  /** The large image (or any element) that zooms. */
  image: HTMLElement;
  /** The thumbnail to zoom from/to (measured at open and close). */
  getThumbnail(): Element | null;
  /** ms of the zoom (0–2000, default 380). */
  duration?: number;
  reducedMotion?: ReducedMotion;
  onOpenChange?(open: boolean): void;
}

export interface LightboxControl {
  readonly state: "closed" | "open" | "closing";
  open(): void;
  /** Animated close (immediate under reduced motion). */
  close(): void;
  destroy(): void;
}

const rectBox = (r: DOMRect): Box => ({ x: r.left, y: r.top, width: r.width, height: r.height });

export function createLightboxZoom(options: LightboxZoomOptions): LightboxControl {
  const v = validator("createLightboxZoom");
  const o = v.options(options) as LightboxZoomOptions;
  const dialog = o.dialog;
  if (!dialog || dialog.tagName !== "DIALOG") v.fail('"dialog" must be a <dialog> element.');
  if (!o.image || o.image.nodeType !== 1) v.fail('"image" must be an element.');
  if (typeof o.getThumbnail !== "function") v.fail('"getThumbnail" must be a function.');
  const duration = v.number("duration", o.duration, 380, 0, 2000);
  const policy = v.reducedMotion(o.reducedMotion);
  const onOpenChange = v.callback<(open: boolean) => void>("onOpenChange", o.onOpenChange);
  const image = o.image;
  const doc = dialog.ownerDocument;
  const scheduler = getFrameScheduler();
  const host = getMotionHost(image as Styled);
  const key = Symbol("media/lightbox");
  const transition: FlipTransition = {
    type: "tween",
    duration,
    easing: resolveEasing("emphasized"),
  };
  const animator = createFlipAnimator(scheduler, transition, (layer) => host.setLayer(key, layer));
  let state: LightboxControl["state"] = "closed";
  let opener: HTMLElement | null = null;
  let unlock: (() => void) | undefined;
  let watch: (() => void) | undefined;
  let destroyed = false;
  const reduced = () => shouldReduceMotion(policy, prefersReducedMotion());
  counters.effects++;
  dialog.classList.add("neshel-lightbox");

  const setState = (next: LightboxControl["state"]) => {
    state = next;
    dialog.setAttribute("data-state", next);
  };
  const onScreen = (r: DOMRect) =>
    r.width > 0 &&
    r.height > 0 &&
    r.bottom > 0 &&
    r.right > 0 &&
    r.top < (doc.defaultView?.innerHeight ?? 0) &&
    r.left < (doc.defaultView?.innerWidth ?? 0);

  function finishClose(): void {
    watch?.();
    watch = undefined;
    animator.stop();
    if (dialog.open) dialog.close();
    unlock?.();
    unlock = undefined;
    setState("closed");
    const back = opener && opener.isConnected ? opener : (o.getThumbnail() as HTMLElement | null);
    opener = null;
    back?.focus?.({ preventScroll: true });
    onOpenChange?.(false);
  }

  function open(): void {
    if (destroyed) return;
    if (state === "closing") {
      // Re-open during the close: continue from the current offset back to identity (no jump).
      watch?.();
      watch = undefined;
      setState("open");
      animator.to({ x: 0, y: 0, sx: 1, sy: 1 });
      return;
    }
    if (state === "open") return;
    opener = (doc.activeElement as HTMLElement | null) ?? null;
    const thumb = o.getThumbnail();
    const first = thumb ? thumb.getBoundingClientRect() : undefined;
    unlock = lockScroll(doc);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    setState("open");
    const close = dialog.querySelector<HTMLElement>("[data-neshel-lightbox-close]");
    close?.focus({ preventScroll: true });
    onOpenChange?.(true);
    if (reduced() || !first || !onScreen(first)) return;
    const last = image.getBoundingClientRect();
    if (last.width === 0 || last.height === 0) return;
    animator.from(rectBox(first), rectBox(last), "both");
  }

  function close(): void {
    if (destroyed || state !== "open") return;
    setState("closing");
    const thumb = o.getThumbnail();
    const target = thumb?.getBoundingClientRect();
    if (reduced() || !target || !onScreen(target)) {
      // Fade (CSS on the dialog class) then close; no zoom to an off-screen thumbnail.
      animator.stop();
      if (reduced() || duration === 0) finishClose();
      else watch = afterMs(Math.min(duration, 200), finishClose);
      return;
    }
    const current = image.getBoundingClientRect();
    const offset = animator.offset;
    // The current rect includes the running offset; the identity box is the rect without it.
    const baseW = current.width / Math.max(offset.sx, 1e-3);
    const baseH = current.height / Math.max(offset.sy, 1e-3);
    const baseCx = current.left + current.width / 2 - offset.x;
    const baseCy = current.top + current.height / 2 - offset.y;
    animator.to({
      x: target.left + target.width / 2 - baseCx,
      y: target.top + target.height / 2 - baseCy,
      sx: target.width / Math.max(baseW, 1),
      sy: target.height / Math.max(baseH, 1),
    });
    watch = scheduler.schedule(() => {
      if (animator.running) return true;
      watch = undefined;
      finishClose();
      return false;
    }, "write");
  }

  function afterMs(ms: number, fn: () => void): () => void {
    const timer = setTimeout(fn, ms);
    return () => clearTimeout(timer);
  }

  const onCancel = (event: Event) => {
    event.preventDefault(); // animate our own close
    close();
  };
  const onClick = (event: MouseEvent) => {
    const target = event.target as Element | null;
    if (target === dialog)
      close(); // backdrop (the dialog box itself is covered by content)
    else if (target?.closest?.("[data-neshel-lightbox-close]")) close();
  };
  // The UA may close the dialog by itself (form method=dialog, another script): keep state consistent.
  const onClose = () => {
    if (state !== "closed" && !destroyed) finishClose();
  };
  dialog.addEventListener("cancel", onCancel);
  dialog.addEventListener("click", onClick);
  dialog.addEventListener("close", onClose);
  setState("closed");

  return {
    get state() {
      return state;
    },
    open,
    close,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("click", onClick);
      dialog.removeEventListener("close", onClose);
      watch?.();
      watch = undefined;
      animator.stop();
      host.setLayer(key, undefined);
      if (state !== "closed") {
        if (dialog.open) dialog.close();
        unlock?.();
        unlock = undefined;
        opener?.focus?.({ preventScroll: true });
      }
      dialog.classList.remove("neshel-lightbox");
      dialog.removeAttribute("data-state");
      counters.effects--;
    },
  };
}
