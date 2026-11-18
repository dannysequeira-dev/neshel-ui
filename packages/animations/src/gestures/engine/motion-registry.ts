/**
 * Per-element velocity channel inside the gestures family (Phase 012, internal): drag-like effects publish
 * the element's current velocity; decorative effects on the same element (G11 squash & stretch) subscribe.
 * Synchronous and allocation-free per publish; nothing is kept for elements without subscribers.
 */
type VelocityListener = (vx: number, vy: number) => void;

const listeners = new WeakMap<Element, Set<VelocityListener>>();

export function publishVelocity(element: Element, vx: number, vy: number): void {
  const set = listeners.get(element);
  if (!set) return;
  for (const listener of set) listener(vx, vy);
}

export function subscribeVelocity(element: Element, listener: VelocityListener): () => void {
  let set = listeners.get(element);
  if (!set) {
    set = new Set();
    listeners.set(element, set);
  }
  const current = set;
  current.add(listener);
  return () => {
    current.delete(listener);
    if (current.size === 0 && listeners.get(element) === current) listeners.delete(element);
  };
}
