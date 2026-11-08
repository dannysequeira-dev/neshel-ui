"use client";
/**
 * Dialog (FR-050) and Sheet (FR-058) on Radix Dialog (ADR 0012). Portals keep the trigger's theme
 * and host selection popups (ADR 0014, contracts/shell-and-overlays.md).
 */
import * as RadixDialog from "@radix-ui/react-dialog";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import { buttonClassName } from "./button.js";
import { CloseIcon } from "./internal/icons.js";
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

type RootProps = RadixDialog.DialogProps;
type ContentBase = Omit<RadixDialog.DialogContentProps, "ref"> & {
  /** Portal target (default `document.body`, wrapped with the trigger's theme). */
  container?: HTMLElement | null;
  /** Render a close button with an accessible label (default true). */
  showClose?: boolean;
  /** Accessible name of the close button (default "Close"). */
  closeLabel?: string;
  ref?: Ref<HTMLDivElement>;
};

export type DialogProps = RootProps;
export type DialogTriggerProps = RadixDialog.DialogTriggerProps & { ref?: Ref<HTMLButtonElement> };
export type DialogCloseProps = RadixDialog.DialogCloseProps & { ref?: Ref<HTMLButtonElement> };
export type DialogTitleProps = RadixDialog.DialogTitleProps & { ref?: Ref<HTMLHeadingElement> };
export type DialogDescriptionProps = RadixDialog.DialogDescriptionProps & {
  ref?: Ref<HTMLParagraphElement>;
};
export type DialogSize = "sm" | "md" | "lg" | "xl" | "full";
export type DialogContentProps = ContentBase & { size?: DialogSize };
export type SheetSide = "left" | "right" | "top" | "bottom";
export type SheetContentProps = ContentBase & { side?: SheetSide; size?: "sm" | "md" | "lg" };
export interface DialogPartProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

const DIALOG_SIZES: readonly DialogSize[] = ["sm", "md", "lg", "xl", "full"];
const SIDES: readonly SheetSide[] = ["left", "right", "top", "bottom"];

function checkAsChild(component: string, asChild: unknown, children: ReactNode): void {
  if (asChild) asChildElement(component, children);
}

/** Root shared by Dialog and Sheet: registers the trigger for portal theming. */
function DialogRoot(props: RootProps) {
  const registry = useTriggerRegistry();
  return (
    <TriggerContext.Provider value={registry}>
      <RadixDialog.Root {...props} />
    </TriggerContext.Provider>
  );
}

function TriggerPart({ component, ref, ...props }: DialogTriggerProps & { component: string }) {
  checkAsChild(component, props.asChild, props.children);
  const triggerRef = useTriggerRef(ref);
  return <RadixDialog.Trigger {...props} ref={triggerRef} />;
}

function ClosePart({
  component,
  ref,
  className,
  ...props
}: DialogCloseProps & { component: string }) {
  checkAsChild(component, props.asChild, props.children);
  return (
    <RadixDialog.Close
      {...props}
      ref={ref}
      className={
        props.asChild
          ? className
          : cx(buttonClassName(component, { variant: "outline" }), className)
      }
    />
  );
}

interface PanelOptions {
  component: string;
  classes: string;
}

function PanelPart({
  component,
  classes,
  container,
  showClose = true,
  closeLabel = "Close",
  className,
  children,
  onEscapeKeyDown,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ref,
  ...rest
}: ContentBase & PanelOptions) {
  const [node, setNode] = useLayerContainer();
  const focus = useFocusReturn(onOpenAutoFocus, onCloseAutoFocus);
  return (
    <RadixDialog.Portal container={container ?? undefined}>
      <PortalTheme>
        <RadixDialog.Overlay className="neshel-overlay" />
        <RadixDialog.Content
          {...rest}
          ref={composeRefs(ref, setNode)}
          onEscapeKeyDown={guardEscape(onEscapeKeyDown)}
          onOpenAutoFocus={focus.onOpenAutoFocus}
          onCloseAutoFocus={focus.onCloseAutoFocus}
          className={cx(classes, className)}
        >
          <LayerContainerContext.Provider value={node}>
            {children}
            {showClose ? (
              <RadixDialog.Close
                className={buttonClassName(component, {
                  variant: "ghost",
                  size: "sm",
                  iconOnly: true,
                  className: "neshel-dialog-close",
                })}
                aria-label={closeLabel}
              >
                <CloseIcon />
              </RadixDialog.Close>
            ) : null}
          </LayerContainerContext.Provider>
        </RadixDialog.Content>
      </PortalTheme>
    </RadixDialog.Portal>
  );
}

export function DialogHeader({ className, ...rest }: DialogPartProps) {
  return <div {...rest} className={cx("neshel-dialog-header", className)} />;
}
export function DialogBody({ className, ...rest }: DialogPartProps) {
  return <div {...rest} className={cx("neshel-dialog-body", className)} />;
}
export function DialogFooter({ className, ...rest }: DialogPartProps) {
  return <div {...rest} className={cx("neshel-dialog-footer", className)} />;
}

// ---------------------------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------------------------

/** Modal dialog root (`open` / `defaultOpen` / `onOpenChange`, `modal`). */
export function Dialog(props: DialogProps) {
  return <DialogRoot {...props} />;
}
export function DialogTrigger(props: DialogTriggerProps) {
  return <TriggerPart component="DialogTrigger" {...props} />;
}
export function DialogClose(props: DialogCloseProps) {
  return <ClosePart component="DialogClose" {...props} />;
}
export function DialogContent({ size, ...props }: DialogContentProps) {
  const value = oneOf("DialogContent", "size", size, DIALOG_SIZES, "md");
  return (
    <PanelPart
      component="DialogContent"
      classes={`neshel-dialog-content neshel-dialog-size-${value}`}
      {...props}
    />
  );
}
export function DialogTitle({ className, ...props }: DialogTitleProps) {
  return <RadixDialog.Title {...props} className={cx("neshel-dialog-title", className)} />;
}
export function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return (
    <RadixDialog.Description {...props} className={cx("neshel-dialog-description", className)} />
  );
}

// ---------------------------------------------------------------------------------------------
// Sheet
// ---------------------------------------------------------------------------------------------

export type SheetProps = DialogProps;
export type SheetTriggerProps = DialogTriggerProps;
export type SheetCloseProps = DialogCloseProps;
export type SheetTitleProps = DialogTitleProps;
export type SheetDescriptionProps = DialogDescriptionProps;

/** Edge-positioned dialog (drawer). No drag gestures. */
export function Sheet(props: SheetProps) {
  return <DialogRoot {...props} />;
}
export function SheetTrigger(props: SheetTriggerProps) {
  return <TriggerPart component="SheetTrigger" {...props} />;
}
export function SheetClose(props: SheetCloseProps) {
  return <ClosePart component="SheetClose" {...props} />;
}
export function SheetContent({ side, size, ...props }: SheetContentProps) {
  const sideValue = oneOf("SheetContent", "side", side, SIDES, "right");
  const sizeValue = oneOf("SheetContent", "size", size, ["sm", "md", "lg"] as const, "md");
  return (
    <PanelPart
      component="SheetContent"
      classes={`neshel-sheet-content neshel-sheet-side-${sideValue} neshel-sheet-size-${sizeValue}`}
      {...props}
    />
  );
}
export const SheetHeader = DialogHeader;
export const SheetBody = DialogBody;
export const SheetFooter = DialogFooter;
export function SheetTitle(props: SheetTitleProps) {
  return <DialogTitle {...props} />;
}
export function SheetDescription(props: SheetDescriptionProps) {
  return <DialogDescription {...props} />;
}
