"use client";
/**
 * Accordion (feature 017, contracts/disclosure-api.md) on Base UI Accordion (ADR 0012; research R3 — no new
 * dependency). String values; Base UI parts and event details are not exposed. Headers are real headings
 * (`headingLevel`, default 3) wrapping a native button with `aria-expanded`/`aria-controls`; panels are labelled
 * regions. Keyboard: Enter/Space toggle (native button); ArrowDown/ArrowUp/Home/End move between the headers of
 * the same accordion (WAI-ARIA accordion pattern, optional keys — Base UI 1.9 dropped them, Neshel keeps them).
 * The optional height transition uses `--accordion-panel-height` and stops under reduced motion.
 */
import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import {
  createContext,
  createElement,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  useContext,
  useState,
} from "react";
import { componentsError } from "./internal/errors.js";
import { ChevronDownIcon } from "./internal/icons.js";
import { asChildElement } from "./internal/slot.js";
import { cx } from "./internal/validate.js";

type DivProps = Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange" | "dir">;

interface AccordionCommonProps extends DivProps {
  /** Disable every item. */
  disabled?: boolean;
  /** Heading level of the item headers (2–6, default 3). */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Keep closed panels in the DOM (hidden). */
  keepMounted?: boolean;
  /** Closed panels use `hidden="until-found"` so in-page search can open them (implies keepMounted). */
  hiddenUntilFound?: boolean;
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

export interface AccordionSingleProps extends AccordionCommonProps {
  /** One open item at most (default). */
  type?: "single";
  /** Controlled open item (`null` = none). */
  value?: string | null;
  /** Initially open item when uncontrolled. */
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  /** Whether the open item can be closed again (default false). */
  collapsible?: boolean;
}

export interface AccordionMultipleProps extends AccordionCommonProps {
  /** Any number of open items. */
  type: "multiple";
  /** Controlled open items. */
  value?: readonly string[];
  /** Initially open items when uncontrolled. */
  defaultValue?: readonly string[];
  onValueChange?: (value: string[]) => void;
}

export type AccordionProps = AccordionSingleProps | AccordionMultipleProps;

export interface AccordionItemProps extends DivProps {
  /** Unique value of the item within its accordion. */
  value: string;
  disabled?: boolean;
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

export interface AccordionTriggerProps
  extends Omit<HTMLAttributes<HTMLButtonElement>, "onChange" | "dir"> {
  /** Render the single child element as the trigger (it must render a `<button>`). */
  asChild?: boolean;
  ref?: Ref<HTMLButtonElement>;
  children?: ReactNode;
}

export interface AccordionContentProps extends DivProps {
  /** Overrides the accordion's `keepMounted` for this panel. */
  keepMounted?: boolean;
  /** Overrides the accordion's `hiddenUntilFound` for this panel. */
  hiddenUntilFound?: boolean;
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

const LevelContext = createContext<number>(3);
const LEVELS = [2, 3, 4, 5, 6];

function useControllable<T>(value: T | undefined, defaultValue: T, onChange?: (next: T) => void) {
  const [inner, setInner] = useState(defaultValue);
  const controlled = value !== undefined;
  return [
    controlled ? (value as T) : inner,
    (next: T) => {
      if (!controlled) setInner(next);
      onChange?.(next);
    },
  ] as const;
}

/** Moves focus between the headers of this accordion (nested accordions keep their own). */
function onHeaderKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
  const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
  if (!keys.includes(event.key) || event.defaultPrevented) return;
  const root = event.currentTarget;
  const target = event.target as HTMLElement;
  if (!target.matches?.(".neshel-accordion-trigger")) return;
  if (target.closest(".neshel-accordion") !== root) return;
  const triggers = [...root.querySelectorAll<HTMLElement>(".neshel-accordion-trigger")].filter(
    (trigger) =>
      trigger.closest(".neshel-accordion") === root &&
      !trigger.hasAttribute("disabled") &&
      trigger.getAttribute("aria-disabled") !== "true",
  );
  const index = triggers.indexOf(target);
  if (index < 0 || triggers.length === 0) return;
  const next =
    event.key === "Home"
      ? triggers[0]
      : event.key === "End"
        ? triggers[triggers.length - 1]
        : triggers[
            (index + (event.key === "ArrowDown" ? 1 : -1) + triggers.length) % triggers.length
          ];
  event.preventDefault();
  next?.focus();
}

export function Accordion(props: AccordionProps) {
  const {
    type,
    value,
    defaultValue,
    onValueChange,
    disabled,
    headingLevel = 3,
    keepMounted,
    hiddenUntilFound,
    className,
    onKeyDown,
    ref,
    children,
    ...rest
  } = props as AccordionCommonProps & {
    type?: string;
    value?: unknown;
    defaultValue?: unknown;
    onValueChange?: (value: never) => void;
    collapsible?: boolean;
  };
  const multiple = type === "multiple";
  if (type !== undefined && type !== "single" && type !== "multiple")
    throw componentsError(
      "Accordion",
      `invalid value ${JSON.stringify(type)} for "type"; expected "single" or "multiple".`,
    );
  if (!LEVELS.includes(headingLevel))
    throw componentsError(
      "Accordion",
      `invalid value ${JSON.stringify(headingLevel)} for "headingLevel"; expected 2–6.`,
    );
  const collapsible = !multiple && (props as AccordionSingleProps).collapsible === true;
  delete (rest as { collapsible?: unknown }).collapsible;

  const toList = (input: unknown): string[] =>
    multiple
      ? [...((input as readonly string[] | undefined) ?? [])]
      : input == null
        ? []
        : [input as string];
  const [current, setCurrent] = useControllable<string[]>(
    value === undefined ? undefined : toList(value),
    toList(defaultValue),
    (next) => {
      const callback = onValueChange as ((value: unknown) => void) | undefined;
      callback?.(multiple ? next : (next[0] ?? null));
    },
  );

  return (
    <LevelContext.Provider value={headingLevel}>
      <BaseAccordion.Root
        {...rest}
        ref={ref}
        className={cx("neshel-accordion", className)}
        multiple={multiple}
        disabled={disabled}
        keepMounted={keepMounted}
        hiddenUntilFound={hiddenUntilFound}
        value={current}
        onValueChange={(next) => {
          const list = (next as unknown[]).map(String);
          // Single and not collapsible: the open item stays open when its header is activated again.
          if (!multiple && !collapsible && list.length === 0 && current.length > 0) return;
          setCurrent(multiple ? list : list.slice(-1));
        }}
        onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
          onKeyDown?.(event);
          onHeaderKeyDown(event);
        }}
      >
        {children}
      </BaseAccordion.Root>
    </LevelContext.Provider>
  );
}

export function AccordionItem({
  value,
  disabled,
  className,
  ref,
  children,
  ...rest
}: AccordionItemProps) {
  if (typeof value !== "string" || value === "")
    throw componentsError("AccordionItem", '"value" must be a non-empty string.');
  return (
    <BaseAccordion.Item
      {...rest}
      ref={ref}
      value={value}
      disabled={disabled}
      className={cx("neshel-accordion-item", className)}
    >
      {children}
    </BaseAccordion.Item>
  );
}

export function AccordionTrigger({
  asChild,
  className,
  ref,
  children,
  ...rest
}: AccordionTriggerProps) {
  const level = useContext(LevelContext);
  const child = asChild ? asChildElement("AccordionTrigger", children) : undefined;
  return (
    <BaseAccordion.Header
      className="neshel-accordion-header"
      render={(headerProps) => createElement(`h${level}`, headerProps)}
    >
      <BaseAccordion.Trigger
        {...rest}
        ref={ref}
        className={cx("neshel-accordion-trigger", className)}
        render={child}
      >
        {child ? undefined : (
          <>
            <span className="neshel-accordion-trigger-label">{children}</span>
            <ChevronDownIcon className="neshel-chevron neshel-accordion-chevron" />
          </>
        )}
      </BaseAccordion.Trigger>
    </BaseAccordion.Header>
  );
}

export function AccordionContent({
  keepMounted,
  hiddenUntilFound,
  className,
  ref,
  children,
  ...rest
}: AccordionContentProps) {
  return (
    <BaseAccordion.Panel
      {...rest}
      ref={ref}
      keepMounted={keepMounted}
      hiddenUntilFound={hiddenUntilFound}
      className={cx("neshel-accordion-content", className)}
    >
      <div className="neshel-accordion-content-inner">{children}</div>
    </BaseAccordion.Panel>
  );
}
