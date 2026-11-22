/**
 * Image load watcher (Phase 015, internal; research R1, contracts/media-api.md §1). Reports `loading`, `loaded`
 * or `error` for an `<img>` WITHOUT missing a `load` that happened before it was attached: the first report is
 * synchronous from `complete`/`naturalWidth`. `load` waits for `decode()` (rejection tolerated — the state is
 * re-read) so a reveal never shows a half-decoded frame. A MutationObserver on `src`/`srcset`/`sizes`
 * re-evaluates after an explicit source change; answers of an older generation are dropped. Native attributes
 * are never written. A responsive `srcset` candidate swap (viewport/DPR) keeps the current image visible, so it
 * only reports `loaded` again.
 */

export type ImageLoadState = "loading" | "loaded" | "error";

export interface WatchImageOptions {
  /** Await `img.decode()` after `load` (default true). */
  decode?: boolean;
}

/** Live watcher counters (tests and lab). */
export const mediaLoadCounters = { watchers: 0, decodes: 0 };

function hasSource(img: HTMLImageElement): boolean {
  return Boolean(img.currentSrc || img.getAttribute("src") || img.getAttribute("srcset"));
}

/** The state an image is in right now (no events needed). */
export function imageLoadState(img: HTMLImageElement): ImageLoadState {
  if (img.complete) {
    if (img.naturalWidth > 0) return "loaded";
    return hasSource(img) ? "error" : "loading";
  }
  return "loading";
}

export function watchImage(
  img: HTMLImageElement,
  onChange: (state: ImageLoadState) => void,
  options: WatchImageOptions = {},
): () => void {
  if (!img || img.nodeType !== 1 || img.tagName !== "IMG")
    throw new TypeError("watchImage: expected an <img> element.");
  const decode = options.decode !== false;
  let generation = 0;
  let last: ImageLoadState | undefined;
  let stopped = false;
  mediaLoadCounters.watchers++;

  const report = (state: ImageLoadState) => {
    if (stopped || state === last) return;
    last = state;
    onChange(state);
  };

  function settleLoaded(): void {
    const mine = generation;
    if (!decode || typeof img.decode !== "function") {
      report(imageLoadState(img) === "error" ? "error" : "loaded");
      return;
    }
    mediaLoadCounters.decodes++;
    img.decode().then(
      () => {
        if (mine === generation) report("loaded");
      },
      () => {
        // EncodingError (broken) or a source change meanwhile: read the real state.
        if (mine !== generation) return;
        const state = imageLoadState(img);
        report(state === "loading" ? "loaded" : state);
      },
    );
  }

  const onLoad = () => {
    generation++;
    settleLoaded();
  };
  const onError = () => {
    generation++;
    report("error");
  };
  img.addEventListener("load", onLoad);
  img.addEventListener("error", onError);

  let observer: MutationObserver | undefined;
  if (typeof MutationObserver === "function") {
    observer = new MutationObserver(() => {
      generation++;
      const state = imageLoadState(img);
      if (state === "loaded") settleLoaded();
      else report(state);
    });
    observer.observe(img, { attributes: true, attributeFilter: ["src", "srcset", "sizes"] });
  }

  const initial = imageLoadState(img);
  if (initial === "loaded") {
    // Already complete (cache, SSR, before hydration): reported at once; decoding is not awaited because the
    // image is already painted.
    report("loaded");
  } else report(initial);

  return () => {
    if (stopped) return;
    stopped = true;
    generation++;
    img.removeEventListener("load", onLoad);
    img.removeEventListener("error", onError);
    observer?.disconnect();
    mediaLoadCounters.watchers--;
  };
}
