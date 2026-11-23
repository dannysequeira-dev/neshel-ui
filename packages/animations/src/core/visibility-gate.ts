/**
 * Visibility gate (Phase 016, internal; research R3, R13). ONE IntersectionObserver and ONE `visibilitychange`
 * listener shared by every subscriber (D09 floors, GPU surfaces): a subscriber is told whether its element may move
 * (intersecting the viewport and the page shown). Created on the first subscription and disposed with the last; no
 * observer exists while nothing subscribes. Never touches the DOM at import.
 */

type Listener = (visible: boolean) => void;

interface Record {
  intersecting: boolean;
  listeners: Set<Listener>;
}

const records = new Map<Element, Record>();
let observer: IntersectionObserver | undefined;
let listening = false;

/** Live gate state (diagnostics). */
export const gateCounters = { observers: 0, elements: 0, listeners: 0 };

const pageShown = () => typeof document === "undefined" || !document.hidden;

function notify(record: Record): void {
  const visible = record.intersecting && pageShown();
  for (const listener of [...record.listeners]) listener(visible);
}

const onVisibility = () => {
  for (const record of records.values()) notify(record);
};

/** Whether `element` is currently known to be visible (true before the first observation). */
export function isGateVisible(element: Element): boolean {
  const record = records.get(element);
  return (record?.intersecting ?? true) && pageShown();
}

/** Subscribe; the listener is called on every change (not immediately). Returns an idempotent unsubscribe. */
export function subscribeVisibility(element: Element, listener: Listener): () => void {
  let record = records.get(element);
  if (!record) {
    record = { intersecting: true, listeners: new Set() };
    records.set(element, record);
    gateCounters.elements++;
    if (typeof IntersectionObserver === "function") {
      if (!observer) {
        observer = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            const r = records.get(entry.target);
            if (!r || r.intersecting === entry.isIntersecting) continue;
            r.intersecting = entry.isIntersecting;
            notify(r);
          }
        });
        gateCounters.observers++;
      }
      observer.observe(element);
    }
    if (!listening && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
      listening = true;
    }
  }
  record.listeners.add(listener);
  gateCounters.listeners++;
  let done = false;
  return () => {
    if (done) return;
    done = true;
    const r = records.get(element);
    if (!r) return;
    r.listeners.delete(listener);
    gateCounters.listeners--;
    if (r.listeners.size > 0) return;
    records.delete(element);
    gateCounters.elements--;
    observer?.unobserve(element);
    if (records.size === 0) {
      observer?.disconnect();
      if (observer) gateCounters.observers--;
      observer = undefined;
      if (listening && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
        listening = false;
      }
    }
  };
}
