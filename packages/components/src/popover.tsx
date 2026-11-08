"use client";
/** Popover (FR-060) and Tooltip (FR-040) on Radix, with theme-preserving portals. */
import * as RadixPopover from "@radix-ui/react-popover";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import type { Ref } from "react";
import {
  composeRefs,
  guardEscape,
  LayerContainerContext,
  PortalTheme,
  TriggerContext,
  useLayerContainer,
  useTriggerRef,
  useTriggerRegistry,
} from "./internal/layer.js";
import { asChildElement } from "./internal/slot.js";
import { cx } from "./internal/validate.js";

// ---------------------------------------------------------------------------------------------
// Popover
// ---------------------------------------------------------------------------------------------

export type PopoverProps = RadixPopover.PopoverProps;
export type PopoverTriggerProps = RadixPopover.PopoverTriggerProps & {
  ref?: Ref<HTMLButtonElement>;
};
export type PopoverAnchorProps = RadixPopover.PopoverAnchorProps & { ref?: Ref<HTMLDivElement> };
export type PopoverCloseProps = RadixPopover.PopoverCloseProps & { ref?: Ref<HTMLButtonElement> };
export type PopoverContentProps = Omit<RadixPopover.PopoverContentProps, "ref"> & {
  container?: HTMLElement | null;
  ref?: Ref<HTMLDivElement>;
};

export function Popover(props: PopoverProps) {
  const registry = useTriggerRegistry();
  return (
    <TriggerContext.Provider value={registry}>
      <RadixPopover.Root {...props} />
    </TriggerContext.Provider>
  );
}

export function PopoverTrigger({ ref, ...props }: PopoverTriggerProps) {
  if (props.asChild) asChildElement("PopoverTrigger", props.children);
  const triggerRef = useTriggerRef(ref);
  return <RadixPopover.Trigger {...props} ref={triggerRef} />;
}

export function PopoverAnchor(props: PopoverAnchorProps) {
  return <RadixPopover.Anchor {...props} />;
}

export function PopoverClose(props: PopoverCloseProps) {
  if (props.asChild) asChildElement("PopoverClose", props.children);
  return <RadixPopover.Close {...props} />;
}

export function PopoverContent({
  container,
  className,
  children,
  sideOffset = 6,
  collisionPadding = 8,
  onEscapeKeyDown,
  ref,
  ...rest
}: PopoverContentProps) {
  const [node, setNode] = useLayerContainer();
  return (
    <RadixPopover.Portal container={container ?? undefined}>
      <PortalTheme>
        <RadixPopover.Content
          {...rest}
          ref={composeRefs(ref, setNode)}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          onEscapeKeyDown={guardEscape(onEscapeKeyDown)}
          className={cx("neshel-popover-content", className)}
        >
          <LayerContainerContext.Provider value={node}>{children}</LayerContainerContext.Provider>
        </RadixPopover.Content>
      </PortalTheme>
    </RadixPopover.Portal>
  );
}

// ---------------------------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------------------------

export type TooltipProps = RadixTooltip.TooltipProps & {
  /** Hover delay in ms (default 300). */
  delayDuration?: number;
};
export type TooltipTriggerProps = RadixTooltip.TooltipTriggerProps & {
  ref?: Ref<HTMLButtonElement>;
};
export type TooltipContentProps = Omit<RadixTooltip.TooltipContentProps, "ref"> & {
  container?: HTMLElement | null;
  ref?: Ref<HTMLDivElement>;
};

/** Supplementary text on hover and focus; never the only accessible name. No Provider needed. */
export function Tooltip({ delayDuration = 300, ...props }: TooltipProps) {
  const registry = useTriggerRegistry();
  return (
    <TriggerContext.Provider value={registry}>
      <RadixTooltip.Provider delayDuration={delayDuration}>
        <RadixTooltip.Root {...props} />
      </RadixTooltip.Provider>
    </TriggerContext.Provider>
  );
}

export function TooltipTrigger({ ref, ...props }: TooltipTriggerProps) {
  if (props.asChild) asChildElement("TooltipTrigger", props.children);
  const triggerRef = useTriggerRef(ref);
  return <RadixTooltip.Trigger {...props} ref={triggerRef} />;
}

export function TooltipContent({
  container,
  className,
  sideOffset = 6,
  ...rest
}: TooltipContentProps) {
  return (
    <RadixTooltip.Portal container={container ?? undefined}>
      <PortalTheme>
        <RadixTooltip.Content
          {...rest}
          sideOffset={sideOffset}
          className={cx("neshel-tooltip", className)}
        />
      </PortalTheme>
    </RadixTooltip.Portal>
  );
}
