// Phase 015 test helpers: controllable images, videos, 2D canvas and <dialog> for jsdom (which has no media
// pipeline, no canvas and no modal dialogs). Real behaviour is covered by the lab in three engines.
import { setupDom } from "./helpers.mjs";

export async function setupMediaDom() {
  const env = await setupDom();
  for (const key of [
    "MutationObserver",
    "HTMLImageElement",
    "HTMLVideoElement",
    "HTMLCanvasElement",
  ]) {
    if (!(key in globalThis))
      Object.defineProperty(globalThis, key, {
        value: window[key],
        configurable: true,
        writable: true,
      });
  }
  shimDialog();
  return env;
}

export const microtasks = async (n = 3) => {
  for (let i = 0; i < n; i++) await new Promise((resolve) => queueMicrotask(resolve));
};

/**
 * An <img> whose loading state the test controls. `decode`: "resolve" (default), "reject" or "pending".
 * `load()` completes it (fires `load`), `fail()` breaks it (fires `error`).
 */
export function fakeImage({
  complete = false,
  naturalWidth = 0,
  src = "a.jpg",
  decode = "resolve",
} = {}) {
  const img = document.createElement("img");
  img.setAttribute("src", src);
  img.setAttribute("alt", "A test image");
  img.setAttribute("srcset", `${src} 1x, big-${src} 2x`);
  img.setAttribute("sizes", "100vw");
  img.setAttribute("loading", "lazy");
  img.setAttribute("decoding", "async");
  img.setAttribute("width", "400");
  img.setAttribute("height", "300");
  const state = {
    complete,
    naturalWidth,
    naturalHeight: naturalWidth ? 300 : 0,
    decode,
    decodes: 0,
  };
  Object.defineProperty(img, "complete", { get: () => state.complete, configurable: true });
  Object.defineProperty(img, "naturalWidth", { get: () => state.naturalWidth, configurable: true });
  Object.defineProperty(img, "naturalHeight", {
    get: () => state.naturalHeight,
    configurable: true,
  });
  Object.defineProperty(img, "currentSrc", {
    get: () => img.getAttribute("src") ?? "",
    configurable: true,
  });
  let pendingDecode;
  img.decode = () => {
    state.decodes++;
    if (state.decode === "reject") return Promise.reject(new Error("EncodingError"));
    if (state.decode === "pending")
      return new Promise((resolve) => {
        pendingDecode = resolve;
      });
    return Promise.resolve();
  };
  img.load = (width = 400) => {
    state.complete = true;
    state.naturalWidth = width;
    state.naturalHeight = 300;
    img.dispatchEvent(new window.Event("load"));
  };
  img.fail = () => {
    state.complete = true;
    state.naturalWidth = 0;
    img.dispatchEvent(new window.Event("error"));
  };
  img.reset = () => {
    state.complete = false;
    state.naturalWidth = 0;
  };
  img.resolveDecode = () => pendingDecode?.();
  img.state = state;
  return img;
}

/** Native attributes of an image (snapshot for "never written" assertions). */
export function nativeAttributes(img) {
  return ["src", "srcset", "sizes", "alt", "loading", "decoding", "width", "height"].map((name) => [
    name,
    img.getAttribute(name),
  ]);
}

/**
 * A <video> whose seeking the test controls: assignments to `currentTime` are recorded as seeks and set
 * `seeking`; `finishSeek()` completes the current one (`seeked`). `metadata()` reports a duration.
 */
export function fakeVideo({
  duration = 10,
  ready = true,
  seekable = [[0, duration]],
  frameCallback = false,
} = {}) {
  const video = document.createElement("video");
  const state = {
    time: 0,
    seeking: false,
    readyState: ready ? 4 : 0,
    duration: ready ? duration : Number.NaN,
    seeks: [],
    plays: 0,
    ranges: seekable,
    frameCallbacks: [],
  };
  Object.defineProperty(video, "currentTime", {
    get: () => state.time,
    set: (t) => {
      state.time = t;
      state.seeking = true;
      state.seeks.push(t);
    },
    configurable: true,
  });
  Object.defineProperty(video, "seeking", { get: () => state.seeking, configurable: true });
  Object.defineProperty(video, "readyState", { get: () => state.readyState, configurable: true });
  Object.defineProperty(video, "duration", { get: () => state.duration, configurable: true });
  Object.defineProperty(video, "seekable", {
    get: () => ({
      length: state.ranges.length,
      start: (i) => state.ranges[i][0],
      end: (i) => state.ranges[i][1],
    }),
    configurable: true,
  });
  video.play = () => {
    state.plays++;
    return Promise.resolve();
  };
  if (frameCallback) {
    video.requestVideoFrameCallback = (cb) => {
      state.frameCallbacks.push(cb);
      return state.frameCallbacks.length;
    };
    video.cancelVideoFrameCallback = (id) => {
      state.frameCallbacks[id - 1] = null;
    };
  }
  video.finishSeek = () => {
    state.seeking = false;
    video.dispatchEvent(new window.Event("seeked"));
  };
  video.presentFrame = () => {
    const callbacks = state.frameCallbacks.splice(0);
    for (const cb of callbacks) cb?.(0, { mediaTime: state.time });
  };
  video.metadata = (d = duration) => {
    state.readyState = 1;
    state.duration = d;
    video.dispatchEvent(new window.Event("loadedmetadata"));
  };
  video.state = state;
  return video;
}

/** Recording 2D context for every canvas (`getContext("2d")`); `contexts` lists them. */
export function stubCanvas({ supported = true } = {}) {
  const proto = window.HTMLCanvasElement.prototype;
  const original = proto.getContext;
  const contexts = [];
  proto.getContext = function (type) {
    if (type !== "2d" || !supported) return null;
    if (this.__ctx) return this.__ctx;
    const calls = { drawImage: 0, clearRect: 0, arc: 0, fill: 0, stroke: 0, setTransform: 0 };
    const ctx = {
      canvas: this,
      calls,
      fillStyle: "",
      strokeStyle: "",
      globalAlpha: 1,
      lineWidth: 1,
      setTransform: () => calls.setTransform++,
      clearRect: () => calls.clearRect++,
      drawImage: () => calls.drawImage++,
      beginPath() {},
      moveTo() {},
      lineTo() {},
      arc: () => calls.arc++,
      fill: () => calls.fill++,
      stroke: () => calls.stroke++,
    };
    this.__ctx = ctx;
    contexts.push(ctx);
    return ctx;
  };
  return {
    contexts,
    restore() {
      proto.getContext = original;
    },
  };
}

/** jsdom lacks modal dialogs: a minimal showModal/close with `open`, `cancel` and `close` events. */
function shimDialog() {
  const proto = window.HTMLDialogElement?.prototype;
  if (!proto || proto.__neshelShim) return;
  proto.__neshelShim = true;
  proto.showModal = function () {
    this.setAttribute("open", "");
    this.__modal = true;
  };
  proto.show = function () {
    this.setAttribute("open", "");
  };
  proto.close = function () {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.__modal = false;
    this.dispatchEvent(new window.Event("close"));
  };
  Object.defineProperty(proto, "open", {
    get() {
      return this.hasAttribute("open");
    },
    configurable: true,
  });
}

/** Press Escape on a modal dialog the way a browser does (`cancel` then close unless prevented). */
export function escapeDialog(dialog) {
  const event = new window.Event("cancel", { cancelable: true });
  dialog.dispatchEvent(event);
  if (!event.defaultPrevented) dialog.close();
}
