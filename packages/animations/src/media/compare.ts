/**
 * M04 before/after comparison slider (catalogue §12; contracts/media-api.md, research R3). The slider IS a
 * native `<input type="range">` (keyboard, value, limits, orientation and value text for assistive technology
 * come from the platform); pointer input on the frame positions the divider on press and follows a captured
 * drag (one rect read per press). `touch-action` keeps native page scroll on the other axis. The after layer is
 * clipped from ONE custom property written on the package root through its Motion Host (`media.css`).
 */
import { createChannelWriter } from "../core/channel.js";
import { validator } from "../core/validate.js";
import { counters } from "./engine/debug.js";

export interface CompareSliderOptions {
  /** 0–100 (default 50): share of the before image. */
  value?: number;
  orientation?: "horizontal" | "vertical";
  /** Keyboard step (0.1–25, default 1). */
  step?: number;
  /** Value text for assistive technology (default "N% before, M% after"). */
  valueText?(value: number): string;
  onValueChange?(value: number): void;
}

export interface CompareControl {
  readonly value: number;
  /** Set the value (0–100) without animation. */
  set(value: number): void;
  destroy(): void;
}

const defaultText = (value: number) =>
  `${Math.round(value)}% before, ${Math.round(100 - value)}% after`;

export function createCompareSlider(
  root: HTMLElement,
  options: CompareSliderOptions = {},
): CompareControl {
  const v = validator("createCompareSlider");
  if (!root || root.nodeType !== 1) v.fail('"root" must be an element.');
  const input = root.querySelector<HTMLInputElement>('input[type="range"]');
  if (!input) v.fail('the root needs an <input type="range"> (the accessible slider).');
  const range = input as HTMLInputElement;
  if (
    !range.labels?.length &&
    !range.getAttribute("aria-label") &&
    !range.getAttribute("aria-labelledby")
  ) {
    v.fail("the range input needs an accessible name (label, aria-label or aria-labelledby).");
  }
  const orientation = v.oneOf(
    "orientation",
    options.orientation,
    ["horizontal", "vertical"],
    "horizontal",
  );
  const step = v.number("step", options.step, 1, 0.1, 25);
  const valueText =
    v.callback<(value: number) => string>("valueText", options.valueText) ?? defaultText;
  const onChange = v.callback<(value: number) => void>("onValueChange", options.onValueChange);
  let value = v.number("value", options.value, 50, 0, 100);
  const writer = createChannelWriter(root, ["--neshel-compare", "touch-action"], {
    id: "media/compare",
  });
  const original = {
    min: range.getAttribute("min"),
    max: range.getAttribute("max"),
    step: range.getAttribute("step"),
    orientation: range.getAttribute("aria-orientation"),
    text: range.getAttribute("aria-valuetext"),
  };
  range.min = "0";
  range.max = "100";
  range.step = String(step);
  if (orientation === "vertical") range.setAttribute("aria-orientation", "vertical");
  root.setAttribute("data-neshel-compare", orientation);
  counters.effects++;

  function render(next: number, notify: boolean): void {
    const clamped = Math.min(100, Math.max(0, Number.isFinite(next) ? next : value));
    const changed = clamped !== value;
    value = clamped;
    const rounded = Math.round(clamped * 100) / 100;
    writer.set("--neshel-compare", `${rounded}%`);
    if (range.value !== String(rounded)) range.value = String(rounded);
    range.setAttribute("aria-valuetext", valueText(rounded));
    if (notify && changed) onChange?.(rounded);
  }
  writer.set("touch-action", orientation === "horizontal" ? "pan-y" : "pan-x");
  render(value, false);

  const onInput = () => render(Number(range.value), true);
  range.addEventListener("input", onInput);

  let rect: DOMRect | undefined;
  let pointer: number | undefined;
  const fromEvent = (event: PointerEvent) => {
    const box = rect ?? root.getBoundingClientRect();
    rect = box;
    const share =
      orientation === "horizontal"
        ? (event.clientX - box.left) / Math.max(1, box.width)
        : (event.clientY - box.top) / Math.max(1, box.height);
    return share * 100;
  };
  const onDown = (event: PointerEvent) => {
    if (event.button !== 0 || pointer !== undefined) return;
    if ((event.target as Element | null)?.closest?.("button, a, [data-neshel-compare-ignore]"))
      return;
    pointer = event.pointerId;
    rect = undefined; // one read per press
    root.setPointerCapture?.(event.pointerId);
    range.focus({ preventScroll: true });
    render(fromEvent(event), true);
  };
  const onMove = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    render(fromEvent(event), true);
  };
  const onUp = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    pointer = undefined;
    rect = undefined;
    if (root.hasPointerCapture?.(event.pointerId)) root.releasePointerCapture(event.pointerId);
  };
  root.addEventListener("pointerdown", onDown);
  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerup", onUp);
  root.addEventListener("pointercancel", onUp);

  let destroyed = false;
  const restore = (name: string, before: string | null) => {
    if (before === null) range.removeAttribute(name);
    else range.setAttribute(name, before);
  };
  return {
    get value() {
      return value;
    },
    set(next) {
      if (!destroyed) render(next, false);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      range.removeEventListener("input", onInput);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onUp);
      writer.release();
      root.removeAttribute("data-neshel-compare");
      restore("min", original.min);
      restore("max", original.max);
      restore("step", original.step);
      restore("aria-orientation", original.orientation);
      restore("aria-valuetext", original.text);
      counters.effects--;
    },
  };
}
