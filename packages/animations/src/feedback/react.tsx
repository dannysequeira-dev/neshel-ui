"use client";
/**
 * React components of the Loading & Feedback family (Phase 015; contracts/feedback-api.md). Semantics first:
 * indicators are ARIA progressbars (no invented value), skeletons are hidden from assistive technology, the
 * success mark never announces, toasts announce once through regions that exist before content. Motion is CSS on
 * package-rendered elements or token layers (`feedback.css`); reduced motion keeps a slow non-vestibular signal.
 */
import { Slot } from "@radix-ui/react-slot";
import {
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { CHECK_CIRCLE, CHECK_PATH, CHECK_VIEWBOX } from "../core/marks.js";
import { createPresence, type PresenceEntry } from "../core/presence.js";
import type { ProgressSource } from "../core/progress-driver.js";
import { getFrameScheduler } from "../core/scheduler.js";
import { addToken, FX_ATTRIBUTE } from "../core/tokens.js";
import { useEngine } from "../react/use-engine.js";
import {
  createLoadingButton,
  createOptimisticPulse,
  type LoadingButtonControl,
  type OptimisticPulseControl,
  type OptimisticStatus,
} from "./states.js";
import type { Toast, Toaster as ToasterStore } from "./toaster.js";

const useClientLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect;
const cx = (...names: Array<string | undefined | false>) => names.filter(Boolean).join(" ");

// --- F01 / F04 indicators ----------------------------------------------------------------------------------

type IndicatorProps = Omit<ComponentPropsWithoutRef<"span">, "children" | "role"> & {
  /** Accessible name (default "Loading"). */
  label?: string;
  /** Hidden from assistive technology (the busy region already says it). */
  decorative?: boolean;
  /** CSS length (default 1.25em). */
  size?: string;
};

function indicatorA11y(label: string, decorative: boolean | undefined) {
  return decorative
    ? { "aria-hidden": true as const }
    : { role: "progressbar" as const, "aria-label": label };
}

/** F01 — indeterminate spinner (`role="progressbar"`, no value); slow pulse under reduced motion. */
export function Spinner({
  label = "Loading",
  decorative,
  size,
  className,
  style,
  ...rest
}: IndicatorProps) {
  return (
    <span
      className={cx("neshel-spinner", className)}
      style={size ? { ...style, ["--neshel-indicator-size" as string]: size } : style}
      {...indicatorA11y(label, decorative)}
      {...rest}
    >
      <span className="neshel-spinner-ring" aria-hidden="true" />
    </span>
  );
}

/** F04 — three pulsing dots (indeterminate); slow opacity under reduced motion. */
export function DotsPulse({
  label = "Loading",
  decorative,
  size,
  className,
  style,
  ...rest
}: IndicatorProps) {
  return (
    <span
      className={cx("neshel-dots", className)}
      style={size ? { ...style, ["--neshel-indicator-size" as string]: size } : style}
      {...indicatorA11y(label, decorative)}
      {...rest}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="neshel-dot"
          aria-hidden="true"
          style={{ ["--neshel-i" as string]: i }}
        />
      ))}
    </span>
  );
}

// --- F03 / F09 progress ------------------------------------------------------------------------------------

type ProgressProps = {
  /** Accessible name (required). */
  label: string;
  /** Known progress; omit for an indeterminate indicator (no `aria-valuenow`). */
  value?: number;
  max?: number;
  /** Human-readable value (`aria-valuetext`). */
  valueText?: string;
};

function progressAria(label: string, value: number | undefined, max: number, valueText?: string) {
  const known = value !== undefined && Number.isFinite(value);
  const clamped = known ? Math.min(max, Math.max(0, value as number)) : undefined;
  return {
    role: "progressbar" as const,
    "aria-label": label,
    "aria-valuemin": 0,
    "aria-valuemax": max,
    ...(known ? { "aria-valuenow": Math.round(clamped as number) } : {}),
    ...(valueText ? { "aria-valuetext": valueText } : {}),
    clamped,
  };
}

export type ProgressBarProps = ProgressProps &
  Omit<ComponentPropsWithoutRef<"div">, "children" | "role">;

/** F03 — progress bar: determinate with a real value, indeterminate sweep otherwise. */
export function ProgressBar({
  label,
  value,
  max = 100,
  valueText,
  className,
  style,
  ...rest
}: ProgressBarProps) {
  const { clamped, ...aria } = progressAria(label, value, max, valueText);
  return (
    <div
      className={cx("neshel-progress", className)}
      data-indeterminate={clamped === undefined ? "" : undefined}
      style={
        clamped === undefined
          ? style
          : { ...style, ["--neshel-progress" as string]: String(clamped / max) }
      }
      {...aria}
      {...rest}
    >
      <span className="neshel-progress-bar" aria-hidden="true" />
    </div>
  );
}

export type ProgressRingProps = ProgressProps &
  Omit<ComponentPropsWithoutRef<"span">, "children" | "role"> & {
    /** 0–1 source (timeline value, scroll progress…): visual per frame, `aria-valuenow` on integer changes. */
    progress?: ProgressSource;
    /** CSS length (default 2.5em). */
    size?: string;
  };

/** F09 — progress ring (`pathLength`-normalised SVG; transitions are package CSS). */
export function ProgressRing(props: ProgressRingProps) {
  const { label, value, max = 100, valueText, progress, size, className, style, ...rest } = props;
  const ref = useRef<HTMLSpanElement | null>(null);
  const { clamped, ...aria } = progressAria(label, value, max, valueText);
  useClientLayoutEffect(() => {
    const el = ref.current;
    if (!el || !progress) return;
    const scheduler = getFrameScheduler();
    let pending = progress.get();
    let cancel: (() => void) | undefined;
    let lastNow = "";
    const write = () => {
      cancel = undefined;
      const p = Math.min(1, Math.max(0, Number.isFinite(pending) ? pending : 0));
      el.style.setProperty("--neshel-ring-offset", String(Math.round((1 - p) * 10000) / 100));
      el.removeAttribute("data-indeterminate");
      const now = String(Math.round(p * max));
      if (now !== lastNow) {
        lastNow = now;
        el.setAttribute("aria-valuenow", now);
      }
    };
    write();
    const unsubscribe = progress.subscribe((next) => {
      pending = next;
      cancel ??= scheduler.schedule(write, "write");
    });
    return () => {
      unsubscribe();
      cancel?.();
    };
  }, [progress, max]);
  const indeterminate = clamped === undefined && !progress;
  return (
    <span
      ref={ref}
      className={cx("neshel-ring", className)}
      data-indeterminate={indeterminate ? "" : undefined}
      style={{
        ...style,
        ...(size ? { ["--neshel-indicator-size" as string]: size } : {}),
        ...(clamped !== undefined
          ? {
              ["--neshel-ring-offset" as string]: String(
                Math.round((1 - clamped / max) * 10000) / 100,
              ),
            }
          : {}),
      }}
      {...aria}
      {...rest}
    >
      <svg className="neshel-ring-svg" viewBox="0 0 36 36" aria-hidden="true" focusable="false">
        <circle className="neshel-ring-track" cx="18" cy="18" r="15.9155" pathLength={100} />
        <circle className="neshel-ring-arc" cx="18" cy="18" r="15.9155" pathLength={100} />
      </svg>
    </span>
  );
}

// --- F02 / F10 ---------------------------------------------------------------------------------------------

/** F02 — adds the `shimmer` token to the single child (e.g. a Components `Skeleton`); `::after` sweep. */
export function Shimmer({ children }: { children: ReactElement }) {
  const ref = useRef<HTMLElement | null>(null);
  useClientLayoutEffect(() => {
    if (!ref.current) return;
    return addToken(ref.current, FX_ATTRIBUTE, "shimmer");
  }, []);
  return <Slot ref={ref}>{children}</Slot>;
}

export type SkeletonShimmerProps = Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  width?: string;
  height?: string;
  shape?: "line" | "rect" | "circle";
};

/** F02 — a decorative placeholder with a shimmer (`aria-hidden`; mark the region `aria-busy`). */
export function SkeletonShimmer({
  width,
  height,
  shape = "line",
  className,
  style,
  ...rest
}: SkeletonShimmerProps) {
  return (
    <span
      className={cx("neshel-skeleton-shimmer", className)}
      data-shape={shape}
      aria-hidden="true"
      style={{ ...style, ...(width ? { width } : {}), ...(height ? { height } : {}) }}
      {...rest}
    />
  );
}

export type PendingTextProps = Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  pending?: boolean;
  children: ReactNode;
};

/** F10 — the text stays one readable text; a light band sweeps while `pending`. */
export function PendingText({ pending = true, className, children, ...rest }: PendingTextProps) {
  return (
    <span
      className={cx("neshel-pending-text", className)}
      data-pending={pending ? "" : undefined}
      {...rest}
    >
      {children}
    </span>
  );
}

// --- F05 ---------------------------------------------------------------------------------------------------

export type SuccessMarkProps = Omit<ComponentPropsWithoutRef<"svg">, "children"> & {
  /** Draw the mark (only when the operation really succeeded). */
  show: boolean;
  /** Accessible name; omitted → decorative. It never announces (no live region). */
  label?: string;
  /** px (default 40). */
  size?: number;
  circle?: boolean;
};

/** F05 — success check drawn when `show` becomes true (shape shared with S10 through core). */
export function SuccessMark({
  show,
  label,
  size = 40,
  circle = true,
  className,
  ...rest
}: SuccessMarkProps) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative (aria-hidden) unless `label` is given, then role="img" + aria-label.
    <svg
      viewBox={CHECK_VIEWBOX}
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx("neshel-success-mark", className)}
      data-state={show ? "shown" : "hidden"}
      focusable="false"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      {...rest}
    >
      {circle ? (
        <circle {...CHECK_CIRCLE} pathLength={1} className="neshel-success-circle" />
      ) : null}
      <path d={CHECK_PATH} pathLength={1} className="neshel-success-path" />
    </svg>
  );
}

// --- F07 / F08 ---------------------------------------------------------------------------------------------

export type LoadingButtonProps = {
  loading: boolean;
  /** One button element (e.g. a Components `Button` without its `loading` prop). */
  children: ReactElement;
  controlRef?: RefObject<LoadingButtonControl | null>;
};

/** F07 — loading morph on the single button child (same element, name and focus; no double activation). */
export function LoadingButton({ loading, children, controlRef }: LoadingButtonProps) {
  const ref = useRef<HTMLElement | null>(null);
  const handle = useEngine<HTMLElement, LoadingButtonControl>(
    ref,
    (el) => createLoadingButton(el),
    {},
  );
  useClientLayoutEffect(() => {
    handle.current?.set(loading);
    if (controlRef) controlRef.current = handle.current;
  }, [loading]);
  return <Slot ref={ref}>{children}</Slot>;
}

export type OptimisticPulseProps = {
  status: OptimisticStatus;
  onRollback?(): void;
  children: ReactElement;
  controlRef?: RefObject<OptimisticPulseControl | null>;
};

/** F08 — pending/confirmed/failed states on the single child; `failed` calls `onRollback`. */
export function OptimisticPulse({
  status,
  onRollback,
  children,
  controlRef,
}: OptimisticPulseProps) {
  const ref = useRef<HTMLElement | null>(null);
  const latest = useRef(onRollback);
  latest.current = onRollback;
  const handle = useEngine<HTMLElement, OptimisticPulseControl>(
    ref,
    (el) => createOptimisticPulse(el, { onRollback: () => latest.current?.() }),
    {},
  );
  useClientLayoutEffect(() => {
    handle.current?.set(status);
    if (controlRef) controlRef.current = handle.current;
  }, [status]);
  return <Slot ref={ref}>{children}</Slot>;
}

// --- F06 ---------------------------------------------------------------------------------------------------

export type ToasterProps = Omit<ComponentPropsWithoutRef<"section">, "children"> & {
  toaster: ToasterStore;
  /** Accessible name of the notifications region (default "Notifications"). */
  label?: string;
  /** Key that moves focus to the toasts (default "F8"; `null` disables). */
  hotkey?: string | null;
  /** Accessible name of each close button (default "Close"). */
  closeLabel?: string;
};

const EXIT_FALLBACK_MS = 600;

/** F06 — notifications region: Presence-driven enter/exit, timers paused on hover/focus/hidden, keyboard close. */
export function Toaster(props: ToasterProps) {
  const {
    toaster,
    label = "Notifications",
    hotkey = "F8",
    closeLabel = "Close",
    className,
    ...rest
  } = props;
  const toasts = useSyncExternalStore(
    (fn) => toaster.subscribe(fn),
    () => toaster.toasts,
    () => toaster.toasts,
  );
  const presence = useRef(createPresence<Toast>());
  presence.current.update(toasts.map((toast) => ({ key: toast.id, value: toast })));
  const entries = presence.current.entries;
  const [, rerender] = useState(0);
  const region = useRef<HTMLElement | null>(null);
  const politeRef = useRef<HTMLDivElement | null>(null);
  const alertRef = useRef<HTMLDivElement | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const announced = useRef(new Map<string, number>());

  // Announce each toast (and each re-show of an id) exactly once, by inserting text into a region that already
  // exists — never re-rendered per frame.
  useEffect(() => {
    for (const toast of toasts) {
      if (announced.current.get(toast.id) === toast.version) continue;
      announced.current.set(toast.id, toast.version);
      const target = toast.tone === "error" ? alertRef.current : politeRef.current;
      if (!target) continue;
      const line = target.ownerDocument.createElement("p");
      line.textContent = toast.description ? `${toast.title}. ${toast.description}` : toast.title;
      target.appendChild(line);
      setTimeout(() => line.remove(), 7000);
    }
    for (const id of [...announced.current.keys()])
      if (!toasts.some((toast) => toast.id === id)) announced.current.delete(id);
  }, [toasts]);

  // Hidden page pauses the timers; the hotkey moves focus into the region.
  useEffect(() => {
    const onVisibility = () =>
      document.hidden ? toaster.pause("hidden") : toaster.resume("hidden");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (!hotkey || event.key !== hotkey || toaster.toasts.length === 0) return;
      event.preventDefault();
      returnFocus.current = document.activeElement as HTMLElement | null;
      region.current?.querySelector<HTMLElement>(".neshel-toast")?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onKey);
      toaster.resume("hidden");
      toaster.resume("hover");
      toaster.resume("focus");
    };
  }, [toaster, hotkey]);

  const finishExit = (entry: PresenceEntry<Toast>) => {
    if (presence.current.remove(entry.key, entry.generation)) rerender((n) => n + 1);
  };

  function close(id: string, from: HTMLElement | null): void {
    // Keep keyboard users in place: next toast, or where they came from.
    if (from && region.current?.contains(document.activeElement)) {
      const items = [
        ...(region.current.querySelectorAll<HTMLElement>(".neshel-toast[data-state='open']") ?? []),
      ];
      const next = items[items.indexOf(from) + 1] ?? items[items.indexOf(from) - 1];
      if (next && next !== from) next.focus();
      else (returnFocus.current?.isConnected ? returnFocus.current : null)?.focus();
    }
    toaster.dismiss(id);
  }

  return (
    <section
      ref={region}
      className={cx("neshel-toaster", className)}
      aria-label={label}
      onPointerEnter={() => toaster.pause("hover")}
      onPointerLeave={() => toaster.resume("hover")}
      onFocus={(event) => {
        toaster.pause("focus");
        const item = (event.target as HTMLElement).closest?.(".neshel-toast");
        toaster.protect(item?.getAttribute("data-id") ?? undefined);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          toaster.resume("focus");
          toaster.protect(undefined);
        }
      }}
      {...rest}
    >
      <div ref={politeRef} role="status" aria-live="polite" className="neshel-toaster-announcer" />
      <div ref={alertRef} role="alert" className="neshel-toaster-announcer" />
      <ol className="neshel-toast-list">
        {entries.map((entry) => (
          <ToastItem
            key={entry.key}
            entry={entry}
            closeLabel={closeLabel}
            onClose={close}
            onExited={() => finishExit(entry)}
          />
        ))}
      </ol>
    </section>
  );
}

function ToastItem(props: {
  entry: PresenceEntry<Toast>;
  closeLabel: string;
  onClose(id: string, from: HTMLElement | null): void;
  onExited(): void;
}) {
  const { entry, closeLabel, onClose, onExited } = props;
  const toast = entry.value;
  const ref = useRef<HTMLLIElement | null>(null);
  const [entered, setEntered] = useState(false);
  const exiting = entry.status === "exiting";
  // Enter on the next frame so the CSS transition runs from the `entering` state.
  useEffect(() => {
    const cancel = getFrameScheduler().schedule(() => setEntered(true), "write");
    return cancel;
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: one exit per generation; `onExited` identity changes every render.
  useEffect(() => {
    if (!exiting) return;
    const el = ref.current;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onExited();
    };
    const onEnd = (event: TransitionEvent) => {
      if (event.target === el) finish();
    };
    el?.addEventListener("transitionend", onEnd);
    const timer = setTimeout(finish, EXIT_FALLBACK_MS);
    return () => {
      el?.removeEventListener("transitionend", onEnd);
      clearTimeout(timer);
    };
  }, [exiting, entry.generation]);
  const state = exiting ? "closing" : entered ? "open" : "entering";
  const onKeyDown = (event: KeyboardEvent<HTMLLIElement>) => {
    if (event.key === "Escape" && !exiting) {
      event.preventDefault();
      onClose(toast.id, ref.current);
    }
  };
  return (
    <li
      ref={ref}
      className="neshel-toast"
      data-id={toast.id}
      data-tone={toast.tone}
      data-state={state}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      inert={exiting || undefined}
    >
      <div className="neshel-toast-text">
        <p className="neshel-toast-title">{toast.title}</p>
        {toast.description ? <p className="neshel-toast-description">{toast.description}</p> : null}
      </div>
      {toast.action ? (
        <button
          type="button"
          className="neshel-toast-action"
          onClick={() => {
            toast.action?.onAction();
            onClose(toast.id, ref.current);
          }}
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type="button"
        className="neshel-toast-close"
        aria-label={closeLabel}
        onClick={() => onClose(toast.id, ref.current)}
      >
        <span aria-hidden="true">×</span>
      </button>
    </li>
  );
}
