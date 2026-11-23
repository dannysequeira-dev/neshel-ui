"use client";
/**
 * Collapsible (feature 017, contracts/disclosure-api.md) on Base UI Collapsible (no new dependency). One trigger
 * (native button, `aria-expanded`/`aria-controls`) shows and hides one panel. Not an Accordion item: no heading,
 * no group, no value. Optional height transition through `--collapsible-panel-height`, off under reduced motion.
 */
import { Collapsible as BaseCollapsible } from "@base-ui/react/collapsible";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import { asChildElement } from "./internal/slot.js";
import { cx } from "./internal/validate.js";

type DivProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "dir">;

export interface CollapsibleProps extends DivProps {
  /** Controlled open state. */
  open?: boolean;
  /** Initial open state when uncontrolled (default false). */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Ignore user interaction (the trigger is disabled). */
  disabled?: boolean;
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

export interface CollapsibleTriggerProps
  extends Omit<HTMLAttributes<HTMLButtonElement>, "onChange" | "dir"> {
  /** Render the single child element as the trigger (it must render a `<button>`). */
  asChild?: boolean;
  ref?: Ref<HTMLButtonElement>;
  children?: ReactNode;
}

export interface CollapsibleContentProps extends DivProps {
  /** Keep the closed panel in the DOM (hidden). Default false: unmounted when closed. */
  keepMounted?: boolean;
  /** Closed panel uses `hidden="until-found"` so in-page search can open it (implies keepMounted). */
  hiddenUntilFound?: boolean;
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

export function Collapsible({
  open,
  defaultOpen,
  onOpenChange,
  disabled,
  className,
  ref,
  children,
  ...rest
}: CollapsibleProps) {
  return (
    <BaseCollapsible.Root
      {...rest}
      ref={ref}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange ? (next) => onOpenChange(next) : undefined}
      disabled={disabled}
      className={cx("neshel-collapsible", className)}
    >
      {children}
    </BaseCollapsible.Root>
  );
}

export function CollapsibleTrigger({
  asChild,
  className,
  ref,
  children,
  ...rest
}: CollapsibleTriggerProps) {
  const child = asChild ? asChildElement("CollapsibleTrigger", children) : undefined;
  return (
    <BaseCollapsible.Trigger
      {...rest}
      ref={ref}
      className={cx(child ? undefined : "neshel-collapsible-trigger", className)}
      render={child}
    >
      {child ? undefined : children}
    </BaseCollapsible.Trigger>
  );
}

export function CollapsibleContent({
  keepMounted,
  hiddenUntilFound,
  className,
  ref,
  children,
  ...rest
}: CollapsibleContentProps) {
  return (
    <BaseCollapsible.Panel
      {...rest}
      ref={ref}
      keepMounted={keepMounted}
      hiddenUntilFound={hiddenUntilFound}
      className={cx("neshel-collapsible-content", className)}
    >
      {children}
    </BaseCollapsible.Panel>
  );
}
