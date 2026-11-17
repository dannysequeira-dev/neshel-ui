"use client";
/**
 * React bindings of the layout family (Phase 012; contracts/api-012.md §2, layout-engine.md §4–§7).
 *
 * `<LayoutGroup>` owns a layout group; every `<LayoutItem>` (and the group itself) reads the group's boxes in
 * `getSnapshotBeforeUpdate` — the commit step before DOM mutation, once per commit — and plays the group after
 * the commit, so items FLIP into their new place whichever component's state changed. Nothing renders per frame.
 */
import {
  Children,
  Component,
  createContext,
  type HTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefObject,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { DurationPreset } from "../core/defaults.js";
import type { Easing, EasingPreset } from "../core/easing.js";
import type { LayoutMode } from "../core/flip.js";
import type { ReducedMotion } from "../core/reduced-motion.js";
import { joinClass, renderHost, useHostRef } from "../react/motion-host.js";
import { useMotionPresets } from "../react/use-motion-presets.js";
import {
  autoHeight,
  type CollapseOptions,
  collapse,
  crossFade,
  flipMove,
  gridReflow,
  type LayoutTransition,
  listItem,
  type MasonryOptions,
  masonry,
  sharedLayout,
  type TabIndicatorOptions,
  tabIndicator,
} from "./effects.js";
import { createLayoutGroup, type LayoutGroup as Group } from "./engine/group.js";
import { createPresence } from "./engine/presence.js";
import { Presence, usePresence, usePresenceAppear } from "./presence.js";

const GroupContext = createContext<Group | null>(null);

/** Reads the group's boxes before each commit's DOM mutation and plays after it (internal). */
class Snapshot extends Component<{ group: Group | null }> {
  getSnapshotBeforeUpdate(): null {
    this.props.group?.snapshot();
    return null;
  }
  componentDidUpdate(): void {
    this.props.group?.play();
  }
  componentDidMount(): void {
    this.props.group?.play();
  }
  render(): null {
    return null;
  }
}

/** Owns a layout group for the items rendered inside it (L01, L03, L04). */
export class LayoutGroup extends Component<{ children?: ReactNode }> {
  // Created lazily on the client: the constructor runs on the server too, which is harmless (no DOM).
  private readonly group: Group = createLayoutGroup();
  getSnapshotBeforeUpdate(): null {
    this.group.snapshot();
    return null;
  }
  componentDidUpdate(): void {
    this.group.play();
  }
  componentWillUnmount(): void {
    this.group.destroy();
  }
  render() {
    return <GroupContext.Provider value={this.group}>{this.props.children}</GroupContext.Provider>;
  }
}

/** The nearest `<LayoutGroup>`'s group (`null` outside one): `snapshot()` / `play()` for imperative changes. */
export function useLayoutGroup(): Group | null {
  return useContext(GroupContext);
}

export interface LayoutItemOptions {
  /** Shared-layout id (L04): a new element with the same id animates from the old one's box. */
  layoutId?: string;
  layout?: LayoutMode;
  transition?: LayoutTransition;
  reducedMotion?: ReducedMotion;
}

/** Attach the FLIP effect of the nearest group to `ref` (for custom components; see `<LayoutItem>`). */
export function useLayoutItem(
  ref: RefObject<Element | null>,
  options: LayoutItemOptions = {},
): void {
  const group = useContext(GroupContext) ?? undefined;
  const { layoutId, layout, transition, reducedMotion } = options;
  useMotionPresets(ref, [
    layoutId
      ? { effect: sharedLayout, options: { group, layoutId, layout, transition, reducedMotion } }
      : { effect: flipMove, options: { group, layout, transition, reducedMotion } },
  ]);
}

export interface LayoutItemProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children">,
    LayoutItemOptions {
  /** Apply to the single child element instead of rendering a `<div>`. */
  asChild?: boolean;
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

/** An element that FLIPs to its new layout box whenever an update of its group moves or resizes it. */
export function LayoutItem(props: LayoutItemProps) {
  const {
    layoutId,
    layout,
    transition,
    reducedMotion,
    asChild = false,
    className,
    ref,
    children,
    ...rest
  } = props;
  const [element, setRef] = useHostRef(ref);
  const group = useContext(GroupContext);
  useLayoutItem(element, { layoutId, layout, transition, reducedMotion });
  return (
    <>
      <Snapshot group={group} />
      {renderHost(
        "LayoutItem",
        asChild,
        { ...rest, ref: setRef, className: joinClass("neshel-layout-item", className) },
        children,
      )}
    </>
  );
}

/* L03 ---------------------------------------------------------------------------------------------- */
export interface AnimatedListProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** List element (default `"ul"`). */
  as?: "ul" | "ol" | "div";
  /** Animate the first render's items (default false). */
  initial?: boolean;
  /** Item enter/exit duration in ms (default 240). */
  duration?: number;
  transition?: LayoutTransition;
  reducedMotion?: ReducedMotion;
  onExitComplete?: (key: string) => void;
  ref?: Ref<HTMLElement>;
  /** Keyed items, each accepting a ref. */
  children?: ReactNode;
}

function AnimatedListItem({
  duration,
  transition,
  reducedMotion,
  children,
}: {
  duration?: number;
  transition?: LayoutTransition;
  reducedMotion?: ReducedMotion;
  children: ReactElement;
}) {
  const [isPresent, safeToRemove] = usePresence();
  const appear = usePresenceAppear();
  const element = useRef<HTMLElement | null>(null);
  const group = useContext(GroupContext) ?? undefined;
  useMotionPresets(element, [
    {
      effect: listItem,
      options: { present: isPresent, appear, duration, onExited: safeToRemove, reducedMotion },
    },
    { effect: flipMove, options: { group, transition, reducedMotion } },
  ]);
  return (
    <>
      <Snapshot group={group ?? null} />
      {renderHost("AnimatedList", true, { ref: element }, children)}
    </>
  );
}

/** A list whose items enter and exit (L03) while the remaining items FLIP into place (L01). */
export function AnimatedList(props: AnimatedListProps) {
  const {
    as: Tag = "ul",
    initial,
    duration,
    transition,
    reducedMotion,
    onExitComplete,
    className,
    ref,
    children,
    ...rest
  } = props;
  return (
    <LayoutGroup>
      <Tag {...rest} ref={ref as never} className={joinClass("neshel-animated-list", className)}>
        <Presence initial={initial} onExitComplete={onExitComplete}>
          {Children.map(children, (child) =>
            isValidElement(child) ? (
              <AnimatedListItem
                key={child.key}
                duration={duration}
                transition={transition}
                reducedMotion={reducedMotion}
              >
                {child}
              </AnimatedListItem>
            ) : null,
          )}
        </Presence>
      </Tag>
    </LayoutGroup>
  );
}

/* L05 / L10 ---------------------------------------------------------------------------------------- */
type DivProps = Omit<HTMLAttributes<HTMLDivElement>, "children">;

export interface ReflowProps extends DivProps {
  transition?: LayoutTransition;
  reducedMotion?: ReducedMotion;
  asChild?: boolean;
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

/** Children animate whenever the container reflows (resize, column change, size change) — no renders. */
export function Reflow(props: ReflowProps) {
  const { transition, reducedMotion, asChild = false, className, ref, children, ...rest } = props;
  const [element, setRef] = useHostRef(ref);
  useMotionPresets(element, [{ effect: gridReflow, options: { transition, reducedMotion } }]);
  return renderHost(
    "Reflow",
    asChild,
    { ...rest, ref: setRef, className: joinClass("neshel-reflow", className) },
    children,
  );
}

export interface MasonryProps extends DivProps, MasonryOptions {
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

/** A masonry grid (row spans from observed heights) whose reflows animate (L10). Needs `layout.css`. */
export function Masonry(props: MasonryProps) {
  const {
    columns,
    minColumnWidth,
    gap,
    unit,
    transition,
    reducedMotion,
    className,
    ref,
    children,
    ...rest
  } = props;
  const [element, setRef] = useHostRef(ref);
  useMotionPresets(element, [
    { effect: masonry, options: { columns, minColumnWidth, gap, unit, transition, reducedMotion } },
  ]);
  return (
    <div {...rest} ref={setRef} className={joinClass("neshel-masonry", className)}>
      {children}
    </div>
  );
}

/* L02 / L06 ---------------------------------------------------------------------------------------- */
export interface AutoHeightProps extends DivProps {
  duration?: number | DurationPreset;
  easing?: Easing | EasingPreset;
  reducedMotion?: ReducedMotion;
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

/** A wrapper whose height follows its content smoothly (async content, text growing). */
export function AutoHeight(props: AutoHeightProps) {
  const { duration, easing, reducedMotion, className, ref, children, ...rest } = props;
  const [element, setRef] = useHostRef(ref);
  useMotionPresets(element, [{ effect: autoHeight, options: { duration, easing, reducedMotion } }]);
  return (
    <div {...rest} ref={setRef} className={joinClass("neshel-auto-height", className)}>
      <div className="neshel-auto-height-content">{children}</div>
    </div>
  );
}

export interface CollapseProps extends DivProps, Omit<CollapseOptions, "open"> {
  open: boolean;
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

/**
 * An expanding/collapsing panel (L06). Wire your trigger with `aria-expanded` and `aria-controls={id}`; the
 * closed content stays in the DOM (`hidden="until-found"` where supported). Needs `layout.css`.
 */
export function Collapse(props: CollapseProps) {
  const {
    open,
    driver,
    duration,
    easing,
    reducedMotion,
    onRequestOpen,
    className,
    ref,
    children,
    ...rest
  } = props;
  const [element, setRef] = useHostRef(ref);
  // Server/hydration markup reflects the initial state; afterwards the effect owns these attributes.
  const [initial] = useState(open);
  useMotionPresets(element, [
    { effect: collapse, options: { open, driver, duration, easing, reducedMotion, onRequestOpen } },
  ]);
  return (
    <div
      {...rest}
      ref={setRef}
      className={joinClass("neshel-collapse", className)}
      data-state={initial ? "open" : "closed"}
      hidden={initial ? undefined : ("until-found" as unknown as boolean)}
    >
      <div className="neshel-collapse-content">{children}</div>
    </div>
  );
}

/* L07 ---------------------------------------------------------------------------------------------- */
export interface TabIndicatorProps extends DivProps, TabIndicatorOptions {
  /** Apply to your tab list element instead of rendering a `<div>`. */
  asChild?: boolean;
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

/** A sliding indicator under the active tab (package-rendered layer; CSS transition on it only). */
export function TabIndicator(props: TabIndicatorProps) {
  const {
    active,
    orientation,
    duration,
    easing,
    reducedMotion,
    asChild = false,
    className,
    ref,
    children,
    ...rest
  } = props;
  const [element, setRef] = useHostRef(ref);
  useMotionPresets(element, [
    { effect: tabIndicator, options: { active, orientation, duration, easing, reducedMotion } },
  ]);
  return renderHost(
    "TabIndicator",
    asChild,
    { ...rest, ref: setRef, className: joinClass("neshel-tabs", className) },
    children,
  );
}

/* L09 ---------------------------------------------------------------------------------------------- */
export interface CrossFadeProps extends DivProps {
  /** Change it to swap the content (old and new cross-fade while the height follows). */
  swapKey: string | number;
  duration?: number;
  reducedMotion?: ReducedMotion;
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

function CrossFadeLayer({
  visible,
  appear,
  duration,
  reducedMotion,
  onHidden,
  children,
}: {
  visible: boolean;
  appear: boolean;
  duration?: number;
  reducedMotion?: ReducedMotion;
  onHidden: () => void;
  children?: ReactNode;
}) {
  const element = useRef<HTMLDivElement | null>(null);
  const [first] = useState(appear);
  useMotionPresets(element, [
    { effect: crossFade, options: { visible, appear: first, duration, reducedMotion, onHidden } },
  ]);
  return (
    <div
      ref={element}
      className="neshel-crossfade-layer"
      aria-hidden={visible ? undefined : true}
      inert={visible ? undefined : true}
    >
      {children}
    </div>
  );
}

/** Content cross-fade swap (L09): old and new content overlap in one grid cell; the height follows (L02). */
export function CrossFade(props: CrossFadeProps) {
  const { swapKey, duration, reducedMotion, className, ref, children, ...rest } = props;
  const [presence] = useState(() => createPresence<ReactNode>());
  const [, setTick] = useState(0);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);
  presence.update([{ key: String(swapKey), value: children }]);
  // Layers created after the first commit fade in (StrictMode-safe: set in an effect, read in render).
  const appear = mounted.current;
  return (
    <AutoHeight
      {...rest}
      ref={ref}
      reducedMotion={reducedMotion}
      className={joinClass("neshel-crossfade", className)}
    >
      <div className="neshel-crossfade-stack">
        {presence.entries.map((entry) => (
          <CrossFadeLayer
            key={entry.key}
            visible={entry.status === "present"}
            appear={appear}
            duration={duration}
            reducedMotion={reducedMotion}
            onHidden={() => {
              if (presence.remove(entry.key, entry.generation)) setTick((n) => n + 1);
            }}
          >
            {entry.value}
          </CrossFadeLayer>
        ))}
      </div>
    </AutoHeight>
  );
}
