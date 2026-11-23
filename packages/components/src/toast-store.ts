/*
 * Toaster store (feature 017, specs/017-components-completion/contracts/toast-api.md; migrated from the Phase 015
 * `@neshel-ui/animations/feedback` F06 store). Framework-free: holds the visible toasts, the overflow queue, the
 * dismissal timers and the pause reasons; `<Toaster>` renders them. Timers pause while any reason is active (hover,
 * focus, hidden page, explicit) and resume with their remaining time. Default duration: 6000 ms + 60 ms per
 * character (max 20000; WCAG 2.2.1), `Infinity` for toasts with an action.
 */

export type ToastTone = "neutral" | "success" | "warning" | "error";

export interface ToastAction {
  label: string;
  onAction(): void;
}

export interface ToastInput {
  /** Stable id (default generated). Showing an existing id replaces its content and restarts its timer. */
  id?: string;
  title: string;
  description?: string;
  /** Default `"neutral"`. `"error"` is announced assertively. */
  tone?: ToastTone;
  /** ms (clamped to 1000–60000), `Infinity` (persistent), or omitted for the automatic duration. */
  duration?: number;
  /** One optional action; it makes the toast persistent unless `duration` is given. */
  action?: ToastAction;
}

export interface Toast {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly tone: ToastTone;
  readonly duration: number;
  readonly action?: ToastAction;
  /** Increments when the same id is shown again (announced again, once). */
  readonly version: number;
}

export interface ToasterOptions {
  /** Visible toasts at most (1–10, default 3). */
  max?: number;
  /**
   * What happens beyond `max`: `"evict"` (default) dismisses the oldest unprotected toast; `"queue"` keeps the new
   * toast waiting (no timer, not rendered, not announced) until a visible one is dismissed.
   */
  overflow?: "evict" | "queue";
}

export interface ToasterStore {
  /** Visible toasts, oldest first. */
  readonly toasts: readonly Toast[];
  /** Toasts waiting for a free slot (`overflow: "queue"`), oldest first. */
  readonly queued: readonly Toast[];
  /** Whether any pause reason is active. */
  readonly paused: boolean;
  /** Shows (or replaces) a toast; returns its id (`""` once destroyed). Invalid input throws. */
  show(input: ToastInput): string;
  dismiss(id: string): void;
  dismissAll(): void;
  /** Pause every timer for `reason` (default `"manual"`). */
  pause(reason?: string): void;
  resume(reason?: string): void;
  /** A toast that must not be evicted by overflow (the focused one), or `undefined`. */
  protect(id: string | undefined): void;
  subscribe(listener: () => void): () => void;
  /**
   * Clears every toast, timer, pause reason and listener (idempotent). A destroyed store is inert: `show()` still
   * validates its input but returns `""` and creates nothing, `subscribe()` registers nothing, the rest do nothing.
   */
  destroy(): void;
}

/** Live counters for tests (not part of the public API). */
export const toastCounters = { stores: 0, timers: 0 };

const TONES: readonly ToastTone[] = ["neutral", "success", "warning", "error"];
let ids = 0;

/** Automatic duration: 6000 ms + 60 ms per character (max 20000); persistent with an action. */
export function autoDuration(input: Pick<ToastInput, "title" | "description" | "action">): number {
  if (input.action) return Number.POSITIVE_INFINITY;
  const chars = input.title.length + (input.description?.length ?? 0);
  return Math.min(20000, 6000 + 60 * chars);
}

function fail(message: string): never {
  throw new TypeError(`[@neshel-ui/components] toaster.show: ${message}`);
}

/** Creates a toaster store. The consumer owns it: `<Toaster>` never destroys it. */
export function createToaster(options: ToasterOptions = {}): ToasterStore {
  const max = Math.min(10, Math.max(1, Math.round(options.max ?? 3)));
  const queueOverflow = options.overflow === "queue";
  let toasts: Toast[] = [];
  let queued: Toast[] = [];
  const listeners = new Set<() => void>();
  const reasons = new Set<string>();
  const timers = new Map<
    string,
    { remaining: number; started: number; handle?: ReturnType<typeof setTimeout> }
  >();
  let protectedId: string | undefined;
  let destroyed = false;
  toastCounters.stores++;

  const emit = () => {
    for (const fn of [...listeners]) fn();
  };
  const now = () => Date.now();

  function stopTimer(id: string): void {
    const timer = timers.get(id);
    if (!timer?.handle) return;
    clearTimeout(timer.handle);
    timer.handle = undefined;
    timer.remaining -= now() - timer.started;
    toastCounters.timers--;
  }
  function startTimer(id: string): void {
    const timer = timers.get(id);
    if (!timer || timer.handle || reasons.size > 0 || !Number.isFinite(timer.remaining)) return;
    timer.started = now();
    timer.handle = setTimeout(
      () => {
        timer.handle = undefined;
        toastCounters.timers--;
        dismiss(id);
      },
      Math.max(0, timer.remaining),
    );
    toastCounters.timers++;
  }
  function dropTimer(id: string): void {
    stopTimer(id);
    timers.delete(id);
  }
  function arm(toast: Toast): void {
    dropTimer(toast.id);
    timers.set(toast.id, { remaining: toast.duration, started: now() });
    startTimer(toast.id);
  }
  /** Moves queued toasts into free slots (oldest first) and starts their timers. */
  function promote(): void {
    while (toasts.length < max && queued.length > 0) {
      const next = queued[0] as Toast;
      queued = queued.slice(1);
      toasts = [...toasts, next];
      arm(next);
    }
  }

  function dismiss(id: string): void {
    if (destroyed) return;
    if (queued.some((toast) => toast.id === id)) {
      queued = queued.filter((toast) => toast.id !== id);
      emit();
      return;
    }
    if (!toasts.some((toast) => toast.id === id)) return;
    dropTimer(id);
    toasts = toasts.filter((toast) => toast.id !== id);
    if (protectedId === id) protectedId = undefined;
    promote();
    emit();
  }

  return {
    get toasts() {
      return toasts;
    },
    get queued() {
      return queued;
    },
    get paused() {
      return reasons.size > 0;
    },
    show(input) {
      if (!input || typeof input.title !== "string" || input.title.trim() === "")
        fail('"title" must be a non-empty string.');
      const tone = input.tone ?? "neutral";
      if (!TONES.includes(tone)) fail(`invalid tone ${JSON.stringify(tone)}.`);
      if (input.action && (typeof input.action.label !== "string" || !input.action.label.trim()))
        fail('"action.label" must be a non-empty string.');
      let duration = input.duration ?? autoDuration(input);
      if (duration !== Number.POSITIVE_INFINITY)
        duration = Math.min(60000, Math.max(1000, Number.isFinite(duration) ? duration : 6000));
      if (destroyed) return "";
      const id = input.id ?? `neshel-toast-${++ids}`;
      const visible = toasts.find((toast) => toast.id === id);
      const waiting = queued.find((toast) => toast.id === id);
      const previous = visible ?? waiting;
      const toast: Toast = {
        id,
        title: input.title,
        description: input.description,
        tone,
        duration,
        action: input.action,
        version: previous ? previous.version + 1 : 0,
      };
      if (visible) {
        toasts = toasts.map((t) => (t.id === id ? toast : t));
        arm(toast);
      } else if (waiting) {
        queued = queued.map((t) => (t.id === id ? toast : t));
      } else if (queueOverflow && toasts.length >= max) {
        queued = [...queued, toast];
      } else {
        toasts = [...toasts, toast];
        while (toasts.length > max) {
          const victim = toasts.find((t) => t.id !== protectedId && t.id !== id) ?? toasts[0];
          if (!victim) break;
          dropTimer(victim.id);
          toasts = toasts.filter((t) => t !== victim);
        }
        arm(toast);
      }
      emit();
      return id;
    },
    dismiss,
    dismissAll() {
      if (destroyed) return;
      for (const toast of toasts) dropTimer(toast.id);
      toasts = [];
      queued = [];
      protectedId = undefined;
      emit();
    },
    pause(reason = "manual") {
      if (destroyed) return;
      const before = reasons.size;
      reasons.add(reason);
      if (before === 0) for (const id of timers.keys()) stopTimer(id);
    },
    resume(reason = "manual") {
      if (destroyed || !reasons.delete(reason) || reasons.size > 0) return;
      for (const id of timers.keys()) startTimer(id);
    },
    protect(id) {
      if (!destroyed) protectedId = id;
    },
    subscribe(listener) {
      if (destroyed) return () => {};
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const toast of toasts) dropTimer(toast.id);
      toasts = [];
      queued = [];
      protectedId = undefined;
      listeners.clear();
      reasons.clear();
      toastCounters.stores--;
    },
  };
}
