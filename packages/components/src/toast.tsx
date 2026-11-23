"use client";
/**
 * Toaster (feature 017, contracts/toast-api.md): renders a `createToaster()` store. Two live regions exist before
 * any toast (polite `status`, assertive `alert` for errors) and each toast (or re-show of an id) is announced once
 * per store, however many `<Toaster>`s render it. Timers pause on hover, focus and hidden page; the hotkey moves
 * focus to the toasts; Escape closes the focused toast; focus is never moved by a toast appearing. Enter/exit use
 * the item's `data-state` (`entering` → `open` → `closing`); an exiting toast is removed when every animation or
 * transition on it has finished and every promise passed to the `neshel-exit` event's `waitUntil` has settled
 * (Components' CSS, or Animations F06 with `motion="none"`), bounded by a timeout.
 */
import {
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type Ref,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { buttonClassName } from "./button.js";
import { CloseIcon } from "./internal/icons.js";
import { composeRefs } from "./internal/layer.js";
import { cx, oneOf } from "./internal/validate.js";
import type { Toast, ToasterStore } from "./toast-store.js";

export type ToasterPlacement = "bottom-end" | "bottom-start" | "top-end" | "top-start";

export type ToasterProps = Omit<ComponentPropsWithoutRef<"section">, "children"> & {
  /** The store from `createToaster()`. The consumer owns it; `<Toaster>` never destroys it. */
  toaster: ToasterStore;
  /** Accessible name of the notifications region (default "Notifications"). */
  label?: string;
  /** Key that moves focus to the toasts (default "F8"; `null` disables). */
  hotkey?: string | null;
  /** Accessible name of each close button (default "Close"). */
  closeLabel?: string;
  /** Viewport corner (logical; default "bottom-end"). */
  placement?: ToasterPlacement;
  /** `"css"` (default): Components' enter/exit transitions. `"none"`: no package motion (e.g. Animations F06). */
  motion?: "css" | "none";
  ref?: Ref<HTMLElement>;
};

const PLACEMENTS: readonly ToasterPlacement[] = [
  "bottom-end",
  "bottom-start",
  "top-end",
  "top-start",
];
/** Upper bound for an exit (ms) when animations never report completion. */
const EXIT_TIMEOUT_MS = 1000;

/** Per store: who announces, and which versions were already announced. */
const announcing = new WeakMap<
  ToasterStore,
  { owners: symbol[]; announced: Map<string, number> }
>();
function announcementState(store: ToasterStore) {
  let state = announcing.get(store);
  if (!state) {
    state = { owners: [], announced: new Map() };
    announcing.set(store, state);
  }
  return state;
}

interface Entry {
  toast: Toast;
  exiting: boolean;
  generation: number;
}

/** Keeps exiting toasts mounted until their exit finishes; re-showing an id during its exit re-enters it. */
function reconcile(previous: readonly Entry[], toasts: readonly Toast[]): Entry[] {
  const live = new Map(toasts.map((toast) => [toast.id, toast]));
  const next: Entry[] = previous.map((entry) => {
    const toast = live.get(entry.toast.id);
    if (toast) {
      if (!entry.exiting && entry.toast === toast) return entry;
      return {
        toast,
        exiting: false,
        generation: entry.exiting ? entry.generation + 1 : entry.generation,
      };
    }
    return entry.exiting ? entry : { ...entry, exiting: true };
  });
  const known = new Set(previous.map((entry) => entry.toast.id));
  for (const toast of toasts)
    if (!known.has(toast.id)) next.push({ toast, exiting: false, generation: 0 });
  return next;
}

export function Toaster(props: ToasterProps) {
  const {
    toaster,
    label = "Notifications",
    hotkey = "F8",
    closeLabel = "Close",
    placement,
    motion,
    className,
    ref,
    onPointerEnter,
    onPointerLeave,
    onFocus,
    onBlur,
    ...rest
  } = props;
  const place = oneOf("Toaster", "placement", placement, PLACEMENTS, "bottom-end");
  const motionValue = oneOf("Toaster", "motion", motion, ["css", "none"] as const, "css");
  const toasts = useSyncExternalStore(
    (fn) => toaster.subscribe(fn),
    () => toaster.toasts,
    () => toaster.toasts,
  );
  const entriesRef = useRef<Entry[]>([]);
  entriesRef.current = reconcile(entriesRef.current, toasts);
  const entries = entriesRef.current;
  const [, rerender] = useState(0);
  const region = useRef<HTMLElement | null>(null);
  const politeRef = useRef<HTMLDivElement | null>(null);
  const alertRef = useRef<HTMLDivElement | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [owner] = useState(() => Symbol("toaster"));

  // Announcement ownership: the first mounted Toaster of a store announces; the next takes over on unmount.
  useEffect(() => {
    const state = announcementState(toaster);
    state.owners.push(owner);
    return () => {
      state.owners = state.owners.filter((o) => o !== owner);
    };
  }, [toaster, owner]);

  // Announce each toast (and each re-show of an id) exactly once per store, by inserting text into a region that
  // already exists.
  useEffect(() => {
    const state = announcementState(toaster);
    if (state.owners[0] !== owner) return;
    for (const toast of toasts) {
      if (state.announced.get(toast.id) === toast.version) continue;
      state.announced.set(toast.id, toast.version);
      const target = toast.tone === "error" ? alertRef.current : politeRef.current;
      if (!target) continue;
      const line = target.ownerDocument.createElement("p");
      line.textContent = toast.description ? `${toast.title}. ${toast.description}` : toast.title;
      target.appendChild(line);
      setTimeout(() => line.remove(), 7000);
    }
    for (const id of [...state.announced.keys()])
      if (!toasts.some((toast) => toast.id === id)) state.announced.delete(id);
  }, [toasts, toaster, owner]);

  // Hidden page pauses the timers; the hotkey moves focus into the region.
  useEffect(() => {
    const onVisibility = () =>
      document.hidden ? toaster.pause("hidden") : toaster.resume("hidden");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (!hotkey || event.key !== hotkey || event.defaultPrevented) return;
      const first = region.current?.querySelector<HTMLElement>(".neshel-toast[data-state='open']");
      if (!first) return;
      event.preventDefault();
      if (!region.current?.contains(document.activeElement))
        returnFocus.current = document.activeElement as HTMLElement | null;
      first.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onKey);
      toaster.resume("hidden");
      toaster.resume("hover");
      toaster.resume("focus");
      toaster.protect(undefined);
    };
  }, [toaster, hotkey]);

  const finishExit = (id: string, generation: number) => {
    const before = entriesRef.current.length;
    entriesRef.current = entriesRef.current.filter(
      (entry) => !(entry.toast.id === id && entry.exiting && entry.generation === generation),
    );
    if (entriesRef.current.length !== before) rerender((n) => n + 1);
  };

  function close(id: string, from: HTMLElement | null): void {
    // Keep keyboard users in place: next toast, previous one, or where they came from.
    if (from && region.current?.contains(document.activeElement)) {
      const items = [
        ...region.current.querySelectorAll<HTMLElement>(".neshel-toast[data-state='open']"),
      ];
      const index = items.indexOf(from);
      const next = items[index + 1] ?? items[index - 1];
      if (next && next !== from) next.focus();
      else if (returnFocus.current?.isConnected) returnFocus.current.focus();
    }
    toaster.dismiss(id);
  }

  return (
    <section
      {...rest}
      ref={composeRefs(ref, region)}
      className={cx("neshel-toaster", className)}
      data-placement={place}
      data-motion={motionValue}
      aria-label={label}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        toaster.pause("hover");
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        toaster.resume("hover");
      }}
      onFocus={(event) => {
        onFocus?.(event);
        toaster.pause("focus");
        const item = (event.target as HTMLElement).closest?.(".neshel-toast");
        toaster.protect(item?.getAttribute("data-id") ?? undefined);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          toaster.resume("focus");
          toaster.protect(undefined);
        }
      }}
    >
      <div ref={politeRef} role="status" aria-live="polite" className="neshel-toaster-announcer" />
      <div ref={alertRef} role="alert" className="neshel-toaster-announcer" />
      <ol className="neshel-toast-list">
        {entries.map((entry) => (
          <ToastItem
            key={entry.toast.id}
            entry={entry}
            closeLabel={closeLabel}
            onClose={close}
            onExited={finishExit}
          />
        ))}
      </ol>
    </section>
  );
}

function ToastItem(props: {
  entry: Entry;
  closeLabel: string;
  onClose(id: string, from: HTMLElement | null): void;
  onExited(id: string, generation: number): void;
}) {
  const { entry, closeLabel, onClose, onExited } = props;
  const { toast, exiting, generation } = entry;
  const ref = useRef<HTMLLIElement | null>(null);
  const [entered, setEntered] = useState(false);
  const exitedRef = useRef(onExited);
  exitedRef.current = onExited;

  // Enter on the next frame so a transition runs from the `entering` state.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Exit: wait for the animations/transitions the `closing` state started (next frame), bounded.
  useEffect(() => {
    if (!exiting) return;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      exitedRef.current(toast.id, generation);
    };
    const timer = setTimeout(finish, EXIT_TIMEOUT_MS);
    // An external motion layer (Animations F06) may extend the exit: `neshel-exit` + `waitUntil(promise)`.
    const external: Promise<unknown>[] = [];
    ref.current?.dispatchEvent(
      new CustomEvent("neshel-exit", {
        bubbles: true,
        detail: { waitUntil: (promise: Promise<unknown>) => external.push(promise) },
      }),
    );
    const frame = requestAnimationFrame(() => {
      const animations = ref.current?.getAnimations?.({ subtree: true }) ?? [];
      const pending = [...animations.map((a) => a.finished), ...external];
      if (pending.length === 0) finish();
      else Promise.allSettled(pending).then(finish);
    });
    return () => {
      done = true;
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [exiting, generation, toast.id]);

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
          className={buttonClassName("Toaster", {
            variant: "outline",
            size: "sm",
            className: "neshel-toast-action",
          })}
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
        className={buttonClassName("Toaster", {
          variant: "ghost",
          size: "sm",
          iconOnly: true,
          className: "neshel-toast-close",
        })}
        aria-label={closeLabel}
        onClick={() => onClose(toast.id, ref.current)}
      >
        <CloseIcon />
      </button>
    </li>
  );
}
