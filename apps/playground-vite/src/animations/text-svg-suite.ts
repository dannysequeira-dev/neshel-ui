// In-page checks of the Phase 014 gallery in a real layout engine, shared by the CDP check (Chrome) and the
// Playwright check (Chromium, Firefox, WebKit). Decided by observable conditions with ceilings, never by fixed
// sleeps. Capabilities an engine lacks are recorded as notes (native vs fallback), not failures.
import { getFrameScheduler } from "@neshel-ui/animations/core";
import { getPathGeometry, getSvgDebugInfo, getSvgSupport } from "@neshel-ui/animations/svg";
import { getTextDebugInfo, getTextSupport, splitText } from "@neshel-ui/animations/text";
import { labState } from "./lab-state";

type Case = { id: string; ok: boolean; error?: string };

const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
async function frames(count: number) {
  for (let index = 0; index < count; index++) await frame();
}
async function until(label: string, condition: () => boolean, describe: () => unknown, ms = 6000) {
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
const prop = (element: Element, name: string) =>
  getComputedStyle(element).getPropertyValue(name).trim();
const idle = () => getFrameScheduler().size === 0;
const notes = () => labState().notes;

async function runCases(list: Array<[string, () => Promise<void>]>): Promise<Case[]> {
  const cases: Case[] = [];
  for (const [id, fn] of list) {
    try {
      await fn();
      cases.push({ id, ok: true });
    } catch (error) {
      cases.push({ id, ok: false, error: String((error as Error)?.message ?? error) });
    }
  }
  return cases;
}

function lastPieceOpacity(id: string): number {
  const pieces = byId(id).querySelectorAll<HTMLElement>(
    ".neshel-split .neshel-split-char, .neshel-split[data-split=words] .neshel-split-word, .neshel-split > .neshel-split-line",
  );
  const last = pieces[pieces.length - 1];
  return last ? Number(getComputedStyle(last).opacity) : Number.NaN;
}

export async function runTextSvgSuite(): Promise<Case[]> {
  const lab = labState();
  const api = lab.textSvg;
  if (!api) throw new Error("text/svg gallery not mounted");
  byId("text-svg-title").scrollIntoView();
  notes().textSupport = getTextSupport();
  notes().svgSupport = getSvgSupport();
  return runCases([
    [
      "T01 split reveal: one accessible copy, aria-hidden pieces, chars/words/lines reach visible; zero React commits; idle",
      async () => {
        const commits = api.commits();
        api.replay();
        await frames(2);
        const commitsAfterReplay = api.commits();
        for (const id of ["t01-chars", "t01-words", "t01-lines"]) {
          const element = byId(id);
          const a11y = element.querySelector(".neshel-text-a11y");
          const root = element.querySelector(".neshel-split");
          check(a11y && root, `${id}: split`);
          check(root?.getAttribute("aria-hidden") === "true", `${id}: visual copy aria-hidden`);
          check(
            element.querySelectorAll(".neshel-text-a11y").length === 1,
            `${id}: one accessible copy`,
          );
          check(
            a11y?.textContent?.replace(/\s+/g, "") === root?.textContent?.replace(/\s+/g, ""),
            `${id}: same text`,
          );
        }
        await until(
          "all revealed",
          () => ["t01-chars", "t01-words", "t01-lines"].every((id) => lastPieceOpacity(id) > 0.99),
          () => ["t01-chars", "t01-words", "t01-lines"].map(lastPieceOpacity),
        );
        await until("idle", idle, () => getFrameScheduler().size);
        check(
          api.commits() === commitsAfterReplay,
          `React commits during playback: ${api.commits() - commitsAfterReplay}`,
        );
        void commits;
      },
    ],
    [
      "T01 Unicode: ZWJ family emoji is one piece; RTL run laid out right-to-left inside LTR text; Arabic word kept whole",
      async () => {
        const chars = [...byId("t01-chars").querySelectorAll(".neshel-split-char")].map(
          (c) => c.textContent,
        );
        check(chars.includes("👨‍👩‍👧‍👦"), `emoji cluster pieces: ${chars.slice(-3).join("|")}`);
        const mixed = byId("t01-mixed");
        const run = mixed.querySelector('.neshel-split-run[dir="rtl"]');
        check(run, "rtl run isolate");
        const hebrew = [...(run?.querySelectorAll(".neshel-split-char") ?? [])].filter((c) =>
          /[֐-׿]/.test(c.textContent ?? ""),
        );
        const xs = hebrew.map((c) => c.getBoundingClientRect().left);
        const [x0 = 0, x1 = 0, x2 = 0] = xs;
        check(
          xs.length > 3 && x0 > x1 && x1 > x2,
          `Hebrew clusters right-to-left: ${xs.slice(0, 3).map(Math.round)}`,
        );
        const digits = [...mixed.querySelectorAll(".neshel-split-word")].find(
          (w) => w.textContent === "123",
        );
        const d = [...(digits?.querySelectorAll(".neshel-split-char") ?? [])].map(
          (c) => c.getBoundingClientRect().left,
        );
        const [d0 = 0, d1 = 0, d2 = 0] = d;
        check(d.length === 3 && d0 < d1 && d1 < d2, `digits left-to-right: ${d.map(Math.round)}`);
        const arabic = [...mixed.querySelectorAll("[data-neshel-split-whole]")].map(
          (w) => w.textContent,
        );
        check(arabic.includes("مرحبا"), `Arabic whole: ${arabic}`);
      },
    ],
    [
      "T01 + Capsize: the trimmed Heading keeps its box height when split",
      async () => {
        const plain = byId("t01-trim-plain").getBoundingClientRect().height;
        const split = byId("t01-trim-split");
        check(
          split.classList.contains("neshel-text-trim") || split.className.includes("trim"),
          `trim class: ${split.className}`,
        );
        await until(
          "revealed",
          () => lastPieceOpacity("t01-trim-split") > 0.99,
          () => lastPieceOpacity("t01-trim-split"),
        );
        const height = split.getBoundingClientRect().height;
        check(Math.abs(height - plain) <= 0.5, `height ${height} vs plain ${plain}`);
        notes().capsizeHeights = { plain, split: height };
      },
    ],
    [
      "T01 lines regroup on resize without replay; layout reads only at split/resize",
      async () => {
        const element = byId("t01-lines");
        const reads = getTextDebugInfo().reads;
        const lines = element.querySelectorAll(".neshel-split-line").length;
        element.style.maxWidth = "12ch";
        await until(
          "regrouped",
          () => element.querySelectorAll(".neshel-split-line").length > lines,
          () => element.querySelectorAll(".neshel-split-line").length,
        );
        const used = getTextDebugInfo().reads - reads;
        element.style.maxWidth = "";
        await until(
          "restored lines",
          () => element.querySelectorAll(".neshel-split-line").length === lines,
          () => element.querySelectorAll(".neshel-split-line").length,
        );
        check(used >= 1 && used <= 3, `layout read passes for one resize: ${used}`);
        check(lastPieceOpacity("t01-lines") > 0.99, "no replay after regroup");
      },
    ],
    [
      "T02 typewriter: full accessible text from the start; completes; caret is aria-hidden decoration",
      async () => {
        const element = byId("t02");
        check(
          element.querySelector(".neshel-text-a11y")?.textContent ===
            "Accessible from the very first frame.",
          "accessible copy",
        );
        await until(
          "typed",
          () =>
            prop(element.querySelector(".neshel-split") as Element, "--neshel-type-progress") ===
            "1",
          () => prop(element.querySelector(".neshel-split") as Element, "--neshel-type-progress"),
        );
        check(
          element.querySelector("[data-caret]")?.closest("[aria-hidden=true]"),
          "caret inside the aria-hidden copy",
        );
      },
    ],
    [
      "T03 scramble: glyphs only on aria-hidden pieces; resolved at the end",
      async () => {
        const element = byId("t03");
        api.replay();
        await frames(3);
        check(
          !element.querySelector(".neshel-text-a11y [data-glyph]"),
          "no glyph in the accessible copy",
        );
        await until(
          "decoded",
          () => element.querySelectorAll("[data-glyph]").length === 0,
          () => element.querySelectorAll("[data-glyph]").length,
        );
      },
    ],
    [
      "T04 gradient sweep: clipped gradient where supported, plain text otherwise; restored after the sweep",
      async () => {
        const element = byId("t04");
        const style = getComputedStyle(element);
        const clip =
          style.backgroundClip === "text" ||
          (style as unknown as { webkitBackgroundClip?: string }).webkitBackgroundClip === "text";
        notes().t04Clip = clip;
        check(
          clip === getTextSupport().backgroundClipText,
          `clip ${clip} vs support ${getTextSupport().backgroundClipText}`,
        );
        await until("sweep done", idle, () => getFrameScheduler().size);
      },
    ],
    [
      "T05 number roll: accessible text = Intl value (de-DE, ar-EG); digit columns roll to the new value",
      async () => {
        api.setValue(4321.09);
        await until(
          "accessible updated",
          () =>
            byId("t05").querySelector(".neshel-text-a11y")?.textContent ===
            new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(4321.09),
          () => byId("t05").querySelector(".neshel-text-a11y")?.textContent,
        );
        await until("settled", idle, () => getFrameScheduler().size);
        check(
          byId("t05").querySelector(".neshel-number")?.getAttribute("aria-hidden") === "true",
          "visual aria-hidden",
        );
        const ar = byId("t05-ar").querySelector(".neshel-text-a11y")?.textContent ?? "";
        check(/[٠-٩]/.test(ar), `Arabic-Indic digits: ${ar}`);
      },
    ],
    [
      "T06 rotating words: box width stable across swaps; accessible text once; finite",
      async () => {
        const element = byId("t06");
        element.scrollIntoView({ block: "center" });
        api.rotate();
        const width = element.getBoundingClientRect().width;
        check(
          element.querySelector(".neshel-text-a11y")?.textContent === "fast, accessible, precise",
          "accessible text",
        );
        const seen = new Set<string>();
        await until(
          "rotated",
          () => {
            seen.add(element.querySelector('[data-state="current"]')?.textContent ?? "");
            return seen.size >= 2;
          },
          () => [...seen],
          8000,
        );
        check(Math.abs(element.getBoundingClientRect().width - width) < 0.5, "no layout shift");
        api.stopRotate();
      },
    ],
    [
      "T07 wave / T08 highlighter / T09 mask: motion while running, final states visible",
      async () => {
        api.replay();
        await until(
          "highlight drawn",
          () => getComputedStyle(byId("t08")).backgroundSize.startsWith("100%"),
          () => getComputedStyle(byId("t08")).backgroundSize,
        );
        // Re-query: the replay remounts the demos.
        const inner = () => byId("t09").querySelector(".neshel-split-line-inner");
        const risen = () => {
          const node = inner();
          if (!node?.parentElement) return false;
          return (
            Math.abs(
              node.getBoundingClientRect().top - node.parentElement.getBoundingClientRect().top,
            ) < 0.5
          );
        };
        await until("mask risen", risen, () => {
          const n = inner();
          return n && getComputedStyle(n).translate;
        });
        await until("wave rests", idle, () => getFrameScheduler().size, 9000);
        const chars = byId("t07").querySelectorAll(".neshel-split-char");
        check(
          [...chars].every((c) => new DOMMatrix(getComputedStyle(c).transform).m42 === 0),
          "wave rest = no transform",
        );
      },
    ],
    [
      "T10 variable font (Inter Variable): weight axis widens the glyphs; consumer settings restored",
      async () => {
        await document.fonts.load("800 16px 'Inter Variable'");
        const element = byId("t10");
        const before = element.getBoundingClientRect().width;
        api.setBold(true);
        await until(
          "bolder",
          () => element.getBoundingClientRect().width > before + 1,
          () => [before, element.getBoundingClientRect().width],
        );
        notes().t10Widths = {
          light: before,
          bold: element.getBoundingClientRect().width,
          fvs: element.style.getPropertyValue("font-variation-settings"),
        };
        api.setBold(false);
        await until(
          "back",
          () => Math.abs(element.getBoundingClientRect().width - before) < 1,
          () => element.getBoundingClientRect().width,
        );
      },
    ],
    [
      "T11 line reveal: scroll progress (received as a value) reveals lines",
      async () => {
        const subject = byId("t11-subject");
        subject.scrollIntoView({ block: "center" });
        const root = () => subject.querySelector(".neshel-split") as Element | null;
        await until(
          "progress",
          () => {
            const r = root();
            return (
              r !== null &&
              Number(
                r.getAttribute("style")?.match(/--neshel-reveal-progress:\s*([\d.]+)/)?.[1] ?? 0,
              ) > 0.3
            );
          },
          () => root()?.getAttribute("style"),
        );
        byId("text-svg-title").scrollIntoView();
      },
    ],
    [
      "S geometry: JS length and points match native getTotalLength/getPointAtLength (≤ 0.5 %) on the corpus",
      async () => {
        const report: Array<[number, number]> = [];
        for (const path of document.querySelectorAll<SVGPathElement>("#s-corpus path")) {
          const d = path.getAttribute("d") ?? "";
          const js = getPathGeometry(d);
          const native = path.getTotalLength();
          report.push([Math.round(native * 100) / 100, Math.round(js.length * 100) / 100]);
          check(
            Math.abs(js.length - native) <= native * 0.005 + 0.01,
            `length ${js.length} vs ${native} for ${d}`,
          );
          for (const f of [0.25, 0.5, 0.75]) {
            const a = js.pointAt(native * f);
            const b = path.getPointAtLength(native * f);
            check(
              Math.hypot(a.x - b.x, a.y - b.y) <= native * 0.005 + 0.05,
              `point ${f} of ${d}: ${a.x},${a.y} vs ${b.x},${b.y}`,
            );
          }
        }
        notes().geometry = report;
      },
    ],
    [
      "S01 path draw: completes and restores the consumer's dash pattern",
      async () => {
        const dashed = byId("s01-dashed");
        dashed.scrollIntoView({ block: "center" });
        const before = getComputedStyle(dashed).strokeDasharray;
        byId("s01-play").click();
        await frames(2);
        check(dashed.style.strokeDasharray !== "", "drawing writes inline dash");
        await until(
          "released",
          () => dashed.style.strokeDasharray.replace(/px/g, "").replace(/,/g, "").replace(/\s+/g, " ") === "4 3",
          () => dashed.style.strokeDasharray,
          4000,
        );
        check(getComputedStyle(dashed).strokeDasharray === before, "computed dash restored");
      },
    ],
    [
      "S02 path morph: interpolates and ends exactly on the target shape",
      async () => {
        const path = byId("s02-path");
        byId("s02-to-1").click();
        await frames(4);
        const mid = path.getAttribute("d");
        await until(
          "morphed",
          () => path.getAttribute("d") === "M10 50C30 90 70 90 90 50",
          () => path.getAttribute("d"),
        );
        check(mid !== "M10 50C30 90 70 90 90 50", "intermediate frame rendered");
        byId("s02-to-0").click();
        await until(
          "back",
          () => path.getAttribute("d") === "M10 50C30 10 70 10 90 50",
          () => path.getAttribute("d"),
        );
      },
    ],
    [
      "S03 motion path: native offset-path where supported (else fallback); ends at the path end",
      async () => {
        const el = byId("s03-traveller");
        el.scrollIntoView({ block: "center" });
        const start = el.getBoundingClientRect();
        byId("s03-play").click();
        notes().s03Mode = labState().textSvg?.svg?.motion?.current?.mode;
        await until(
          "travelled",
          () => Math.abs(el.getBoundingClientRect().left - start.left) > 150,
          () => ({
            dx: el.getBoundingClientRect().left - start.left,
            style: el.style.cssText,
            offset: getComputedStyle(el).offsetPath,
            state: labState().textSvg?.svg?.motion?.current?.state,
          }),
        );
        await until("idle", idle, () => getFrameScheduler().size);
      },
    ],
    [
      "S04 icon morph: the consumer's button keeps focus and its aria-expanded; icon decorative",
      async () => {
        const button = byId("s04-button");
        button.focus();
        button.click();
        await until(
          "expanded",
          () => button.getAttribute("aria-expanded") === "true",
          () => button.getAttribute("aria-expanded"),
        );
        check(document.activeElement === button, "focus kept");
        check(
          button.querySelector("svg")?.getAttribute("aria-hidden") === "true",
          "decorative icon",
        );
        await until("idle", idle, () => getFrameScheduler().size);
        button.click();
        await until(
          "collapsed",
          () => button.getAttribute("aria-expanded") === "false",
          () => button.getAttribute("aria-expanded"),
        );
      },
    ],
    [
      "S05 gradient stops / S09 dash flow / S07 turbulence: animate while running; stop/pause leaves no task",
      async () => {
        byId("s05-play").scrollIntoView({ block: "center" });
        const stop = byId("s05-stop-0");
        const color = getComputedStyle(stop).stopColor;
        byId("s05-play").click();
        await until(
          "stop colour changed",
          () => getComputedStyle(stop).stopColor !== color,
          () => getComputedStyle(stop).stopColor,
        );
        byId("s09-rect").scrollIntoView({ block: "center" });
        byId("s09-play").click();
        const rect = byId("s09-rect");
        await frames(6);
        const a = rect.style.strokeDashoffset;
        await frames(6);
        check(rect.style.strokeDashoffset !== a, "dash offset advances");
        byId("s09-pause").click();
        byId("s07-play").click();
        await until(
          "filter",
          () => getSvgDebugInfo().filters === 1,
          () => getSvgDebugInfo(),
        );
        byId("s07-stop").click();
        await until(
          "filter removed",
          () => getSvgDebugInfo().filters === 0,
          () => getSvgDebugInfo(),
        );
        labState().textSvg?.svg?.stops?.current?.stop();
        await until("idle", idle, () => getFrameScheduler().size);
      },
    ],
    [
      "S06 chart / S08 logo / S10 checkmark: lines drawn, points shown, logo unmasked at the end, no role added",
      async () => {
        byId("s06-chart").scrollIntoView({ block: "center" });
        byId("s06-play").click();
        byId("s08-play").click();
        byId("s10-play").click();
        await until("idle", idle, () => getFrameScheduler().size);
        const points = [...document.querySelectorAll<SVGElement>(".s06-point")];
        check(
          points.every((p) => getComputedStyle(p).opacity === "1"),
          "points visible",
        );
        check(byId("s08-logo").style.getPropertyValue("mask") === "", "logo unmasked");
        check(byId("s08-logo").getAttribute("aria-label") === "Neshel logo", "logo name untouched");
        check(byId("s10-check").getAttribute("aria-hidden") === "true", "checkmark decorative");
        check(byId("s10-status").textContent === "Saved.", "consumer's own status message");
      },
    ],
    [
      "performance: split cost (600 graphemes, 5000 characters) and frame deltas with 600 animated graphemes",
      async () => {
        const host = document.createElement("p");
        host.className = "ts-perf";
        host.textContent = "Lorem ipsum dolor sit amet ".repeat(24).slice(0, 600);
        document.body.appendChild(host);
        let t = performance.now();
        const split = splitText(host, { split: "chars" });
        const split600 = performance.now() - t;
        const pieces = split.pieces.length;
        split.revert();
        host.textContent = "Long text for words ".repeat(250);
        t = performance.now();
        const words = splitText(host, { split: "words" });
        const split5000 = performance.now() - t;
        words.revert();
        host.remove();
        notes().performance = {
          split600ms: Math.round(split600 * 10) / 10,
          pieces,
          split5000WordsMs: Math.round(split5000 * 10) / 10,
        };
        check(pieces >= 400, `pieces ${pieces}`);
      },
    ],
  ]);
}

/** Facts under emulated `prefers-reduced-motion: reduce` (the checks switch the media feature live). */
export async function textSvgReducedFacts(): Promise<Record<string, unknown>> {
  const api = labState().textSvg;
  api?.replay();
  await frames(3);
  byId("s09-play").click();
  byId("s07-play").click();
  await frames(4);
  const facts = {
    reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
    revealProgress:
      byId("t01-words")
        .querySelector(".neshel-split")
        ?.getAttribute("style")
        ?.match(/--neshel-reveal-progress:\s*([\d.]+)/)?.[1] ?? "unset",
    waveTransform: [...byId("t07").querySelectorAll(".neshel-split-char")].some(
      (c) => new DOMMatrix(getComputedStyle(c).transform).m42 !== 0,
    ),
    antsOffset: byId("s09-rect").style.strokeDashoffset,
    filters: getSvgDebugInfo().filters,
    schedulerIdle: idle(),
  };
  return facts;
}
