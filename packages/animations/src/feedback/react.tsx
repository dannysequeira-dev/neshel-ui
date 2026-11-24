"use client";
/**
 * React components of the Loading & Feedback family (Phase 015; contracts/feedback-api.md). Semantics first:
 * indicators are ARIA progressbars (no invented value), skeletons are hidden from assistive technology, the
 * success mark never announces; F06 only animates the enter/exit of a list another component owns. Motion is CSS on
 * package-rendered elements or token layers (`feedback.css`); reduced motion keeps a slow non-vestibular signal.
 */
import { Slot } from "@radix-ui/react-slot";
import {
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { devWarnOnce } from "../core/dev.js";
import { CHECK_CIRCLE, CHECK_PATH, CHECK_VIEWBOX } from "../core/marks.js";
import type { ProgressSource } from "../core/progress-driver.js";
import { getFrameScheduler } from "../core/scheduler.js";
import { addToken, FX_ATTRIBUTE } from "../core/tokens.js";
import { useEngine } from "../react/use-engine.js";
import { createEnterExit, type EnterExitControl, type EnterExitOptions } from "./enter-exit.js";
import {
  createLoadingButton,
  createOptimisticPulse,
  type LoadingButtonControl,
  type OptimisticPulseControl,
  type OptimisticStatus,
} from "./states.js";

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

export type EnterExitProps = EnterExitOptions & {
  /** One element: the list container (e.g. a Components `<Toaster motion="none">`). */
  children: ReactElement;
};

/**
 * F06 — enter/exit motion for the items of a list another component owns (`data-state` + `neshel-exit`, see
 * `createEnterExit`). Renders no element of its own; content, roles, timers and focus stay with the owner.
 */
export function EnterExit({
  children,
  from,
  exitTo,
  distance,
  duration,
  selector,
  reducedMotion,
}: EnterExitProps) {
  const ref = useRef<HTMLElement | null>(null);
  const control = useRef<EnterExitControl | null>(null);
  const options: EnterExitOptions = { from, exitTo, distance, duration, selector, reducedMotion };
  // biome-ignore lint/correctness/useExhaustiveDependencies: created once per mount; options flow through update().
  useEffect(() => {
    if (!ref.current) {
      devWarnOnce(
        "enter-exit-ref",
        "<EnterExit>: its child did not receive the ref (wrap an element, or a component that forwards `ref` to its list container).",
      );
      return;
    }
    const created = createEnterExit(ref.current, options);
    control.current = created;
    return () => {
      created.destroy();
      control.current = null;
    };
  }, []);
  useEffect(() => {
    control.current?.update(options);
  });
  return <Slot ref={ref}>{children}</Slot>;
}
