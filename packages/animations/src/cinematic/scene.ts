/**
 * C02 — Scene chapters: pin + segments (catalogue §7, structure W; contracts/cinematic-api.md, research R7).
 *
 * A scene is a C01 timeline laid out in chapters (serial, by weight; labels `chapter:<id>` and
 * `chapter:<id>:end`) whose segments are tracks placed inside a chapter's span. `drive(source)` scrubs the
 * timeline from ANY progress source with `get()`/`subscribe()` — the Phase 011 `ScrollProgress` of a
 * `<ScrollScene>` is one, received as a value (families never import each other). Pinning is the scroll
 * scene's CSS sticky stage; nothing here listens to wheel, touch or keys, and nothing writes scroll. Without
 * a source the same timeline plays on its own clock, so the scene logic does not depend on scroll.
 *
 * Reduced motion (`static`): every segment is shown at its end state and the source is not followed; the
 * active chapter still follows the source (it conveys position, not motion).
 */
import { clamp } from "../core/interpolate.js";
import {
  prefersReducedMotion,
  type ReducedMotion,
  shouldReduceMotion,
  subscribeReducedMotion,
} from "../core/reduced-motion.js";
import { validator } from "../core/validate.js";
import { createTimeline, type Timeline, type TrackInput } from "./engine/timeline.js";

/** Any 0–1 progress source (the 011 `ScrollProgress` fits). */
export interface ProgressSource {
  get(): number;
  subscribe(listener: (progress: number) => void): () => void;
}

export interface ChapterInput {
  id: string;
  /** Relative length (0.1–10, default 1). */
  weight?: number;
  /** Element marked `data-active` while the chapter is active. */
  element?: Element | null;
}

export interface SceneChaptersOptions {
  chapters: readonly ChapterInput[];
  /** Clock duration when played without a source, ms per weight unit (100–20000, default 1500). */
  unit?: number;
  reducedMotion?: ReducedMotion;
  onChapterChange?(id: string, index: number): void;
}

export interface SceneChapter {
  readonly id: string;
  readonly index: number;
  /** Start and end as fractions of the scene (0–1). */
  readonly start: number;
  readonly end: number;
}

export interface SceneChapters {
  readonly timeline: Timeline;
  readonly chapters: readonly SceneChapter[];
  /** Active chapter id. */
  readonly active: string;
  chapterAt(progress: number): SceneChapter;
  /** Add a track inside a chapter: `span` is `[start, end]` as fractions of the chapter (default `[0, 1]`). */
  segment(chapterId: string, track: TrackInput, span?: readonly [number, number]): this;
  /** Scrub from a progress source; returns the unsubscribe. */
  drive(source: ProgressSource): () => void;
  /** Render the scene at a progress (0–1). */
  seek(progress: number): void;
  /** Play the scene on its own clock (no source). */
  play(): void;
  pause(): void;
  /** Clock mode: move to a chapter's start. */
  seekChapter(id: string): void;
  destroy(): void;
}

const v = /* @__PURE__ */ validator("createSceneChapters");

export function createSceneChapters(options: SceneChaptersOptions): SceneChapters {
  const o = v.options(options) as SceneChaptersOptions;
  if (!Array.isArray(o.chapters) || o.chapters.length === 0) {
    v.fail('"chapters" must be a non-empty array.');
  }
  const unit = v.number("unit", o.unit, 1500, 100, 20000);
  const policy = v.reducedMotion(o.reducedMotion);
  const onChapterChange = v.callback<(id: string, index: number) => void>(
    "onChapterChange",
    o.onChapterChange,
  );
  const seen = new Set<string>();
  const weights = o.chapters.map((chapter) => {
    if (typeof chapter?.id !== "string" || !/^[a-zA-Z][\w-]*$/.test(chapter.id)) {
      v.fail(`invalid chapter id ${JSON.stringify(chapter?.id)}.`);
    }
    if (seen.has(chapter.id)) v.fail(`duplicate chapter id "${chapter.id}".`);
    seen.add(chapter.id);
    return v.number("weight", chapter.weight, 1, 0.1, 10);
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  const total = sum * unit;
  const timeline = createTimeline({ reducedMotion: "never" });
  let cursor = 0;
  const chapters: SceneChapter[] = o.chapters.map((chapter, index) => {
    const start = cursor / sum;
    cursor += weights[index] as number;
    const end = cursor / sum;
    timeline.label(`chapter:${chapter.id}`, start * total);
    timeline.label(`chapter:${chapter.id}:end`, end * total);
    return Object.freeze({ id: chapter.id, index, start, end });
  });
  // Anchor the timeline length to the whole scene even when the last chapter has no segment.
  timeline.call(() => {}, total);
  const elements = o.chapters.map((chapter) => chapter.element ?? null);
  let active = -1;
  let following: ProgressSource | undefined;
  let destroyed = false;
  const reduced = () => shouldReduceMotion(policy, prefersReducedMotion());

  function chapterAt(progress: number): SceneChapter {
    const p = clamp(progress, 0, 1);
    return chapters.find((chapter) => p < chapter.end) ?? (chapters.at(-1) as SceneChapter);
  }

  function mark(progress: number): void {
    const chapter = chapterAt(progress);
    if (chapter.index === active) return;
    const before = elements[active];
    before?.removeAttribute("data-active");
    active = chapter.index;
    elements[active]?.setAttribute("data-active", "");
    onChapterChange?.(chapter.id, chapter.index);
  }

  function render(progress: number): void {
    if (destroyed) return;
    const p = clamp(progress, 0, 1);
    mark(p);
    // fire: triggered segments (Entrance) play in/out as the source crosses them; pose segments scrub.
    timeline.seekTo((reduced() ? 1 : p) * timeline.duration, { fire: !reduced() });
  }

  const unsubscribeReduced = subscribeReducedMotion(() => {
    if (following) render(following.get());
    else if (reduced()) timeline.finish();
  });

  const api: SceneChapters = {
    timeline,
    chapters,
    get active() {
      return (chapters[Math.max(0, active)] as SceneChapter).id;
    },
    chapterAt,
    segment(chapterId, track, span = [0, 1]) {
      const chapter = chapters.find((candidate) => candidate.id === chapterId);
      if (!chapter) v.fail(`unknown chapter ${JSON.stringify(chapterId)}.`);
      const [a, b] = span;
      if (!(a >= 0 && b <= 1 && a <= b)) v.fail(`invalid span [${String(a)}, ${String(b)}].`);
      const length = ((chapter as SceneChapter).end - (chapter as SceneChapter).start) * total;
      const start = (chapter as SceneChapter).start * total + a * length;
      timeline.add({ ...track, duration: (b - a) * length } as TrackInput, start);
      return api;
    },
    drive(source) {
      if (!source || typeof source.subscribe !== "function" || typeof source.get !== "function") {
        v.fail('drive: "source" must have get() and subscribe().');
      }
      following = source;
      const unsubscribe = source.subscribe(render);
      render(source.get());
      return () => {
        unsubscribe();
        if (following === source) following = undefined;
      };
    },
    seek(progress) {
      render(progress);
    },
    play() {
      if (destroyed || following) return;
      if (reduced()) {
        timeline.finish();
        mark(1);
        return;
      }
      timeline.play();
    },
    pause() {
      timeline.pause();
    },
    seekChapter(id) {
      const chapter = chapters.find((candidate) => candidate.id === id);
      if (!chapter) v.fail(`unknown chapter ${JSON.stringify(id)}.`);
      render((chapter as SceneChapter).start);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribeReduced();
      following = undefined;
      elements[active]?.removeAttribute("data-active");
      timeline.destroy();
    },
  };
  // Clock mode keeps the active chapter in sync without React renders.
  for (const chapter of chapters) {
    timeline.call(() => mark(chapter.start), chapter.start * total, {
      reverse: () => mark(Math.max(0, chapter.start - 1e-6)),
    });
  }
  return api;
}
