/**
 * Effect tokens (Phase 010 CSS-token driver; contracts/drivers-and-css.md §2). Package stylesheets
 * select `[data-neshel-fx~="<token>"]`; an attachment adds its token only while it is granted (its
 * `setup` ran) and removes it in `destroy`, so CSS rules never run for an effect that lost
 * arbitration. Tokens are reference-counted per element and attribute: several effects may share one
 * token (e.g. `decor`) and the last release removes it. Attributes are not styles, so they are not part
 * of the style ledger; removing the last token removes the attribute.
 */

export const FX_ATTRIBUTE = "data-neshel-fx";
/** Tokens of effects whose resolved reduced-motion state is "reduce" (live). */
export const FX_REDUCED_ATTRIBUTE = "data-neshel-fx-reduced";
/** Tokens of effects whose interaction state is active (hover/focus/press), for CSS-only parts. */
export const FX_ACTIVE_ATTRIBUTE = "data-neshel-fx-active";

const counts = new WeakMap<Element, Map<string, number>>();

function write(element: Element, attribute: string, token: string, present: boolean): void {
  const current = (element.getAttribute(attribute) ?? "").split(/\s+/).filter(Boolean);
  const has = current.includes(token);
  if (present === has) return;
  const next = present ? [...current, token] : current.filter((item) => item !== token);
  if (next.length > 0) element.setAttribute(attribute, next.join(" "));
  else element.removeAttribute(attribute);
}

/** Add `token` to `attribute`; returns an idempotent remover. */
export function addToken(element: Element, attribute: string, token: string): () => void {
  let map = counts.get(element);
  if (!map) {
    map = new Map();
    counts.set(element, map);
  }
  const key = `${attribute} ${token}`;
  const count = (map.get(key) ?? 0) + 1;
  map.set(key, count);
  if (count === 1) write(element, attribute, token, true);
  let removed = false;
  return () => {
    if (removed) return;
    removed = true;
    const entries = counts.get(element);
    const left = (entries?.get(key) ?? 1) - 1;
    if (left > 0) entries?.set(key, left);
    else {
      entries?.delete(key);
      write(element, attribute, token, false);
    }
  };
}

/** A token that is present only while `on(true)` was the last call. */
export function toggleToken(element: Element, attribute: string, token: string) {
  let remove: (() => void) | undefined;
  return (on: boolean) => {
    if (on && !remove) remove = addToken(element, attribute, token);
    else if (!on && remove) {
      remove();
      remove = undefined;
    }
  };
}
