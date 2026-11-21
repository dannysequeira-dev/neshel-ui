/**
 * T05 — Number roll (catalogue §10, structure S; contracts/text-api.md §3, research R6). The accessible copy
 * is `Intl.NumberFormat(locale, format).format(value)`, updated once per `set()` (no live region). The visual
 * copy renders `formatToParts`: each digit part is a column of the ten digits of the active numbering system
 * (discovered by formatting 0–9), translated by `text.css` from one progress value and per-column `--from`/
 * `--to`; every other part (sign, separators, currency, percent, compact, literals) is static. Increasing
 * values roll up, decreasing roll down. Algorithmic numbering systems (digits that are not ten distinct single
 * graphemes) swap the whole value. Reduced motion (`instant`): the new value at once.
 */
import { createChannelWriter } from "../core/channel.js";
import type { MotionResult } from "../core/controls.js";
import type { Easing, EasingPreset } from "../core/easing.js";
import { createProgressDriver } from "../core/progress-driver.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import { addToken, FX_ATTRIBUTE } from "../core/tokens.js";
import { validator } from "../core/validate.js";
import { counters } from "./engine/debug.js";
import { segmentGraphemes } from "./engine/segment.js";

export interface NumberRollOptions {
  value: number | bigint;
  locale?: string;
  format?: Intl.NumberFormatOptions;
  /** ms (default 800). */
  duration?: number;
  easing?: Easing | EasingPreset;
  reducedMotion?: ReducedMotion;
}

export interface NumberRollControl {
  readonly value: number | bigint;
  /** The accessible (formatted) text. */
  readonly text: string;
  readonly finished: Promise<MotionResult>;
  /** Roll to a new value (`animate: false` jumps). */
  set(value: number | bigint, options?: { animate?: boolean }): Promise<MotionResult>;
  destroy(): void;
}

const A11Y_STYLE =
  "position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;user-select:none;-webkit-user-select:none";
const BIDI_MARKS = /[؜‎‏‪-‮⁦-⁩]/g;
const v = /* @__PURE__ */ validator("createNumberRoll");

/** The ten digits of the formatter's numbering system, or `undefined` for algorithmic systems. */
export function numberingDigits(
  locale: string | undefined,
  format: Intl.NumberFormatOptions,
): string[] | undefined {
  const resolved = new Intl.NumberFormat(locale, format).resolvedOptions();
  const digitFormat = new Intl.NumberFormat(resolved.locale, {
    numberingSystem: resolved.numberingSystem,
    useGrouping: false,
  });
  const digits = Array.from({ length: 10 }, (_, d) => digitFormat.format(d));
  const single = digits.every((d) => segmentGraphemes(d).length === 1);
  return single && new Set(digits).size === 10 ? digits : undefined;
}

interface Part {
  type: string;
  value: string;
}

function checkValue(value: unknown): number | bigint {
  if (typeof value === "bigint") return value;
  if (typeof value !== "number" || !Number.isFinite(value))
    v.fail('"value" must be a finite number or a bigint.');
  return value as number;
}

export function createNumberRoll(
  element: HTMLElement,
  options: NumberRollOptions,
): NumberRollControl {
  if (!element || element.nodeType !== 1 || !element.ownerDocument)
    v.fail('"element" must be an HTML element.');
  const o = v.options(options);
  let value = checkValue(o.value);
  const format = (o.format ?? {}) as Intl.NumberFormatOptions;
  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat(o.locale, format);
  } catch (error) {
    return v.fail(`invalid locale or format: ${(error as Error).message}.`);
  }
  const digits = numberingDigits(o.locale, format);
  const duration = v.duration("duration", o.duration, 800);
  const easing = v.easing(o.easing, "standard");
  const policy = v.reducedMotion(o.reducedMotion);
  const doc = element.ownerDocument;
  const originals = [...element.childNodes];
  const a11y = doc.createElement("span");
  a11y.className = "neshel-text-a11y";
  a11y.setAttribute("style", A11Y_STYLE);
  const root = doc.createElement("span");
  root.className = "neshel-number";
  root.setAttribute("aria-hidden", "true");
  root.setAttribute("dir", "ltr");
  for (const node of originals) node.parentNode?.removeChild(node);
  element.append(a11y, root);
  const removeToken = addToken(root, FX_ATTRIBUTE, "number-roll");
  const writer = createChannelWriter(root, ["--neshel-number-progress"], {
    id: "text/number-roll",
  });
  counters.effects++;
  let destroyed = false;

  const digitIndex = (char: string) => (digits ? digits.indexOf(char) : -1);
  const partsOf = (n: number | bigint): Part[] =>
    formatter.formatToParts(n as number).map((part) => ({ type: part.type, value: part.value }));

  /** Digits of a parts list from the right of the integer part / left of the fraction. */
  function render(target: Part[], from: Part[] | undefined, up: boolean): void {
    root.textContent = "";
    const fromDigits = (from ?? [])
      .filter((p) => p.type === "integer")
      .flatMap((p) => segmentGraphemes(p.value).map(digitIndex));
    const fromFraction = (from ?? [])
      .filter((p) => p.type === "fraction")
      .flatMap((p) => segmentGraphemes(p.value).map(digitIndex));
    const intCount = target
      .filter((p) => p.type === "integer")
      .reduce((sum, p) => sum + segmentGraphemes(p.value).length, 0);
    let intSeen = 0;
    let fracSeen = 0;
    for (const part of target) {
      const rolls = digits && (part.type === "integer" || part.type === "fraction");
      if (!rolls) {
        const text = part.value.replace(BIDI_MARKS, "");
        if (!text) continue;
        const span = doc.createElement("span");
        span.className = "neshel-number-part";
        span.textContent = text;
        root.appendChild(span);
        continue;
      }
      for (const char of segmentGraphemes(part.value)) {
        const to = digitIndex(char);
        let fromDigit: number;
        if (part.type === "integer") {
          const fromPos = fromDigits.length - (intCount - intSeen);
          fromDigit = fromPos >= 0 ? (fromDigits[fromPos] ?? 0) : 0;
          intSeen++;
        } else {
          fromDigit = fromFraction[fracSeen] ?? 0;
          fracSeen++;
        }
        if (fromDigit < 0) fromDigit = 0;
        // Strip of 20 digits: up rolls forward through 9 → 0, down rolls backward.
        let a = fromDigit;
        let b = to;
        if (up && b < a) b += 10;
        if (!up && b > a) a += 10;
        const column = doc.createElement("span");
        column.className = "neshel-number-column";
        column.style.setProperty("--from", String(a));
        column.style.setProperty("--to", String(b));
        const holder = doc.createElement("span");
        holder.className = "neshel-number-holder";
        holder.textContent = char;
        const strip = doc.createElement("span");
        strip.className = "neshel-number-strip";
        // Without text.css only the target digit (holder) shows; the stylesheet reveals the strip.
        strip.style.display = "none";
        for (let i = 0; i < 20; i++) {
          const digit = doc.createElement("span");
          digit.textContent = (digits as string[])[i % 10] as string;
          strip.appendChild(digit);
        }
        column.append(holder, strip);
        root.appendChild(column);
      }
    }
  }

  const driver = createProgressDriver({
    duration,
    easing,
    reducedMotion: policy,
    render(progress) {
      if (!destroyed)
        writer.set("--neshel-number-progress", String(Math.round(progress * 10000) / 10000));
    },
  });
  a11y.textContent = formatter.format(value as number);
  render(partsOf(value), undefined, true);
  driver.jump(1);

  const control: NumberRollControl = {
    get value() {
      return value;
    },
    get text() {
      return a11y.textContent ?? "";
    },
    get finished() {
      return driver.finished;
    },
    set(next, setOptions = {}) {
      if (destroyed)
        return Promise.resolve({ status: "cancelled", direction: "forward", value: 1 });
      const checked = checkValue(next);
      const before = partsOf(value);
      const up = checked >= value;
      value = checked;
      a11y.textContent = formatter.format(value as number);
      render(partsOf(value), before, up);
      if (setOptions.animate === false) {
        driver.jump(1);
        return Promise.resolve({ status: "completed", direction: "forward", value: 1 });
      }
      driver.jump(0);
      driver.play();
      return driver.finished;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      driver.destroy();
      writer.release();
      removeToken();
      if (root.parentNode === element) {
        a11y.remove();
        root.remove();
        for (const node of originals) element.appendChild(node);
      }
      counters.effects--;
    },
  };
  return control;
}
