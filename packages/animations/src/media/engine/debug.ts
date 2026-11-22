/**
 * Media diagnostics and capabilities (Phase 015). Counters are plain numbers for tests, the lab and performance
 * reports; `getMediaSupport()` reports behavioural capability checks (`false` on the server).
 */
import { mediaLoadCounters } from "../../core/media-load.js";
import { surfaceCounters } from "../../core/surface.js";

export const counters = {
  /** Live media effects. */
  effects: 0,
  /** Images currently hidden by a reveal effect while loading. */
  hidden: 0,
  seeksRequested: 0,
  seeksIssued: 0,
  seeksCoalesced: 0,
  framesPresented: 0,
  /** Package filter elements alive (M05). */
  filters: 0,
  /** Dissolve cells painted/cleared (cumulative, M09). */
  cells: 0,
  /** Scroll locks held (M07). */
  scrollLocks: 0,
};

export interface MediaDebugInfo {
  effects: number;
  hidden: number;
  watchers: number;
  seeksRequested: number;
  seeksIssued: number;
  seeksCoalesced: number;
  framesPresented: number;
  filters: number;
  cells: number;
  scrollLocks: number;
  surfaces: number;
}

export function getMediaDebugInfo(): MediaDebugInfo {
  return {
    ...counters,
    watchers: mediaLoadCounters.watchers,
    surfaces: surfaceCounters.surfaces,
  };
}

export interface MediaSupport {
  decode: boolean;
  videoFrameCallback: boolean;
  fastSeek: boolean;
  dialog: boolean;
  inert: boolean;
  canvas2d: boolean;
  clipPath: boolean;
}

const supports = (property: string, value: string) => {
  const css = (globalThis as { CSS?: { supports?(p: string, v: string): boolean } }).CSS;
  return typeof css?.supports === "function" && css.supports(property, value);
};

export function getMediaSupport(): MediaSupport {
  const w = globalThis as {
    HTMLImageElement?: { prototype: object };
    HTMLVideoElement?: { prototype: object };
    HTMLDialogElement?: { prototype: object };
    HTMLElement?: { prototype: object };
    document?: Document;
  };
  let canvas2d = false;
  try {
    canvas2d = Boolean(w.document?.createElement("canvas").getContext?.("2d"));
  } catch {
    canvas2d = false;
  }
  return {
    decode: Boolean(w.HTMLImageElement && "decode" in w.HTMLImageElement.prototype),
    videoFrameCallback: Boolean(
      w.HTMLVideoElement && "requestVideoFrameCallback" in w.HTMLVideoElement.prototype,
    ),
    fastSeek: Boolean(w.HTMLVideoElement && "fastSeek" in w.HTMLVideoElement.prototype),
    dialog: Boolean(w.HTMLDialogElement && "showModal" in w.HTMLDialogElement.prototype),
    inert: Boolean(w.HTMLElement && "inert" in w.HTMLElement.prototype),
    canvas2d,
    clipPath: supports("clip-path", "inset(0 0 0 0)"),
  };
}
