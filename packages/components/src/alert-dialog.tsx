"use client";
/**
 * AlertDialog (FR-055) on Radix Alert Dialog: explicit Cancel and Action, initial focus on Cancel,
 * no dismissal by outside press; Escape cancels.
 */
import * as RadixAlert from "@radix-ui/react-alert-dialog";
import type { HTMLAttributes, Ref } from "react";
import { type ButtonSize, type ButtonVariant, buttonClassName } from "./button.js";
import {
  composeRefs,
  guardEscape,
  LayerContainerContext,
  PortalTheme,
  TriggerContext,
  useFocusReturn,
  useLayerContainer,
  useTriggerRef,
  useTriggerRegistry,
} from "./internal/layer.js";
import { asChildElement } from "./internal/slot.js";
import { cx, oneOf } from "./internal/validate.js";
import type { Responsive } from "./types.js";

export type AlertDialogProps = RadixAlert.AlertDialogProps;
export type AlertDialogTriggerProps = RadixAlert.AlertDialogTriggerProps & {
  ref?: Ref<HTMLButtonElement>;
};
export type AlertDialogContentProps = Omit<RadixAlert.AlertDialogContentProps, "ref"> & {
  /** Maximum width (default `"sm"`). */
  size?: "sm" | "md" | "lg";
  /** Portal target (default `document.body`, wrapped with the trigger's theme). */
  container?: HTMLElement | null;
  ref?: Ref<HTMLDivElement>;
};
type ButtonLike = {
  /** Button style (Action default `"primary"`, Cancel default `"outline"`). */
  variant?: ButtonVariant;
  /** Button size, static or per breakpoint (default `"md"`). */
  size?: Responsive<ButtonSize>;
  ref?: Ref<HTMLButtonElement>;
};
export type AlertDialogActionProps = RadixAlert.AlertDialogActionProps & ButtonLike;
export type AlertDialogCancelProps = RadixAlert.AlertDialogCancelProps & ButtonLike;
export type AlertDialogTitleProps = RadixAlert.AlertDialogTitleProps & {
  ref?: Ref<HTMLHeadingElement>;
};
export type AlertDialogDescriptionProps = RadixAlert.AlertDialogDescriptionProps & {
  ref?: Ref<HTMLParagraphElement>;
};
export interface AlertDialogPartProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

export function AlertDialog(props: AlertDialogProps) {
  const registry = useTriggerRegistry();
  return (
    <TriggerContext.Provider value={registry}>
      <RadixAlert.Root {...props} />
    </TriggerContext.Provider>
  );
}

export function AlertDialogTrigger({ ref, ...props }: AlertDialogTriggerProps) {
  if (props.asChild) asChildElement("AlertDialogTrigger", props.children);
  const triggerRef = useTriggerRef(ref);
  return <RadixAlert.Trigger {...props} ref={triggerRef} />;
}

export function AlertDialogContent({
  size,
  container,
  className,
  children,
  onEscapeKeyDown,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ref,
  ...rest
}: AlertDialogContentProps) {
  const focus = useFocusReturn(onOpenAutoFocus, onCloseAutoFocus);
  const value = oneOf("AlertDialogContent", "size", size, ["sm", "md", "lg"] as const, "sm");
  const [node, setNode] = useLayerContainer();
  return (
    <RadixAlert.Portal container={container ?? undefined}>
      <PortalTheme>
        <RadixAlert.Overlay className="neshel-overlay" />
        <RadixAlert.Content
          {...rest}
          ref={composeRefs(ref, setNode)}
          onEscapeKeyDown={guardEscape(onEscapeKeyDown)}
          onOpenAutoFocus={focus.onOpenAutoFocus}
          onCloseAutoFocus={focus.onCloseAutoFocus}
          className={cx("neshel-dialog-content", `neshel-dialog-size-${value}`, className)}
        >
          <LayerContainerContext.Provider value={node}>{children}</LayerContainerContext.Provider>
        </RadixAlert.Content>
      </PortalTheme>
    </RadixAlert.Portal>
  );
}

export function AlertDialogHeader({ className, ...rest }: AlertDialogPartProps) {
  return <div {...rest} className={cx("neshel-dialog-header", className)} />;
}
export function AlertDialogFooter({ className, ...rest }: AlertDialogPartProps) {
  return <div {...rest} className={cx("neshel-dialog-footer", className)} />;
}
export function AlertDialogTitle({ className, ...props }: AlertDialogTitleProps) {
  return <RadixAlert.Title {...props} className={cx("neshel-dialog-title", className)} />;
}
export function AlertDialogDescription({ className, ...props }: AlertDialogDescriptionProps) {
  return (
    <RadixAlert.Description {...props} className={cx("neshel-dialog-description", className)} />
  );
}

/** Confirms the action (default variant `primary`; use `destructive` for destructive actions). */
export function AlertDialogAction({ variant, size, className, ...props }: AlertDialogActionProps) {
  if (props.asChild) asChildElement("AlertDialogAction", props.children);
  return (
    <RadixAlert.Action
      {...props}
      className={buttonClassName("AlertDialogAction", {
        variant: variant ?? "primary",
        size,
        className,
      })}
    />
  );
}

/** Cancels; receives initial focus (default variant `outline`). */
export function AlertDialogCancel({ variant, size, className, ...props }: AlertDialogCancelProps) {
  if (props.asChild) asChildElement("AlertDialogCancel", props.children);
  return (
    <RadixAlert.Cancel
      {...props}
      className={buttonClassName("AlertDialogCancel", {
        variant: variant ?? "outline",
        size,
        className,
      })}
    />
  );
}
