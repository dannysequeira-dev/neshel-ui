// In-page checks of the Phase 011 scroll gallery in a real layout engine. Shared by the CDP check
// (Chrome) and the Playwright check (Chromium, Firefox, WebKit). Scrolling is programmatic (the page's
// native scroll); every result is decided by an observable condition with a ceiling, never a fixed
// sleep; counters come from `getScrollDebugInfo()`.
import { getFrameScheduler } from "@neshel-ui/animations/core";
import { getScrollDebugInfo } from "@neshel-ui/animations/scroll";
import { labState } from "./lab-state";

type Case = { id: string; ok: boolean; error?: string };

const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
async function frames(count: number) {
  for (let index = 0; index < count; index++) await frame();
}
async function until(label: string, condition: () => boolean, describe: () => unknown, ms = 5000) {
  const start = performance.now();
  while (performance.now() - start < ms) {
    try {
      if (condition()) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
  throw new Error(`${label}: not reached within ${ms} ms; ${JSON.stringify(describe())}`);
}
const check = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
const byId = (id: string) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`#${id} missing`);
  return element as HTMLElement;
};
const viewportHeight = () => document.documentElement.clientHeight;
const docTop = (element: Element) => element.getBoundingClientRect().top + window.scrollY;
const scrollY = (y: number) => window.scrollTo({ top: y, behavior: "instant" });
const opacity = (element: Element) => Number(getComputedStyle(element).opacity);
const matrix = (element: Element) => new DOMMatrix(getComputedStyle(element).transform);
const variable = (element: Element, name: string) =>
  getComputedStyle(element).getPropertyValue(name).trim();

/** Scroll so that `element`'s top sits at `fraction` of the viewport height. */
async function place(element: Element, fraction: number) {
  scrollY(docTop(element) - viewportHeight() * fraction);
  await frames(2);
}

/** Cover progress of `element` from its live box (what both drivers must produce). */
function coverProgress(element: Element) {
  const rect = element.getBoundingClientRect();
  const v = viewportHeight();
  return Math.min(1, Math.max(0, (v - rect.top) / (v + rect.height)));
}

/** Instrument layout reads during `run` (getBoundingClientRect, offset*, client*, scrollHeight). */
async function countLayoutReads(run: () => Promise<void>) {
  let reads = 0;
  const restore: Array<() => void> = [];
  const rect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function (this: Element) {
    reads++;
    return rect.call(this);
  };
  restore.push(() => {
    Element.prototype.getBoundingClientRect = rect;
  });
  for (const [proto, key] of [
    [HTMLElement.prototype, "offsetTop"],
    [HTMLElement.prototype, "offsetHeight"],
    [Element.prototype, "scrollHeight"],
    [Element.prototype, "clientHeight"],
  ] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, key);
    if (!descriptor?.get) continue;
    const get = descriptor.get;
    Object.defineProperty(proto, key, {
      ...descriptor,
      get(this: Element) {
        reads++;
        return get.call(this);
      },
    });
    restore.push(() => Object.defineProperty(proto, key, descriptor));
  }
  try {
    await run();
  } finally {
    for (const undo of restore) undo();
  }
  return reads;
}

export async function runScrollSuite(): Promise<Case[]> {
  const cases: Case[] = [];
  const notes = labState().notes;
  const run = async (id: string, body: () => Promise<void>) => {
    try {
      await body();
      cases.push({ id, ok: true });
    } catch (error) {
      cases.push({ id, ok: false, error: String((error as Error)?.message ?? error) });
    }
  };
  const gallery = byId("scroll-title");

  await run(
    "scroll: a scroll burst reads no layout and measures no geometry (SC-002)",
    async () => {
      await place(byId("g-parallax"), 0.5);
      await frames(5);
      const before = getScrollDebugInfo();
      const reads = await countLayoutReads(async () => {
        for (let step = 0; step < 40; step++) {
          scrollY(window.scrollY + 40);
          await frame();
        }
        for (let step = 0; step < 20; step++) {
          scrollY(window.scrollY - 60);
          await frame();
        }
      });
      const after = getScrollDebugInfo();
      check(
        after.measurements === before.measurements,
        `measurements ${before.measurements} → ${after.measurements}`,
      );
      check(
        after.scrollReads - before.scrollReads >= 40,
        `scroll reads ${after.scrollReads - before.scrollReads}`,
      );
      check(reads === 0, `${reads} layout reads while scrolling`);
      notes.scrollBurst = {
        timelines: after.activeTimelines,
        scrollReads: after.scrollReads - before.scrollReads,
      };
    },
  );

  await run("scroll: no frame work once scrolling stops (idle)", async () => {
    await until(
      "scheduler idle",
      () => getFrameScheduler().size === 0,
      () => getFrameScheduler().size,
    );
  });

  await run("SP03: progress bar equals the page progress (native or JS driver)", async () => {
    const bar = byId("sp03-bar");
    const max = () => document.documentElement.scrollHeight - viewportHeight();
    for (const fraction of [0.3, 0.7]) {
      scrollY(max() * fraction);
      await until(
        `bar at ${fraction}`,
        () =>
          Math.abs(Number(variable(bar, "--neshel-scroll-progress")) - window.scrollY / max()) <
          0.01,
        () => ({
          css: variable(bar, "--neshel-scroll-progress"),
          expected: window.scrollY / max(),
        }),
      );
    }
    const info = getScrollDebugInfo();
    notes.scrollDrivers = { native: info.nativeAnimations, fallbacks: info.nativeFallbacks };
    check(info.nativeFallbacks === 0, `native fallbacks ${info.nativeFallbacks}`);
  });

  await run(
    "ST05: in-view variable agrees with the live layout within 0.02 (driver parity, SC-004)",
    async () => {
      const card = byId("st05-card");
      for (const fraction of [0.8, 0.4]) {
        await place(card, fraction);
        await until(
          `st05 at ${fraction}`,
          () =>
            Math.abs(Number(variable(card, "--neshel-view-progress")) - coverProgress(card)) < 0.02,
          () => ({ css: variable(card, "--neshel-view-progress"), expected: coverProgress(card) }),
        );
      }
    },
  );

  await run(
    "ST01/ST03: repeat re-arms off-screen and reveals on enter; once stays visible",
    async () => {
      const repeat = byId("st03-repeat");
      const once = byId("st01-card");
      await place(repeat, 0.5);
      await until(
        "revealed",
        () => opacity(repeat) === 1 && repeat.style.opacity === "",
        () => repeat.style.cssText,
      );
      scrollY(Math.max(0, docTop(repeat) - viewportHeight() * 3));
      await until(
        "re-armed below the fold",
        () => opacity(repeat) === 0,
        () => repeat.style.cssText,
      );
      await place(repeat, 0.5);
      await until(
        "replayed",
        () => opacity(repeat) === 1 && repeat.style.cssText === "",
        () => repeat.style.cssText,
      );
      await until(
        "once visible",
        () => opacity(once) === 1 && once.style.cssText === "",
        () => once.style.cssText,
      );
    },
  );

  await run("ST03 reverse: plays out when leaving downwards, back in on enter", async () => {
    const reverse = byId("st03-reverse");
    await place(reverse, 0.5);
    await until(
      "in",
      () => opacity(reverse) === 1,
      () => reverse.style.cssText,
    );
    scrollY(Math.max(0, docTop(reverse) - viewportHeight() * 3));
    await until(
      "out",
      () => opacity(reverse) === 0,
      () => reverse.style.cssText,
    );
    await place(reverse, 0.5);
    await until(
      "in again",
      () => opacity(reverse) === 1,
      () => reverse.style.cssText,
    );
  });

  await run("ST04: callbacks and state follow enter/leave", async () => {
    const log = byId("st04-log");
    await place(log, 0.5);
    await until(
      "active",
      () => log.dataset.state === "active",
      () => log.textContent,
    );
    scrollY(docTop(log) + viewportHeight() * 2);
    await until(
      "after",
      () => log.dataset.state === "after",
      () => log.textContent,
    );
    check(/enter/.test(log.textContent ?? ""), log.textContent);
  });

  await run("ST06: header hides on forward scroll and shows on backward scroll", async () => {
    const header = byId("st06-header").firstElementChild as HTMLElement;
    scrollY(docTop(gallery) + 600);
    await frames(3);
    for (let step = 0; step < 12; step++) {
      scrollY(window.scrollY + 40);
      await frame();
    }
    await until(
      "hidden",
      () => header.dataset.neshelHeader === "hidden" && matrix(header).f < -10,
      () => header.style.cssText,
    );
    for (let step = 0; step < 6; step++) {
      scrollY(window.scrollY - 40);
      await frame();
    }
    await until(
      "shown",
      () => header.dataset.neshelHeader === undefined && Math.abs(matrix(header).f) < 0.5,
      () => header.style.cssText,
    );
  });

  await run(
    "ST07: sticky toolbar is flagged while pinned and unflagged once released",
    async () => {
      const bar = byId("st07-bar");
      const wrap = bar.parentElement as HTMLElement;
      scrollY(docTop(wrap) + 150);
      await until(
        "stuck",
        () => bar.hasAttribute("data-neshel-stuck"),
        () => bar.getBoundingClientRect().top,
      );
      scrollY(docTop(wrap) + wrap.offsetHeight + 50);
      await until(
        "released",
        () => !bar.hasAttribute("data-neshel-stuck"),
        () => bar.getBoundingClientRect().top,
      );
      scrollY(docTop(wrap) - viewportHeight());
      await until(
        "before",
        () => !bar.hasAttribute("data-neshel-stuck"),
        () => bar.getBoundingClientRect().top,
      );
    },
  );

  await run("ST08: section spy marks the section under the activation line", async () => {
    await place(byId("g-parallax"), 0.1);
    const link = document.querySelector('[data-spy="g-parallax"]') as HTMLElement;
    await until(
      "active link",
      () => link.getAttribute("aria-current") === "location",
      () => link.outerHTML,
    );
  });

  await run(
    "ST09/ST10: lazy Tilt3D attaches near the viewport; centre band detection",
    async () => {
      const lazy = byId("st09-lazy");
      await place(lazy, 0.5);
      await until(
        "tilt attached",
        () => lazy.hasAttribute("data-neshel-tilt"),
        () => lazy.outerHTML.slice(0, 120),
      );
      const center = byId("st10-center");
      scrollY(docTop(center) + center.offsetHeight / 2 - viewportHeight() / 2);
      await until(
        "in centre band",
        () => center.dataset.inView === "true",
        () => center.getBoundingClientRect().top,
      );
    },
  );

  await run("SP01: depth layers move proportionally to their depth", async () => {
    const near = byId("sp01-2");
    const slow = byId("sp01-0_4");
    await place(near, 0.15);
    await until(
      "ratio 5",
      () => Math.abs(matrix(slow).f) > 1 && Math.abs(matrix(near).f / matrix(slow).f - 5) < 0.3,
      () => [matrix(near).f, matrix(slow).f],
    );
  });

  await run("SP02/SP07/SP08: scrubbed transform, zoom and colour follow the progress", async () => {
    const box = byId("sp02-box");
    await place(box, 0.5);
    await until(
      "sp02 mid",
      () => Math.abs(matrix(box).e) < 160 && opacity(box) > 0.7 && opacity(box) < 1,
      () => [box.style.cssText],
    );
    const zoom = byId("sp07");
    await place(zoom, 0.5);
    await until(
      "sp07 mid",
      () => matrix(zoom).a > 0.85 && matrix(zoom).a < 1.15,
      () => zoom.style.cssText,
    );
    const color = byId("sp08");
    await place(color, 0.5);
    await until(
      "sp08",
      () => /color-mix|#/.test(color.style.getPropertyValue("--neshel-scroll-color")),
      () => color.style.cssText,
    );
  });

  await run(
    "SP04: pinned horizontal track follows the scroll; focus brings a card into view",
    async () => {
      const section = byId("sp04");
      const stage = section.firstElementChild as HTMLElement;
      const track = stage.firstElementChild as HTMLElement;
      await until(
        "pinned",
        () => section.dataset.neshelHscroll === "pinned",
        () => section.dataset.neshelHscroll,
      );
      const distance = track.scrollWidth - stage.clientWidth;
      const span = section.offsetHeight - viewportHeight();
      scrollY(docTop(section) + span / 2);
      await until(
        "half way",
        () => Math.abs(matrix(track).e + distance / 2) < 3,
        () => [matrix(track).e, distance],
      );
      check(Math.abs(stage.getBoundingClientRect().top) < 1, "stage pinned by sticky");
      scrollY(docTop(section) - viewportHeight());
      await frames(3);
      const last = byId("sp04-5");
      last.focus();
      await until(
        "focused card visible",
        () => {
          const card = last.getBoundingClientRect();
          const box = stage.getBoundingClientRect();
          return (
            card.left >= box.left - 1 &&
            card.right <= box.right + 1 &&
            card.top >= 0 &&
            card.bottom <= viewportHeight() &&
            stage.scrollLeft === 0
          );
        },
        () => [last.getBoundingClientRect().left, stage.scrollLeft],
      );
      last.blur();
    },
  );

  await run("SP06: the media keeps covering its frame while it moves", async () => {
    const frameEl = byId("sp06-frame");
    const media = frameEl.firstElementChild as HTMLElement;
    for (const fraction of [0.9, 0.1]) {
      await place(frameEl, fraction);
      await until(
        `covered at ${fraction}`,
        () => {
          const f = frameEl.getBoundingClientRect();
          const m = media.getBoundingClientRect();
          return m.top <= f.top + 0.5 && m.bottom >= f.bottom - 0.5 && media.style.transform !== "";
        },
        () => [
          frameEl.getBoundingClientRect().top,
          media.getBoundingClientRect().top,
          media.style.transform,
        ],
      );
    }
  });

  await run("SP09: stack slots stick at increasing offsets", async () => {
    const slots = [...byId("sp09").children] as HTMLElement[];
    const tops = slots.map((slot) => Number.parseFloat(getComputedStyle(slot).top));
    check(
      tops.every((top, index) => index === 0 || top > (tops[index - 1] as number)),
      `tops ${tops}`,
    );
    check(getComputedStyle(slots[0] as HTMLElement).position === "sticky", "sticky");
  });

  await run("SP11: velocity skew appears while scrolling fast and settles to none", async () => {
    const skew = byId("sp11");
    await place(skew, 0.5);
    let seen = false;
    for (let step = 0; step < 12; step++) {
      scrollY(window.scrollY + 90);
      await frame();
      if (/skew/.test(skew.style.transform)) seen = true;
    }
    check(seen, "no skew during a fast scroll");
    await until(
      "settled",
      () => !/skew/.test(skew.style.transform),
      () => skew.style.transform,
    );
  });

  await run(
    "SP05/SP10 dynamic geometry: content inserted above keeps the smooth scene consistent",
    async () => {
      const scene = byId("scene-2");
      byId("dyn-toggle").click();
      await until(
        "inserted",
        () => document.getElementById("dyn-extra") !== null,
        () => null,
      );
      const span = () => scene.offsetHeight - viewportHeight();
      scrollY(docTop(scene) + span() * 0.5);
      const implied = () => Math.min(1, Math.max(0, (window.scrollY - docTop(scene)) / span()));
      await until(
        "consistent after insertion",
        () => Math.abs(Number(variable(scene, "--neshel-scene-progress")) - implied()) < 0.01,
        () => ({ css: variable(scene, "--neshel-scene-progress"), implied: implied() }),
      );
      byId("dyn-toggle").click();
      await until(
        "removed",
        () => document.getElementById("dyn-extra") === null,
        () => null,
      );
      await until(
        "consistent after removal",
        () => Math.abs(Number(variable(scene, "--neshel-scene-progress")) - implied()) < 0.01,
        () => ({ css: variable(scene, "--neshel-scene-progress"), implied: implied() }),
      );
    },
  );

  await run("composition: Entrance + Hover + Press + parallax on one element", async () => {
    const combo = byId("combo-scroll");
    await place(combo, 0.6);
    await until(
      "revealed",
      () => opacity(combo) === 1,
      () => combo.style.cssText,
    );
    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: -500, clientY: -500, pointerType: "mouse" }),
    );
    await until(
      "at rest",
      () => combo.style.getPropertyValue("--neshel-lift-progress") === "",
      () => combo.style.cssText,
    );
    await frames(3);
    const base = matrix(combo).f;
    // lift (default 4 px) adds to the parallax layer; press and entrance stay composed.
    const r = combo.getBoundingClientRect();
    combo.dispatchEvent(
      new PointerEvent("pointerenter", {
        clientX: r.left + r.width / 2,
        clientY: r.top + r.height / 2,
        pointerType: "mouse",
      }),
    );
    combo.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: r.left + r.width / 2,
        clientY: r.top + r.height / 2,
        pointerType: "mouse",
        bubbles: true,
      }),
    );
    await until(
      "lift added to parallax",
      () => Math.abs(matrix(combo).f - (base - 4)) < 0.75,
      () => [base, matrix(combo).f],
    );
    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: -500, clientY: -500, pointerType: "mouse" }),
    );
    await until(
      "parallax kept after hover",
      () => Math.abs(matrix(combo).f - base) < 0.75,
      () => [base, matrix(combo).f],
    );
  });

  await run("anchors: hash navigation scrolls natively and the engine follows", async () => {
    const before = window.scrollY;
    location.hash = "#gallery-anchor";
    await until(
      "at the anchor",
      () =>
        Math.abs(byId("gallery-anchor").getBoundingClientRect().top) < 2 ||
        window.scrollY >= document.documentElement.scrollHeight - viewportHeight() - 1,
      () => window.scrollY,
    );
    check(window.scrollY !== before, "scroll position unchanged");
    const bar = byId("sp03-bar");
    const max = document.documentElement.scrollHeight - viewportHeight();
    await until(
      "bar follows",
      () =>
        Math.abs(Number(variable(bar, "--neshel-scroll-progress")) - window.scrollY / max) < 0.01,
      () => variable(bar, "--neshel-scroll-progress"),
    );
    history.replaceState(null, "", location.pathname + location.search);
  });

  await run("performance: many timelines, scroll burst frame cost (observation)", async () => {
    await place(byId("g-parallax"), 0.5);
    const intervals: number[] = [];
    let last = performance.now();
    for (let step = 0; step < 60; step++) {
      scrollY(window.scrollY + 25);
      await frame();
      const now = performance.now();
      intervals.push(now - last);
      last = now;
    }
    intervals.sort((a, b) => a - b);
    notes.scrollPerformance = {
      activeTimelines: getScrollDebugInfo().activeTimelines,
      frames: intervals.length,
      medianFrameMs: Math.round((intervals[30] ?? 0) * 10) / 10,
      p95FrameMs: Math.round((intervals[57] ?? 0) * 10) / 10,
    };
    await until(
      "idle after burst",
      () => getFrameScheduler().size === 0,
      () => getFrameScheduler().size,
    );
  });

  return cases;
}

/** Facts checked by the harnesses while the emulated preference is `reduce` (live switch). */
export function scrollReducedFacts() {
  const hscroll = byId("sp04").dataset.neshelHscroll;
  const dot = byId("sp01-2").style.transform;
  const scene = byId("scene-layer-front").style.transform;
  const skew = byId("sp11").style.transform;
  return {
    hscroll,
    dot,
    scene,
    skew,
    reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}
