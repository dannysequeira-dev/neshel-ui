// In-page checks of the Phase 012 gallery in a real layout engine. Shared by the CDP check (Chrome) and the
// Playwright check (Chromium, Firefox, WebKit). Input here is synthetic (PointerEvent/KeyboardEvent/WheelEvent
// with pointer ids, so multi-pointer gestures run in every engine); the CDP check adds real mouse, real
// multi-touch and real keyboard input on top. Every result is decided by an observable condition with a
// ceiling, never by a fixed sleep; frame counts only bound "nothing must happen" checks.
import { getFrameScheduler, prefersReducedMotion } from "@neshel-ui/animations/core";
import { getGestureDebugInfo } from "@neshel-ui/animations/gestures";
import { getLayoutDebugInfo } from "@neshel-ui/animations/layout";
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
const center = (element: Element) => {
  const r = element.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};
const matrix = (element: Element) => new DOMMatrix(getComputedStyle(element).transform);
const tx = (element: Element) => matrix(element).m41;
const ty = (element: Element) => matrix(element).m42;
const scaleX = (element: Element) => Math.hypot(matrix(element).a, matrix(element).b);
const angle = (element: Element) =>
  (Math.atan2(matrix(element).b, matrix(element).a) * 180) / Math.PI;
const inline = (element: HTMLElement, property = "transform") =>
  element.style.getPropertyValue(property);

let nextPointerId = 100;
function pointer(
  target: Element,
  type: string,
  x: number,
  y: number,
  id = 1,
  pointerType = "mouse",
) {
  target.dispatchEvent(
    new PointerEvent(type, {
      pointerId: id,
      clientX: x,
      clientY: y,
      pointerType,
      isPrimary: true,
      button: 0,
      buttons: type === "pointerup" ? 0 : 1,
      bubbles: true,
      cancelable: true,
      composed: true,
    }),
  );
}
/** A synthetic drag on `target` by (dx, dy) in `steps` moves, one per frame. */
async function dragBy(
  target: Element,
  dx: number,
  dy: number,
  steps = 8,
  release = true,
  pointerType = "mouse",
) {
  const id = nextPointerId++;
  const start = center(target);
  pointer(target, "pointerdown", start.x, start.y, id, pointerType);
  for (let i = 1; i <= steps; i++) {
    await frame();
    pointer(
      target,
      "pointermove",
      start.x + (dx * i) / steps,
      start.y + (dy * i) / steps,
      id,
      pointerType,
    );
  }
  if (release) pointer(target, "pointerup", start.x + dx, start.y + dy, id, pointerType);
  return id;
}
const key = (target: Element, name: string, type = "keydown") =>
  target.dispatchEvent(new KeyboardEvent(type, { key: name, bubbles: true, cancelable: true }));
const idle = () => getFrameScheduler().size === 0;

/** Count layout reads (getBoundingClientRect, offset*, client*, scroll extents) during `run`. */
/** Where unexpected reads came from (first stacks), reported in failure messages. */
const readSources: string[] = [];
function source(label: string): void {
  if (readSources.length >= 3) return;
  const stack = (new Error().stack ?? "").split(String.fromCharCode(10)).slice(2, 6);
  readSources.push(`${label}: ${stack.join(" <- ")}`);
}
async function countLayoutReads(run: () => Promise<void>) {
  let reads = 0;
  readSources.length = 0;
  const restore: Array<() => void> = [];
  const rect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function (this: Element) {
    reads++;
    source("getBoundingClientRect");
    return rect.call(this);
  };
  restore.push(() => {
    Element.prototype.getBoundingClientRect = rect;
  });
  for (const [proto, key] of [
    [HTMLElement.prototype, "offsetTop"],
    [HTMLElement.prototype, "offsetLeft"],
    [HTMLElement.prototype, "offsetWidth"],
    [HTMLElement.prototype, "offsetHeight"],
    [Element.prototype, "clientWidth"],
    [Element.prototype, "clientHeight"],
    [Element.prototype, "scrollHeight"],
  ] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, key);
    if (!descriptor?.get) continue;
    const get = descriptor.get;
    Object.defineProperty(proto, key, {
      ...descriptor,
      get(this: Element) {
        reads++;
        source(key);
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

async function show(element: Element) {
  element.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
  // Wait until the element stops moving (scroll settled, layout stable) for three frames.
  let last = Number.NaN;
  let stable = 0;
  for (let i = 0; i < 120 && stable < 3; i++) {
    await frame();
    const top = element.getBoundingClientRect().top;
    stable = Math.abs(top - last) < 0.5 ? stable + 1 : 0;
    last = top;
  }
}

export async function runGesturesSuite(): Promise<Case[]> {
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

  /* -------------------------------------------------------------------------------- gestures */
  await run(
    "G01 drag: follows the pointer, coasts after release, stays inside the arena, zero reads per move",
    async () => {
      const puck = byId("g01-drag");
      const arena = byId("g01-arena");
      await show(arena);
      // Start at rest: other motion (e.g. a closing accordion resizing the page) may make the Phase 011
      // scroll engine re-measure in its read phase; this case is about reads caused by pointer moves.
      await until("page at rest", idle, () => getFrameScheduler().size);
      const id = nextPointerId++;
      const start = center(puck);
      pointer(puck, "pointerdown", start.x, start.y, id);
      await frame();
      pointer(puck, "pointermove", start.x + 6, start.y, id); // activation measures here
      const reads = await countLayoutReads(async () => {
        for (let i = 2; i <= 12; i++) {
          await frame();
          pointer(puck, "pointermove", start.x + i * 9, start.y + i * 2, id);
        }
      });
      if (reads !== 0) pointer(puck, "pointerup", start.x, start.y, id); // never leave a pointer down
      check(reads === 0, `${reads} layout reads during pointer moves; ${readSources.join(" || ")}`);
      await frame();
      const moving = tx(puck);
      check(moving > 50, `follows: ${moving}`);
      pointer(puck, "pointerup", start.x + 108, start.y + 24, id);
      await until("inertia settles", idle, () => tx(puck));
      const a = arena.getBoundingClientRect();
      const p = puck.getBoundingClientRect();
      check(
        p.left >= a.left - 1 && p.right <= a.right + 1,
        `inside: ${p.left}-${p.right} in ${a.left}-${a.right}`,
      );
      // Keyboard alternative.
      puck.focus();
      const before = tx(puck);
      key(puck, "Home");
      await until(
        "Home returns to rest",
        () => idle() && Math.abs(tx(puck)) < 0.5,
        () => tx(puck),
      );
      key(puck, "ArrowRight");
      await until(
        "arrow moves",
        () => idle() && Math.abs(tx(puck) - 10) < 0.5,
        () => tx(puck),
      );
      notes.g01 = { moved: moving, before };
    },
  );

  await run(
    "G02 snap: release lands exactly on a snap point; arrows step between points",
    async () => {
      const puck = byId("g02-snap");
      await show(puck);
      await dragBy(puck, 70, 0, 6);
      await until(
        "snapped",
        () => idle() && [0, 70, 140].some((p) => Math.abs(tx(puck) - p) < 0.5),
        () => tx(puck),
      );
      puck.focus();
      key(puck, "Home");
      await until(
        "home",
        () => idle() && Math.abs(tx(puck)) < 0.5,
        () => tx(puck),
      );
      key(puck, "ArrowRight");
      await until(
        "next snap point",
        () => idle() && Math.abs(tx(puck) - 70) < 0.5,
        () => tx(puck),
      );
    },
  );

  await run(
    "G03 swipe: a swipe dismisses (consumer removes it); the dismiss button is the alternative",
    async () => {
      const list = byId("g03-list");
      await show(list);
      const first = list.querySelector<HTMLElement>(".g-note");
      check(first, "note");
      const label = first?.getAttribute("data-note");
      await dragBy(first as HTMLElement, 260, 0, 6);
      await until(
        "removed",
        () => !list.querySelector(`[data-note="${label}"]`),
        () => list.textContent,
      );
      const second = list.querySelector<HTMLElement>(".g-note button");
      second?.click();
      await until(
        "button dismisses",
        () => list.querySelectorAll(".g-note").length === 1,
        () => list.textContent,
      );
      byId("g03-reset").click();
      await until(
        "restored",
        () => list.querySelectorAll(".g-note").length === 3,
        () => list.textContent,
      );
    },
  );

  await run(
    "G04 pull to refresh: pulling at the top refreshes once; the button refreshes; never blocks scrolling",
    async () => {
      const pull = byId("g04-pull");
      const scroller = pull.querySelector<HTMLElement>(".neshel-pull-scroller");
      check(scroller, "scroller");
      await show(pull);
      const count = () => Number(byId("g04-count").textContent);
      const before = count();
      await dragBy(scroller as HTMLElement, 0, 220, 10);
      await until(
        "refreshed",
        () => count() === before + 1 && !scroller?.hasAttribute("aria-busy"),
        () => count(),
      );
      (pull.querySelector(".neshel-pull-button") as HTMLButtonElement).click();
      await until(
        "button refresh",
        () => count() === before + 2,
        () => count(),
      );
      check(
        getComputedStyle(scroller as Element).touchAction === "auto",
        "no touch-action on the scroller",
      );
    },
  );

  await run("G05 spring follow: the element chases the value and rests on it", async () => {
    const input = byId("g05-input") as HTMLInputElement;
    const follower = byId("g05-follow");
    await show(follower);
    // The native setter, so React's value tracker sees a change (as with real input).
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "150");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await frames(3);
    const mid = tx(follower);
    await until(
      "rests on 150",
      () => idle() && Math.abs(tx(follower) - 150) < 0.5,
      () => tx(follower),
    );
    check(mid < 150, `chases (not a jump): ${mid}`);
  });

  await run(
    "G06 elastic edge: wheel past the top stretches the content, then it springs back",
    async () => {
      const scroller = byId("g06-elastic");
      const content = scroller.firstElementChild as HTMLElement;
      await show(scroller);
      scroller.scrollTop = 0;
      let stretched = 0;
      for (let i = 0; i < 4; i++) {
        scroller.dispatchEvent(
          new WheelEvent("wheel", { deltaY: -60, bubbles: true, cancelable: true }),
        );
        await frame();
        stretched = Math.max(stretched, ty(content));
      }
      check(stretched > 2, `stretched ${stretched}`);
      await until(
        "back",
        () => idle() && Math.abs(ty(content)) < 0.1,
        () => ty(content),
      );
    },
  );

  await run("G07 fling: a throw bounces inside the arena and rests", async () => {
    const puck = byId("g07-fling");
    const arena = byId("g07-arena");
    await show(arena);
    await dragBy(puck, 140, 30, 4);
    let escaped = false;
    await until(
      "rests",
      () => {
        const a = arena.getBoundingClientRect();
        const p = puck.getBoundingClientRect();
        if (p.left < a.left - 1 || p.right > a.right + 1) escaped = true;
        return idle();
      },
      () => tx(puck),
    );
    check(!escaped, "stayed inside the arena while bouncing");
  });

  await run(
    "G08 pinch zoom: two pointers scale about the centroid; buttons zoom; touch-action follows the scale",
    async () => {
      const zoom = byId("g08-zoom");
      const frameEl = zoom.querySelector<HTMLElement>(".neshel-zoom-frame");
      const media = zoom.querySelector<HTMLElement>("img");
      check(frameEl && media, "frame and media");
      await show(zoom);
      check(
        getComputedStyle(frameEl as Element).touchAction.includes("pan-x"),
        "scale 1: one-finger scrolling kept",
      );
      const c = center(media as Element);
      const a = nextPointerId++;
      const b = nextPointerId++;
      pointer(media as Element, "pointerdown", c.x - 40, c.y, a, "touch");
      pointer(media as Element, "pointerdown", c.x + 40, c.y, b, "touch");
      for (let i = 1; i <= 6; i++) {
        await frame();
        pointer(media as Element, "pointermove", c.x - 40 - i * 10, c.y, a, "touch");
        pointer(media as Element, "pointermove", c.x + 40 + i * 10, c.y, b, "touch");
      }
      pointer(media as Element, "pointerup", c.x + 100, c.y, b, "touch");
      pointer(media as Element, "pointerup", c.x - 100, c.y, a, "touch");
      await until(
        "pinched ~2.5×",
        () => idle() && Math.abs(scaleX(media as Element) - 2.5) < 0.05,
        () => scaleX(media as Element),
      );
      check(
        getComputedStyle(frameEl as Element).touchAction === "none",
        "zoomed in: the media pans",
      );
      const buttons = [...zoom.querySelectorAll("button")];
      buttons.find((button) => button.textContent === "Reset zoom")?.click();
      await until(
        "reset",
        () => idle() && Math.abs(scaleX(media as Element) - 1) < 0.01,
        () => scaleX(media as Element),
      );
      buttons.find((button) => button.textContent === "Zoom in")?.click();
      await until(
        "zoom in button",
        () => idle() && Math.abs(scaleX(media as Element) - 1.5) < 0.01,
        () => scaleX(media as Element),
      );
      check(
        /150%/.test(zoom.querySelector('[role="status"]')?.textContent ?? ""),
        "zoom level announced",
      );
      buttons.find((button) => button.textContent === "Reset zoom")?.click();
      await until(
        "reset again",
        () => idle(),
        () => scaleX(media as Element),
      );
    },
  );

  await run("G09 rotate: two pointers rotate; buttons and keys are the alternatives", async () => {
    const dial = byId("g09-rotate");
    await show(dial);
    const c = center(dial);
    const a = nextPointerId++;
    const b = nextPointerId++;
    pointer(dial, "pointerdown", c.x - 40, c.y, a, "touch");
    pointer(dial, "pointerdown", c.x + 40, c.y, b, "touch");
    for (let i = 1; i <= 6; i++) {
      await frame();
      const t = (Math.PI / 4) * (i / 6);
      pointer(dial, "pointermove", c.x + 40 * Math.cos(t), c.y + 40 * Math.sin(t), b, "touch");
      pointer(dial, "pointermove", c.x - 40 * Math.cos(t), c.y - 40 * Math.sin(t), a, "touch");
    }
    pointer(dial, "pointerup", c.x, c.y, b, "touch");
    pointer(dial, "pointerup", c.x, c.y, a, "touch");
    await until(
      "rotated ~45°",
      () => idle() && Math.abs(angle(dial) - 45) < 1,
      () => angle(dial),
    );
    byId("g09-left").click();
    await until(
      "button rotates",
      () => idle() && Math.abs(angle(dial) - 30) < 1,
      () => angle(dial),
    );
    dial.focus();
    key(dial, "0");
    await until(
      "0 resets",
      () => idle() && Math.abs(angle(dial)) < 0.5,
      () => angle(dial),
    );
  });

  await run(
    "G10 reorder: keyboard and buttons change the consumer's order, keep focus and announce once per move",
    async () => {
      const list = byId("g10-list");
      await show(list);
      const names = () =>
        [...list.querySelectorAll(".g-fruit")].map((li) =>
          li.getAttribute("data-neshel-reorder-label"),
        );
      const start = names();
      const handle = list.querySelector<HTMLElement>(".neshel-reorder-handle");
      check(handle, "handle");
      handle?.focus();
      key(handle as Element, " ");
      check(handle?.getAttribute("aria-pressed") === "true", "grabbed");
      key(handle as Element, "ArrowDown");
      await until(
        "moved",
        () => names()[1] === start[0],
        () => names(),
      );
      await frames(2);
      check(document.activeElement === handle, "focus stays on the moved handle");
      const live = list.parentElement?.querySelector('[role="status"]');
      check(/position 2 of 4/.test(live?.textContent ?? ""), `announced: ${live?.textContent}`);
      key(handle as Element, " ");
      await until("settled", idle, () => names());
      // Move up button of the moved item.
      const up = [...list.querySelectorAll<HTMLButtonElement>("button")].find(
        (button) =>
          button.textContent === "Move up" &&
          !button.disabled &&
          button.closest(".g-fruit")?.getAttribute("data-neshel-reorder-label") === start[0],
      );
      up?.click();
      await until(
        "back to the start order",
        () => names().join() === start.join(),
        () => names(),
      );
      // Pointer drag on the handle (measured at rest: the move-up FLIP may still be running).
      await until("settled after the button", idle, () => names());
      const firstHandle = list.querySelector<HTMLElement>(".neshel-reorder-handle");
      // Past the next item's centre (items may have different heights).
      const [one, two] = [...list.children].map((li) => li.getBoundingClientRect()) as DOMRect[];
      const distance =
        (two as DOMRect).top +
        (two as DOMRect).height / 2 -
        ((one as DOMRect).top + (one as DOMRect).height / 2) +
        8;
      await dragBy(firstHandle as Element, 0, distance, 10);
      await until(
        "dragged to position 2",
        () => names()[1] === start[0],
        () => ({
          names: names(),
          distance,
          claims: getGestureDebugInfo().claims,
          transforms: [...list.children].map((li) => (li as HTMLElement).style.transform),
        }),
      );
      await until(
        "settled after drop",
        () => idle() && [...list.children].every((li) => !(li as HTMLElement).style.transform),
        () => names(),
      );
    },
  );

  await run("G11 squash & stretch: stretches along the drag velocity and recovers", async () => {
    const puck = byId("g11-squash");
    await show(puck);
    const id = nextPointerId++;
    const s = center(puck);
    pointer(puck, "pointerdown", s.x, s.y, id);
    let stretched = 1;
    for (let i = 1; i <= 8; i++) {
      await frame();
      pointer(puck, "pointermove", s.x + i * 14, s.y, id);
      const m = matrix(puck);
      stretched = Math.max(stretched, m.a / Math.max(m.d, 1e-3));
    }
    pointer(puck, "pointerup", s.x + 112, s.y, id);
    check(stretched > 1.02, `stretched ${stretched}`);
    await until(
      "recovers",
      () => idle() && Math.abs(matrix(puck).a - matrix(puck).d) < 0.002,
      () => [matrix(puck).a, matrix(puck).d],
    );
  });

  await run(
    "H11 cursor follower: decorative, aria-hidden, non-interactive; the button under it still clicks",
    async () => {
      const area = byId("h11-area");
      await show(area);
      const dot = area.querySelector<HTMLElement>(".neshel-cursor-follower");
      check(dot?.getAttribute("aria-hidden") === "true", "aria-hidden");
      check(getComputedStyle(dot as Element).pointerEvents === "none", "pointer-events none");
      // Synthetic moves are dispatched on the area itself: a move on the element (re)starts the hover
      // tracking, so the result does not depend on where the REAL mouse is (WebKit re-dispatches the real
      // mouse position after scrolling/layout, which legitimately ends a hover started synthetically).
      const move = (i: number) => {
        const live = area.getBoundingClientRect();
        area.dispatchEvent(
          new PointerEvent("pointermove", {
            clientX: live.left + 30 + (i % 8) * 10,
            clientY: live.top + 30,
            pointerType: "mouse",
            bubbles: true,
          }),
        );
      };
      let step = 0;
      await until(
        "visible",
        () => {
          move(step++);
          return Number(getComputedStyle(dot as Element).opacity) > 0.9 || prefersReducedMotion();
        },
        () => ({ style: dot?.style.cssText, steps: step }),
      );
      const button = byId("h11-button");
      const hit = document.elementFromPoint(center(button).x, center(button).y);
      check(hit === button || button.contains(hit), "the follower never captures hit testing");
    },
  );

  await run(
    "P11 long press: holding activates once; the follow-up click is swallowed; early release cancels",
    async () => {
      const button = byId("p11-button");
      await show(button);
      const held = () => Number(byId("p11-count").textContent);
      const clicks = () => Number(byId("p11-clicks").textContent);
      const before = held();
      const clicksBefore = clicks();
      const c = center(button);
      const id = nextPointerId++;
      pointer(button, "pointerdown", c.x, c.y, id);
      await until(
        "held",
        () => held() === before + 1,
        () => held(),
        3000,
      );
      pointer(button, "pointerup", c.x, c.y, id);
      button.click(); // the click a real release would produce
      await frames(2);
      check(clicks() === clicksBefore, "click swallowed after the long press");
      const id2 = nextPointerId++;
      pointer(button, "pointerdown", c.x, c.y, id2);
      await frames(5);
      pointer(button, "pointerup", c.x, c.y, id2);
      await frames(50);
      check(held() === before + 1, "early release cancels");
    },
  );

  /* -------------------------------------------------------------------------------- layout */
  await run(
    "L01 FLIP: items animate to their new place, no layout read during animation frames",
    async () => {
      const list = byId("l01");
      await show(list);
      const before = getLayoutDebugInfo();
      byId("l01-shuffle").click();
      await frame();
      await frame();
      const moving = [...list.children].some((li) =>
        (li as HTMLElement).style.transform.includes("translate"),
      );
      check(moving, "inverted layers written");
      const reads = await countLayoutReads(async () => {
        await frames(6);
      });
      check(reads === 0, `${reads} layout reads during FLIP frames; ${readSources.join(" || ")}`);
      await until(
        "settled",
        () => idle() && [...list.children].every((li) => !(li as HTMLElement).style.transform),
        () => list.textContent,
      );
      const after = getLayoutDebugInfo();
      check(
        after.snapshots > before.snapshots && after.plays > before.plays,
        "snapshot and play ran",
      );
    },
  );

  await run(
    "L02 auto-height: the wrapper height follows the content with a transient animation",
    async () => {
      const wrapper = byId("l02");
      await show(wrapper);
      const h0 = wrapper.getBoundingClientRect().height;
      byId("l02-add").click();
      await until(
        "animating",
        () => wrapper.getAnimations().length > 0,
        () => wrapper.getAnimations().length,
        2000,
      );
      await until(
        "done",
        () => wrapper.getAnimations().length === 0,
        () => wrapper.getBoundingClientRect().height,
      );
      const content = wrapper.firstElementChild as HTMLElement;
      // The wrapper's padding box equals the content height (its border is outside).
      check(
        Math.abs(wrapper.clientHeight - content.getBoundingClientRect().height) < 1,
        `final height ${wrapper.clientHeight} vs ${content.getBoundingClientRect().height}`,
      );
      check(wrapper.getBoundingClientRect().height > h0, "grew");
      check(!wrapper.style.height, "no inline height left");
    },
  );

  await run("L03 list enter/exit: removed item exits then unmounts; siblings settle", async () => {
    const list = byId("l03");
    await show(list);
    const count = () => list.querySelectorAll("li").length;
    const n = count();
    byId("l03-remove").click();
    await frame();
    const exiting = list.querySelector('[data-neshel-presence="exiting"]');
    check(
      exiting && exiting.getAttribute("aria-hidden") === "true",
      "exiting item inert and hidden",
    );
    await until(
      "removed",
      () => count() === n - 1,
      () => count(),
    );
    byId("l03-add").click();
    await until(
      "added",
      () => count() === n,
      () => count(),
    );
    await until("settled", idle, () => count());
  });

  await run(
    "L04 shared layout: the highlight animates from the old selection to the new one",
    async () => {
      const group = byId("l04");
      await show(group);
      const buttons = group.querySelectorAll<HTMLButtonElement>("button");
      const target = buttons[2] as HTMLButtonElement;
      target.click();
      await frame();
      await frame();
      const highlight = target.querySelector<HTMLElement>(".g-highlight");
      check(highlight, "new highlight");
      check(tx(highlight as Element) < -20, `starts at the old box: ${tx(highlight as Element)}`);
      await until(
        "settled",
        () => idle() && Math.abs(tx(highlight as Element)) < 0.5,
        () => tx(highlight as Element),
      );
      (buttons[0] as HTMLButtonElement).click();
      await until("settled back", idle, () => 0);
    },
  );

  await run(
    "L05 grid reflow: a width change reflows and animates children without React renders",
    async () => {
      const grid = byId("l05");
      await show(grid);
      const before = getLayoutDebugInfo().reflows;
      byId("l05-toggle").click();
      await until(
        "reflow pass",
        () => getLayoutDebugInfo().reflows > before,
        () => getLayoutDebugInfo(),
      );
      await frame();
      const moving = [...grid.children].some((cell) =>
        (cell as HTMLElement).style.transform.includes("translate"),
      );
      check(moving, "children inverted");
      await until(
        "settled",
        () => idle() && [...grid.children].every((cell) => !(cell as HTMLElement).style.transform),
        () => 0,
      );
      byId("l05-toggle").click();
      await until("settled back", idle, () => 0);
    },
  );

  await run(
    "L06 accordion: the auto driver animates height (CSS where supported, measured otherwise); js driver too",
    async () => {
      const panel = byId("l06-panel-0");
      await show(byId("l06-auto"));
      const css = panel.getAttribute("data-neshel-fx")?.includes("collapse-css") ?? false;
      notes.l06Driver = css ? "css" : "js";
      byId("l06-trigger-0").click();
      let mid = false;
      await until(
        "opened",
        () => {
          const h = panel.getBoundingClientRect().height;
          const full = (panel.firstElementChild as HTMLElement).getBoundingClientRect().height;
          if (h > 1 && h < full - 1) mid = true;
          return panel.getAttribute("data-state") === "open" && Math.abs(h - full) < 1;
        },
        () => panel.getBoundingClientRect().height,
      );
      check(mid, "an intermediate height was observed (animated, not a jump)");
      check(byId("l06-trigger-0").getAttribute("aria-expanded") === "true", "trigger state");
      byId("l06-trigger-0").click();
      await until(
        "closed",
        () => panel.getBoundingClientRect().height < 0.5,
        () => panel.getBoundingClientRect().height,
      );
      await until(
        "hidden content",
        () => panel.inert || panel.hasAttribute("hidden"),
        () => panel.outerHTML.slice(0, 120),
        2000,
      );
      const jsPanel = byId("l06-js-panel");
      byId("l06-js-trigger").click();
      await until(
        "js animation",
        () => jsPanel.getAnimations().length > 0,
        () => 0,
        2000,
      );
      await until(
        "js opened",
        () => jsPanel.getAnimations().length === 0 && jsPanel.getBoundingClientRect().height > 10,
        () => 0,
      );
      byId("l06-js-trigger").click();
      await until(
        "js closed",
        () => jsPanel.getBoundingClientRect().height < 0.5,
        () => 0,
      );
    },
  );

  await run("L07 tab indicator: slides under the active tab (package layer only)", async () => {
    const tablist = byId("l07");
    await show(tablist);
    const indicator = tablist.querySelector<HTMLElement>(".neshel-tab-indicator");
    check(indicator?.getAttribute("aria-hidden") === "true", "decorative layer");
    const tabs = tablist.querySelectorAll<HTMLElement>('[role="tab"]');
    (tabs[2] as HTMLElement).click();
    await until(
      "under the third tab",
      () => {
        const t = (tabs[2] as HTMLElement).getBoundingClientRect();
        const i = (indicator as HTMLElement).getBoundingClientRect();
        return Math.abs(i.left - t.left) < 1 && Math.abs(i.width - t.width) < 1;
      },
      () => [
        indicator?.getBoundingClientRect().left,
        (tabs[2] as HTMLElement).getBoundingClientRect().left,
      ],
    );
    check(!tablist.style.transform && !(tabs[2] as HTMLElement).style.transform, "tabs untouched");
    (tabs[0] as HTMLElement).click();
    await frames(2);
  });

  await run(
    "L08 presence: the card exits before it unmounts; re-entry during the exit keeps the node",
    async () => {
      const toggle = byId("l08-toggle");
      await show(toggle);
      const card = byId("l08-card");
      toggle.click();
      await frame();
      check(
        card.isConnected && card.getAttribute("aria-hidden") === "true",
        "still mounted, hidden from AT",
      );
      // Re-enter while the exit is observably running (feature 017: a fixed 3-frame wait assumed frames
      // under ~55 ms; at the scheduler's 66 ms delta ceiling the 220 ms exit finished first on macOS runners).
      await until(
        "exit in progress",
        () => {
          const opacity = Number(getComputedStyle(card).opacity);
          return card.isConnected && opacity > 0 && opacity < 1;
        },
        () => `${card.isConnected} ${getComputedStyle(card).opacity}`,
      );
      toggle.click(); // re-entry, in the same task that observed the running exit
      await frame();
      check(document.getElementById("l08-card") === card, "same element on re-entry");
      await until(
        "visible again",
        () => idle() && getComputedStyle(card).opacity === "1",
        () => getComputedStyle(card).opacity,
      );
      toggle.click();
      await until(
        "unmounted",
        () => !document.getElementById("l08-card"),
        () => 0,
      );
      toggle.click();
      await until(
        "back",
        () => !!document.getElementById("l08-card") && idle(),
        () => 0,
      );
    },
  );

  await run(
    "L09 cross-fade: old and new content overlap during the swap, then one layer remains",
    async () => {
      const box = byId("l09");
      await show(box);
      byId("l09-next").click();
      await frame();
      check(
        box.querySelectorAll(".neshel-crossfade-layer").length === 2,
        "two layers during the swap",
      );
      await until(
        "one layer",
        () => box.querySelectorAll(".neshel-crossfade-layer").length === 1 && idle(),
        () => box.innerHTML.length,
      );
    },
  );

  await run(
    "L10 masonry: row spans from observed heights; a width change reflows with animation",
    async () => {
      const grid = byId("l10");
      await show(grid);
      const bricks = [...grid.children] as HTMLElement[];
      check(
        bricks.every((brick) => Number(brick.style.getPropertyValue("--neshel-masonry-span")) > 1),
        "spans written",
      );
      const tops = bricks.map((brick) => brick.getBoundingClientRect().top);
      check(new Set(tops.map(Math.round)).size > 2, "masonry, not rows");
      byId("l05-toggle").click(); // the same state also changes the masonry column width
      await until(
        "settled",
        () => idle(),
        () => 0,
      );
      byId("l05-toggle").click();
      await until("settled back", idle, () => 0);
    },
  );

  /* -------------------------------------------------------------------------------- composition & cleanup */
  await run(
    "composition: drag + Tilt3D and drag + hover + press compose in one transform",
    async () => {
      const tiltPuck = byId("c-drag-tilt");
      await show(tiltPuck);
      const id = nextPointerId++;
      const s = center(tiltPuck);
      pointer(tiltPuck, "pointerdown", s.x, s.y, id);
      for (let i = 1; i <= 6; i++) {
        await frame();
        pointer(tiltPuck, "pointermove", s.x + i * 8, s.y + 4, id);
      }
      await frames(4);
      const t = inline(tiltPuck);
      check(/translate3d/.test(t) && /rotate[XY]/.test(t), `both layers: ${t}`);
      pointer(tiltPuck, "pointerup", s.x + 48, s.y + 4, id);
      await until("settled", idle, () => inline(tiltPuck));
      const puck = byId("c-drag-hover-press");
      const p = center(puck);
      puck.dispatchEvent(
        new PointerEvent("pointerenter", { clientX: p.x, clientY: p.y, pointerType: "mouse" }),
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", { clientX: p.x, clientY: p.y, pointerType: "mouse" }),
      );
      const id2 = nextPointerId++;
      pointer(puck, "pointerdown", p.x, p.y, id2);
      for (let i = 1; i <= 4; i++) {
        await frame();
        pointer(puck, "pointermove", p.x + i * 5, p.y, id2);
      }
      await frames(6);
      const both = inline(puck);
      check(/translate3d/.test(both) && /scale\(/.test(both), `drag + lift + press: ${both}`);
      pointer(puck, "pointerup", p.x + 20, p.y, id2);
      await until("settled", idle, () => inline(puck));
    },
  );

  await run("idle: no frame task and no claimed pointer at rest", async () => {
    await until("scheduler idle", idle, () => getFrameScheduler().size);
    const info = getGestureDebugInfo();
    check(info.claims === 0, `claims ${info.claims}`);
    notes.gestureSessions = info.sessions;
  });

  return cases;
}

/** Facts for the live reduced-motion checks of the CDP/Playwright runners. */
export async function gesturesReducedFacts(): Promise<Record<string, unknown>> {
  const facts: Record<string, unknown> = { reduced: prefersReducedMotion() };
  // FLIP: a shuffle applies at once.
  const list = byId("l01");
  byId("l01-shuffle").click();
  await frames(2);
  facts.flipTransform = [...list.children]
    .map((li) => (li as HTMLElement).style.transform)
    .join("");
  // Cursor follower stays hidden.
  const dot = byId("h11-area").querySelector<HTMLElement>(".neshel-cursor-follower");
  facts.follower = dot?.style.opacity ?? "";
  // Drag: inertia removed (instant end state, no task after release).
  const puck = byId("g01-drag");
  await dragBy(puck, 40, 0, 4);
  await frames(2);
  facts.dragIdle = getFrameScheduler().size === 0;
  facts.dragMoved = Math.round(tx(puck));
  return facts;
}
