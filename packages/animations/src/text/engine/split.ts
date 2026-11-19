/**
 * Accessible text splitter (Phase 014; contracts/text-splitter.md, research R2–R4, ADR 0029 §2).
 *
 * The element keeps ONE accessible copy: its original child nodes are moved (never cloned) into a visually
 * hidden span; the animated pieces live in an `aria-hidden` visual copy built from Unicode clusters/words.
 * Direction runs are isolated with `dir`, words of shaping scripts are never cut into clusters, and only
 * plain phrasing content is split — links, controls, embedded and editable content are left untouched
 * (`state: "unsupported"`). Lines are grouped from one layout read and re-grouped only when the inline size,
 * the fonts or the content change (scheduler read phase), never per animation frame. `revert()` moves the
 * same nodes back.
 */
import { describeElement, devWarnOnce, elementKey } from "../../core/dev.js";
import { getFrameScheduler } from "../../core/scheduler.js";
import { counters } from "./debug.js";
import { needsShaping, segmentGraphemes, segmentWords, strongDirection } from "./segment.js";

export type SplitGranularity = "chars" | "words" | "lines";

export interface SplitTextOptions {
  /** Default `"words"`. `chars` and `lines` always contain word pieces. */
  split?: SplitGranularity;
  /** Default: the closest `[lang]` of the element, else the document language. */
  locale?: string;
  /** Maximum animated pieces (default 1000, 1–5000): chars degrade to words, words to lines above it. */
  maxPieces?: number;
}

export interface SplitText {
  readonly state: "split" | "unsupported" | "reverted";
  readonly reason: string | undefined;
  readonly split: SplitGranularity;
  readonly root: HTMLElement | null;
  /** Animated unit in reading order (chars, words or lines). */
  readonly pieces: readonly HTMLElement[];
  readonly words: readonly HTMLElement[];
  readonly lines: readonly HTMLElement[];
  /** The accessible text. */
  readonly text: string;
  onChange(listener: () => void): () => void;
  refresh(): void;
  revert(): void;
}

declare const process: { env: { NODE_ENV?: string } } | undefined;

const PHRASING = new Set([
  "abbr",
  "b",
  "bdi",
  "bdo",
  "cite",
  "code",
  "data",
  "dfn",
  "em",
  "i",
  "kbd",
  "mark",
  "q",
  "s",
  "samp",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "time",
  "u",
  "var",
]);
/** Attributes reproduced on visual shells (never ids, ARIA, roles, handlers or focusability). */
const SHELL_ATTRIBUTES = ["class", "lang", "dir", "style", "hidden", "translate"];

const A11Y_STYLE =
  "position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;user-select:none;-webkit-user-select:none";

interface Leaf {
  node: Node;
  /** Shell templates from the visual root to the leaf. */
  chain: readonly Element[];
  word?: HTMLElement;
  br?: boolean;
}

interface Record {
  element: HTMLElement;
  requested: SplitGranularity;
  split: SplitGranularity;
  text: string;
  a11y: HTMLElement;
  root: HTMLElement;
  leaves: Leaf[];
  pieces: HTMLElement[];
  words: HTMLElement[];
  lines: HTMLElement[];
  listeners: Set<() => void>;
  refs: number;
  release(): void;
  refresh(): void;
}

const records = new WeakMap<Element, Record>();

function warn(element: Element, message: string): void {
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    devWarnOnce(
      `split:${elementKey(element)}:${message}`,
      `splitText: ${describeElement(element)} ${message}`,
    );
  }
}

/** Why the element's content cannot be split safely, or `undefined`. */
function unsupportedReason(element: HTMLElement): string | undefined {
  const editable = element.closest("[contenteditable]");
  if (editable && editable.getAttribute("contenteditable") !== "false") return "editable content";
  const walk = (parent: Node): string | undefined => {
    for (const child of parent.childNodes) {
      if (child.nodeType === 3 || child.nodeType === 8) continue;
      if (child.nodeType !== 1) return "unsupported node";
      const el = child as Element;
      const tag = el.localName;
      if (tag === "br") continue;
      if (!PHRASING.has(tag))
        return `contains <${tag}> (links, controls and embedded content are never split)`;
      if (el.hasAttribute("tabindex") || el.hasAttribute("contenteditable"))
        return "contains focusable or editable markup";
      const role = el.getAttribute("role");
      if (role && role !== "none" && role !== "presentation") return `contains role="${role}"`;
      const nested = walk(el);
      if (nested) return nested;
    }
    return undefined;
  };
  return walk(element);
}

function resolveLocale(element: HTMLElement, explicit: string | undefined): string | undefined {
  if (explicit) return explicit;
  const lang = element.closest("[lang]")?.getAttribute("lang");
  return lang || element.ownerDocument.documentElement.getAttribute("lang") || undefined;
}

function resolveBase(element: HTMLElement, text: string): "ltr" | "rtl" {
  const dir = element.closest("[dir]")?.getAttribute("dir")?.toLowerCase();
  if (dir === "rtl" || dir === "ltr") return dir;
  return strongDirection(text) ?? "ltr";
}

function piece(doc: Document, className: string, display: string): HTMLElement {
  const span = doc.createElement("span");
  span.className = className;
  span.style.display = display;
  return span;
}

/** Build the leaves (word pieces, spaces, breaks) of the visual copy. */
function buildLeaves(
  element: HTMLElement,
  split: SplitGranularity,
  locale: string | undefined,
  base: "ltr" | "rtl",
): { leaves: Leaf[]; words: HTMLElement[]; chars: HTMLElement[] } {
  const doc = element.ownerDocument;
  const leaves: Leaf[] = [];
  const words: HTMLElement[] = [];
  const chars: HTMLElement[] = [];
  const visit = (parent: Node, chain: readonly Element[]) => {
    for (const child of parent.childNodes) {
      if (child.nodeType === 3) {
        const segments = segmentWords(child.nodeValue ?? "", locale);
        // Direction runs (research R3): words whose strong direction differs from the base are isolated.
        let runShell: Element | undefined;
        let runDir: "ltr" | "rtl" | undefined;
        for (const segment of segments) {
          if (segment.space) {
            leaves.push({
              node: doc.createTextNode(segment.text),
              chain: runShell ? [...chain, runShell] : chain,
            });
            continue;
          }
          const direction = strongDirection(segment.text) ?? runDir ?? base;
          if (direction !== base) {
            if (runDir !== direction) {
              runShell = doc.createElement("span");
              runShell.setAttribute("dir", direction);
              runShell.className = "neshel-split-run";
              runDir = direction;
            }
          } else {
            runShell = undefined;
            runDir = undefined;
          }
          const word = piece(doc, "neshel-split-word", "inline-block");
          if (split === "chars") {
            if (needsShaping(segment.text)) {
              word.setAttribute("data-neshel-split-whole", "");
              word.textContent = segment.text;
              chars.push(word);
            } else {
              // Clusters inside an atomic word follow the word's own direction (digits stay LTR).
              word.setAttribute("dir", strongDirection(segment.text) ?? "ltr");
              for (const cluster of segmentGraphemes(segment.text, locale)) {
                const char = piece(doc, "neshel-split-char", "inline-block");
                char.textContent = cluster;
                word.appendChild(char);
                chars.push(char);
              }
            }
          } else word.textContent = segment.text;
          words.push(word);
          leaves.push({ node: word, chain: runShell ? [...chain, runShell] : chain, word });
        }
      } else if (child.nodeType === 1) {
        const el = child as Element;
        if (el.localName === "br") {
          leaves.push({ node: doc.createElement("br"), chain, br: true });
          continue;
        }
        const shell = doc.createElement(el.localName);
        for (const name of SHELL_ATTRIBUTES) {
          const value = el.getAttribute(name);
          if (value !== null) shell.setAttribute(name, value);
        }
        visit(el, [...chain, shell]);
      }
    }
  };
  visit(element, []);
  return { leaves, words, chars };
}

/** Append leaves under `container`, re-creating shells (cloned per container) from their chains. */
function mount(container: Element, leaves: readonly Leaf[]): void {
  const open: Array<{ template: Element; node: Element }> = [];
  for (const leaf of leaves) {
    let depth = 0;
    while (
      depth < open.length &&
      depth < leaf.chain.length &&
      open[depth]?.template === leaf.chain[depth]
    )
      depth++;
    open.length = depth;
    for (let index = depth; index < leaf.chain.length; index++) {
      const template = leaf.chain[index] as Element;
      const node = template.cloneNode(false) as Element;
      (open[index - 1]?.node ?? container).appendChild(node);
      open.push({ template, node });
    }
    (open[open.length - 1]?.node ?? container).appendChild(leaf.node);
  }
}

function groupLines(record: Record): void {
  const { root, leaves } = record;
  const doc = root.ownerDocument;
  // 1. Unwrap: leaves back into one flow (write).
  while (root.firstChild) root.removeChild(root.firstChild);
  mount(root, leaves);
  // 2. One layout read pass: line of every word by its offsetTop.
  counters.reads++;
  const lineOf = new Map<Leaf, number>();
  let line = -1;
  let top = Number.NEGATIVE_INFINITY;
  let forced = false;
  for (const leaf of leaves) {
    if (leaf.br) {
      forced = true;
      continue;
    }
    if (!leaf.word) continue;
    const offset = leaf.word.offsetTop;
    if (line < 0 || forced || offset > top + 1) {
      line++;
      top = offset;
      forced = false;
    }
    lineOf.set(leaf, line);
  }
  // 3. Regroup into block line spans (write). Spaces/breaks follow the previous word's line.
  while (root.firstChild) root.removeChild(root.firstChild);
  const groups: Leaf[][] = [];
  let current = 0;
  for (const leaf of leaves) {
    if (leaf.br) continue;
    const index = lineOf.get(leaf) ?? current;
    current = index;
    const group = groups[index] ?? [];
    groups[index] = group;
    group.push(leaf);
  }
  record.lines = [];
  groups.forEach((group, index) => {
    // Trim spaces at the line edges (the block box breaks the line anyway).
    while (group.length && !group[0]?.word) group.shift();
    while (group.length && !group[group.length - 1]?.word) group.pop();
    const lineSpan = piece(doc, "neshel-split-line", "block");
    lineSpan.style.setProperty("--neshel-i", String(index));
    mount(lineSpan, group);
    root.appendChild(lineSpan);
    record.lines.push(lineSpan);
  });
  if (record.split === "lines") record.pieces = record.lines;
  root.style.setProperty("--neshel-n", String(record.pieces.length));
}

function index(pieces: readonly HTMLElement[]): void {
  pieces.forEach((item, i) => {
    item.style.setProperty("--neshel-i", String(i));
  });
}

function createRecord(element: HTMLElement, options: SplitTextOptions, text: string): Record {
  const doc = element.ownerDocument;
  const locale = resolveLocale(element, options.locale);
  const base = resolveBase(element, text);
  const max = Math.min(5000, Math.max(1, Math.floor(options.maxPieces ?? 1000)));
  let split: SplitGranularity = options.split ?? "words";
  let built = buildLeaves(element, split, locale, base);
  if (split === "chars" && built.chars.length > max) {
    split = "words";
    built = buildLeaves(element, split, locale, base);
  }
  if (split === "words" && built.words.length > max) split = "lines";

  const a11y = doc.createElement("span");
  a11y.className = "neshel-text-a11y";
  a11y.setAttribute("style", A11Y_STYLE);
  const root = doc.createElement("span");
  root.className = "neshel-split";
  root.setAttribute("aria-hidden", "true");
  root.setAttribute("data-split", split);

  const record: Record = {
    element,
    requested: options.split ?? "words",
    split,
    text,
    a11y,
    root,
    leaves: built.leaves,
    pieces: split === "chars" ? built.chars : built.words,
    words: built.words,
    lines: [],
    listeners: new Set(),
    refs: 0,
    release: () => {},
    refresh: () => {},
  };
  // Move the originals (same node objects) into the accessible copy.
  while (element.firstChild) a11y.appendChild(element.firstChild);
  if (split !== "lines") {
    mount(root, built.leaves);
    index(record.pieces);
    root.style.setProperty("--neshel-n", String(record.pieces.length));
  }
  element.append(a11y, root);
  element.setAttribute("data-neshel-split", split);
  counters.splits++;

  if (split === "lines") {
    if (doc.defaultView?.getComputedStyle(element).textAlign === "justify")
      root.setAttribute("data-neshel-justify", "");
    groupLines(record);
    const scheduler = getFrameScheduler();
    let cancel: (() => void) | undefined;
    const resplit = () => {
      if (cancel) return;
      cancel = scheduler.schedule(() => {
        cancel = undefined;
        if (records.get(element) !== record) return;
        counters.resplits++;
        groupLines(record);
        for (const listener of [...record.listeners]) listener();
      }, "read");
    };
    let width: number | undefined;
    const observer =
      typeof ResizeObserver === "function"
        ? new ResizeObserver((entries) => {
            const next = entries[entries.length - 1]?.contentRect.width;
            if (next === undefined) return;
            if (width !== undefined && Math.abs(next - width) > 0.5) resplit();
            width = next;
          })
        : undefined;
    observer?.observe(element);
    const fonts = (doc as Document & { fonts?: EventTarget }).fonts;
    fonts?.addEventListener?.("loadingdone", resplit);
    counters.observers++;
    record.refresh = resplit;
    record.release = () => {
      cancel?.();
      cancel = undefined;
      observer?.disconnect();
      fonts?.removeEventListener?.("loadingdone", resplit);
      counters.observers--;
    };
  }
  return record;
}

function revertRecord(record: Record): void {
  const { element, a11y, root } = record;
  record.release();
  record.listeners.clear();
  if (records.get(element) === record) records.delete(element);
  counters.splits--;
  // Defensive: the consumer (or React's text update) may have replaced the content meanwhile.
  if (a11y.parentNode === element) {
    while (a11y.firstChild) element.insertBefore(a11y.firstChild, a11y);
    a11y.remove();
  }
  if (root.parentNode === element) root.remove();
  element.removeAttribute("data-neshel-split");
}

const UNSUPPORTED = (reason: string, split: SplitGranularity, text: string): SplitText => ({
  state: "unsupported",
  reason,
  split,
  root: null,
  pieces: [],
  words: [],
  lines: [],
  text,
  onChange: () => () => {},
  refresh: () => {},
  revert: () => {},
});

/** Split an element's text into accessible, animatable pieces (contracts/text-splitter.md §2). */
export function splitText(element: HTMLElement, options: SplitTextOptions = {}): SplitText {
  if (!element || element.nodeType !== 1 || !element.ownerDocument) {
    throw new TypeError("splitText: element must be an HTML element");
  }
  const requested = options.split ?? "words";
  if (!["chars", "words", "lines"].includes(requested)) {
    throw new TypeError(`splitText: invalid split ${JSON.stringify(requested)}`);
  }
  let record = records.get(element);
  if (record && !(record.a11y.parentNode === element && record.root.parentNode === element)) {
    // Content replaced since the split (React text update): drop the stale record.
    revertRecord(record);
    record = undefined;
  }
  if (record) {
    if (record.requested !== requested) {
      return UNSUPPORTED(`already split as ${record.split}`, requested, record.text);
    }
  } else {
    const text = element.textContent ?? "";
    const reason = unsupportedReason(element) ?? (text.trim() === "" ? "empty" : undefined);
    if (reason) {
      if (reason !== "empty") warn(element, `is not split: ${reason}.`);
      return UNSUPPORTED(reason, requested, text);
    }
    record = createRecord(element, options, text);
    records.set(element, record);
  }
  const shared = record;
  shared.refs++;
  let reverted = false;
  return {
    get state() {
      return reverted ? "reverted" : "split";
    },
    reason: undefined,
    get split() {
      return shared.split;
    },
    get root() {
      return reverted ? null : shared.root;
    },
    get pieces() {
      return reverted ? [] : shared.pieces;
    },
    get words() {
      return reverted ? [] : shared.words;
    },
    get lines() {
      return reverted ? [] : shared.lines;
    },
    text: shared.text,
    onChange(listener) {
      if (reverted) return () => {};
      shared.listeners.add(listener);
      return () => shared.listeners.delete(listener);
    },
    refresh() {
      if (!reverted) shared.refresh();
    },
    revert() {
      if (reverted) return;
      reverted = true;
      shared.refs--;
      if (shared.refs <= 0) revertRecord(shared);
    },
  };
}
