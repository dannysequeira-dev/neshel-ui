"use client";
/**
 * L08 — `<Presence>`: exit before unmount (Phase 012; contracts/layout-engine.md §7, research R8–R9).
 *
 * Keyed children are merged by the framework-free presence state machine during render; a removed child stays
 * rendered in place while it exits (inert, hidden from assistive technology, focus moved to a present sibling),
 * then it is removed. Enter/exit run the consumer's Entrance definitions/presets (passed as values; Entrance
 * `continuous` makes re-entry continue from where the exit is) or the built-in cross-fade layer. A watchdog and
 * a hidden page force completion, so no exiting element stays mounted indefinitely. Children are rendered
 * through Radix Slot: no wrapper element is added (a `<li>` stays a child of its `<ul>`).
 */
import { Slot } from "@radix-ui/react-slot";
import {
  Children,
  createContext,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { attachEffect, type EffectHandle } from "../core/effect.js";
import { pageHidden, watchVisibility } from "../core/interaction.js";
import { type PresetInput, resolvePreset } from "../core/preset.js";
import { crossFade } from "./effects.js";
import { counters } from "./engine/debug.js";
import { createPresence, type PresenceEntry } from "./engine/presence.js";

// biome-ignore lint/suspicious/noExplicitAny: presets of any option types.
type AnyPreset = PresetInput<any, any>;

interface ItemContextValue {
  readonly isPresent: boolean;
  /** Whether the item mounted after its `<Presence>` (it should animate its entrance). */
  readonly appear: boolean;
  safeToRemove(): void;
  /** A child taking over its own exit registers; returns the unregister function. */
  register(): () => void;
}

const PresenceItemContext = createContext<ItemContextValue | null>(null);

/** `[isPresent, safeToRemove]` for a custom child of `<Presence>`; `[true, noop]` outside one. */
export function usePresence(): [boolean, () => void] {
  const context = useContext(PresenceItemContext);
  useLayoutEffect(() => context?.register(), [context]);
  return context ? [context.isPresent, context.safeToRemove] : [true, noop];
}

/** Whether this component is present (`false` while it exits). */
export function useIsPresent(): boolean {
  return useContext(PresenceItemContext)?.isPresent ?? true;
}

/** Internal: the item's appear flag (AnimatedList). */
export function usePresenceAppear(): boolean {
  return useContext(PresenceItemContext)?.appear ?? false;
}

const noop = () => {};

export interface PresenceProps {
  /**
   * Keyed elements rendered without a wrapper. Each must accept a ref that reaches its DOM element (host
   * elements do; components must forward `ref`), so exiting content can be made inert and lose focus.
   */
  children?: ReactNode;
  /** Entrance definition or preset for entering children (default: the built-in fade). */
  enter?: AnyPreset;
  /** Entrance definition or preset for exiting children (default: the built-in fade). */
  exit?: AnyPreset;
  /** Animate the children of the first render too (default false: server/hydrated content stays visible). */
  initial?: boolean;
  /** Built-in fade duration in ms (default 220). */
  duration?: number;
  /** Called once per removed key, after its exit. */
  onExitComplete?: (key: string) => void;
  /** Focus target when focus was inside an exiting child and no present sibling can take it. */
  focusFallback?: RefObject<HTMLElement | null>;
}

export function Presence(props: PresenceProps) {
  const { children, initial = false } = props;
  const [presence] = useState(() => createPresence<ReactElement>());
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const committed = useRef(false);
  useEffect(() => {
    committed.current = true;
    return () => {
      committed.current = false;
    };
  }, []);
  const next: Array<{ key: string; value: ReactElement }> = [];
  Children.forEach(children, (child) => {
    if (isValidElement(child)) next.push({ key: String(child.key ?? next.length), value: child });
  });
  presence.update(next);
  const latest = useRef(props);
  latest.current = props;
  return (
    <>
      {presence.entries.map((entry) => (
        <PresenceItem
          key={entry.key}
          entry={entry}
          appear={committed.current || initial}
          settings={latest}
          onExited={(generation) => {
            if (!presence.remove(entry.key, generation)) return;
            latest.current.onExitComplete?.(entry.key);
            rerender();
          }}
        />
      ))}
    </>
  );
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function focusTarget(from: Element, fallback: HTMLElement | null | undefined): HTMLElement | null {
  const usable = (node: Element | null): HTMLElement | null => {
    if (!node || node.getAttribute("data-neshel-presence") === "exiting") return null;
    if (node.matches(FOCUSABLE)) return node as HTMLElement;
    return node.querySelector(FOCUSABLE);
  };
  for (let node = from.nextElementSibling; node; node = node.nextElementSibling) {
    const found = usable(node);
    if (found) return found;
  }
  for (let node = from.previousElementSibling; node; node = node.previousElementSibling) {
    const found = usable(node);
    if (found) return found;
  }
  return fallback ?? null;
}

interface ItemProps {
  entry: PresenceEntry<ReactElement>;
  appear: boolean;
  settings: { current: PresenceProps };
  onExited(generation: number): void;
}

function PresenceItem({ entry, appear, settings, onExited }: ItemProps) {
  const element = useRef<HTMLElement | null>(null);
  const [shouldAppear] = useState(appear);
  const custom = useRef(0);
  // The attached effect and the options it was attached with (re-entry reverses it with its own options).
  const handle = useRef<
    { handle: EffectHandle<unknown>; effect: unknown; options: object } | undefined
  >(undefined);
  // Accessibility state of the element before Presence marked it exiting (restored on re-entry).
  const before = useRef<{ ariaHidden: string | null; inert: boolean } | undefined>(undefined);
  const finished = useRef(new Set<number>());
  const exited = useRef(onExited);
  exited.current = onExited;
  const isPresent = entry.status === "present";
  // Latest props of the child (consumer accessibility state to restore on re-entry).
  const latestProps = useRef<Record<string, unknown>>({});
  latestProps.current = (entry.value.props ?? {}) as Record<string, unknown>;
  const generation = entry.generation;

  // Stable (refs only): completes the exit of one generation once.
  const finish = useCallback((gen: number) => {
    if (finished.current.has(gen)) return;
    finished.current.add(gen);
    exited.current(gen);
  }, []);

  // Attach the enter effect once (destroyed with the item).
  useLayoutEffect(() => {
    const node = element.current;
    if (!node || custom.current > 0) return;
    const { enter, duration } = settings.current;
    if (enter) {
      const { effect, options } = resolvePreset(enter);
      handle.current = {
        effect,
        options: (options ?? {}) as object,
        handle: attachEffect(node, effect, {
          ...(options as object),
          appear: shouldAppear,
          continuous: true,
        }),
      };
    } else {
      handle.current = {
        effect: crossFade,
        options: {},
        handle: attachEffect(node, crossFade, {
          visible: true,
          appear: shouldAppear,
          duration: duration ?? 220,
        }),
      };
    }
    return () => {
      handle.current?.handle.destroy();
      handle.current = undefined;
    };
  }, [settings, shouldAppear]);

  // Status changes: exit, or re-entry during an exit.
  useLayoutEffect(() => {
    const node = element.current;
    if (!node) return;
    if (isPresent) {
      if (generation === 0) return;
      node.removeAttribute("data-neshel-presence");
      // Restore the consumer's accessibility state: the latest React props win (React does not re-apply an
      // unchanged prop), otherwise the value the element had before the exit (e.g. set on the DOM).
      const props = latestProps.current;
      const saved = before.current;
      before.current = undefined;
      const ariaHidden =
        props["aria-hidden"] !== undefined && props["aria-hidden"] !== null
          ? String(props["aria-hidden"])
          : (saved?.ariaHidden ?? null);
      if (ariaHidden === null) node.removeAttribute("aria-hidden");
      else node.setAttribute("aria-hidden", ariaHidden);
      node.inert = props.inert !== undefined ? Boolean(props.inert) : (saved?.inert ?? false);
      const current = handle.current;
      const { duration } = settings.current;
      if (current && custom.current === 0) {
        if (current.effect === crossFade) {
          current.handle.update({ visible: true, duration: duration ?? 220 });
        } else {
          // Reverse the effect that is running (the exit's, or the enter's) with ITS OWN options, from the
          // current progress: continuous whatever `enter`/`exit` are, and it always ends visible.
          current.handle.update({
            ...current.options,
            playback: "in",
            replay: generation,
            continuous: true,
          });
        }
      }
      return;
    }
    // Exiting.
    const fallback = settings.current.focusFallback?.current;
    if (node.contains(document.activeElement)) focusTarget(node, fallback)?.focus();
    before.current ??= { ariaHidden: node.getAttribute("aria-hidden"), inert: node.inert === true };
    node.setAttribute("data-neshel-presence", "exiting");
    node.setAttribute("aria-hidden", "true");
    node.inert = true;
    const gen = generation;
    const done = () => finish(gen);
    const { exit, duration } = settings.current;
    let estimate = duration ?? 220;
    if (pageHidden()) {
      done();
      return;
    }
    if (custom.current === 0) {
      const current = handle.current;
      if (exit) {
        const { effect, options } = resolvePreset(exit);
        const o = (options ?? {}) as { duration?: unknown; delay?: unknown };
        estimate =
          (typeof o.duration === "number" ? o.duration : 400) +
          (typeof o.delay === "number" ? o.delay : 0);
        const exitOptions = {
          ...(options as object),
          playback: "out",
          replay: gen,
          continuous: true,
          onFinish: (status: string) => {
            if (status === "completed") done();
          },
        };
        if (current && current.effect === effect) {
          current.handle.update(exitOptions);
          current.options = (options ?? {}) as object;
        } else {
          current?.handle.destroy();
          handle.current = {
            effect,
            options: (options ?? {}) as object,
            handle: attachEffect(node, effect, { ...exitOptions, appear: true }),
          };
        }
      } else if (current && current.effect === crossFade) {
        current.handle.update({ visible: false, duration: duration ?? 220, onHidden: done });
      } else {
        // Entered with an Entrance preset, exits with the built-in fade.
        current?.handle.destroy();
        handle.current = {
          effect: crossFade,
          options: {},
          handle: attachEffect(node, crossFade, {
            visible: false,
            duration: duration ?? 220,
            onHidden: done,
          }),
        };
      }
    }
    // Watchdog: a failed, paused or throttled animation never traps the element (research R8).
    const timer = setTimeout(
      () => {
        if (!finished.current.has(gen)) counters.watchdog++;
        done();
      },
      Math.min(10_000, estimate + 1000),
    );
    const unwatch = watchVisibility(done);
    return () => {
      clearTimeout(timer);
      unwatch();
    };
  }, [isPresent, generation, settings, finish]);

  const context: ItemContextValue = {
    isPresent,
    appear: shouldAppear,
    safeToRemove: () => {
      if (!isPresent) finish(generation);
    },
    register: () => {
      custom.current++;
      return () => {
        custom.current--;
      };
    },
  };
  return (
    <PresenceItemContext.Provider value={context}>
      <Slot ref={element}>{entry.value}</Slot>
    </PresenceItemContext.Provider>
  );
}
