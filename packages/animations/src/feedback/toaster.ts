/**
 * F06 toaster store (Phase 015; contracts/feedback-api.md §4, research R15). Framework-free: holds the visible
 * toasts, their dismissal timers and pause reasons; `<Toaster>` renders them with core Presence states. Timers
 * pause while any reason is active (hover, focus, hidden page, explicit) and resume with their remaining time.
 * Default duration: 6000 ms + 60 ms per character (max 20000; WCAG 2.2.1), `Infinity` for toasts with an action.
 * More than `max` toasts → the oldest unprotected one is dismissed.
 */

export type ToastTone = "neutral" | "success" | "error";

export interface ToastInput {
  /** Stable id (default generated). Showing an existing id replaces its content and restarts its timer. */
  id?: string;
  title: string;
  description?: string;
  tone?: ToastTone;
  /** ms (1000–60000), `Infinity`, or omitted for the automatic duration. */
  duration?: number;
  action?: { label: string; onAction(): void };
}

export interface Toast {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly tone: ToastTone;
  readonly duration: number;
  readonly action?: { label: string; onAction(): void };
  /** Increments when the same id is shown again (re-announce once). */
  readonly version: number;
}

export interface ToasterOptions {
  /** Visible toasts at most (1–10, default 3). */
  max?: number;
}

export interface Toaster {
  readonly toasts: readonly Toast[];
  readonly paused: boolean;
  show(input: ToastInput): string;
  dismiss(id: string): void;
  dismissAll(): void;
  /** Pause every timer for `reason` (default "manual"). */
  pause(reason?: string): void;
  resume(reason?: string): void;
  /** A toast that must not be evicted by overflow (the focused one), or `undefined`. */
  protect(id: string | undefined): void;
  subscribe(listener: () => void): () => void;
  /** Clear every toast, timer and listener (idempotent). */
  destroy(): void;
}

/** Live feedback counters (tests and lab). */
export const feedbackCounters = { toasters: 0, timers: 0, loadingButtons: 0, optimistic: 0 };

let ids = 0;

export function autoDuration(input: Pick<ToastInput, "title" | "description" | "action">): number {
  if (input.action) return Number.POSITIVE_INFINITY;
  const chars = input.title.length + (input.description?.length ?? 0);
  return Math.min(20000, 6000 + 60 * chars);
}

export function createToaster(options: ToasterOptions = {}): Toaster {
  const max = Math.min(10, Math.max(1, Math.round(options.max ?? 3)));
  let toasts: Toast[] = [];
  const listeners = new Set<() => void>();
  const reasons = new Set<string>();
  const timers = new Map<
    string,
    { remaining: number; started: number; handle?: ReturnType<typeof setTimeout> }
  >();
  let protectedId: string | undefined;
  let destroyed = false;
  feedbackCounters.toasters++;

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
    feedbackCounters.timers--;
  }
  function startTimer(id: string): void {
    const timer = timers.get(id);
    if (!timer || timer.handle || reasons.size > 0 || !Number.isFinite(timer.remaining)) return;
    timer.started = now();
    timer.handle = setTimeout(
      () => {
        timer.handle = undefined;
        feedbackCounters.timers--;
        dismiss(id);
      },
      Math.max(0, timer.remaining),
    );
    feedbackCounters.timers++;
  }
  function dropTimer(id: string): void {
    stopTimer(id);
    timers.delete(id);
  }

  function dismiss(id: string): void {
    if (!toasts.some((toast) => toast.id === id)) return;
    dropTimer(id);
    toasts = toasts.filter((toast) => toast.id !== id);
    if (protectedId === id) protectedId = undefined;
    emit();
  }

  return {
    get toasts() {
      return toasts;
    },
    get paused() {
      return reasons.size > 0;
    },
    show(input) {
      if (!input || typeof input.title !== "string" || input.title.trim() === "")
        throw new TypeError(
          '[@neshel-ui/animations] toaster.show: "title" must be a non-empty string.',
        );
      const tone = input.tone ?? "neutral";
      if (!["neutral", "success", "error"].includes(tone))
        throw new TypeError(
          `[@neshel-ui/animations] toaster.show: invalid tone ${JSON.stringify(tone)}.`,
        );
      let duration = input.duration ?? autoDuration(input);
      if (duration !== Number.POSITIVE_INFINITY)
        duration = Math.min(60000, Math.max(1000, Number.isFinite(duration) ? duration : 6000));
      const id = input.id ?? `neshel-toast-${++ids}`;
      const existing = toasts.find((toast) => toast.id === id);
      const toast: Toast = {
        id,
        title: input.title,
        description: input.description,
        tone,
        duration,
        action: input.action,
        version: existing ? existing.version + 1 : 0,
      };
      dropTimer(id);
      toasts = existing ? toasts.map((t) => (t.id === id ? toast : t)) : [...toasts, toast];
      while (toasts.length > max) {
        const victim = toasts.find((t) => t.id !== protectedId && t.id !== id) ?? toasts[0];
        if (!victim) break;
        dropTimer(victim.id);
        toasts = toasts.filter((t) => t !== victim);
      }
      timers.set(id, { remaining: duration, started: now() });
      startTimer(id);
      emit();
      return id;
    },
    dismiss,
    dismissAll() {
      for (const toast of toasts) dropTimer(toast.id);
      toasts = [];
      protectedId = undefined;
      emit();
    },
    pause(reason = "manual") {
      const before = reasons.size;
      reasons.add(reason);
      if (before === 0) for (const id of timers.keys()) stopTimer(id);
    },
    resume(reason = "manual") {
      if (!reasons.delete(reason) || reasons.size > 0) return;
      for (const id of timers.keys()) startTimer(id);
    },
    protect(id) {
      protectedId = id;
    },
    subscribe(listener) {
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
      listeners.clear();
      reasons.clear();
      feedbackCounters.toasters--;
    },
  };
}
