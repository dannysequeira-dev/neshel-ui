"use client";
/**
 * NavigationMenu (FR-093, Radix Navigation Menu: links and disclosure panels of links) and
 * DropdownMenu (FR-096, Radix Menu: commands only). Research R17.
 */
import * as RadixMenu from "@radix-ui/react-dropdown-menu";
import * as RadixNav from "@radix-ui/react-navigation-menu";
import type { HTMLAttributes, Ref } from "react";
import { CheckIcon, ChevronDownIcon, ChevronRightIcon, DotIcon } from "./internal/icons.js";
import {
  PortalTheme,
  TriggerContext,
  useTriggerRef,
  useTriggerRegistry,
} from "./internal/layer.js";
import { asChildElement } from "./internal/slot.js";
import { cx, flag, oneOf } from "./internal/validate.js";

// ---------------------------------------------------------------------------------------------
// NavigationMenu
// ---------------------------------------------------------------------------------------------

export type NavigationMenuProps = RadixNav.NavigationMenuProps & { ref?: Ref<HTMLElement> };
export type NavigationMenuListProps = RadixNav.NavigationMenuListProps & {
  ref?: Ref<HTMLUListElement>;
};
export type NavigationMenuItemProps = RadixNav.NavigationMenuItemProps & {
  ref?: Ref<HTMLLIElement>;
};
export type NavigationMenuTriggerProps = RadixNav.NavigationMenuTriggerProps & {
  ref?: Ref<HTMLButtonElement>;
};
export type NavigationMenuContentProps = RadixNav.NavigationMenuContentProps & {
  ref?: Ref<HTMLDivElement>;
};
export type NavigationMenuLinkProps = RadixNav.NavigationMenuLinkProps & {
  ref?: Ref<HTMLAnchorElement>;
};

/** Site navigation: renders a `<nav>` landmark (give it an `aria-label`). */
export function NavigationMenu({ className, ...props }: NavigationMenuProps) {
  return <RadixNav.Root {...props} className={cx("neshel-navigation-menu", className)} />;
}
export function NavigationMenuList({ className, ...props }: NavigationMenuListProps) {
  return <RadixNav.List {...props} className={cx("neshel-navigation-menu-list", className)} />;
}
export function NavigationMenuItem({ className, ...props }: NavigationMenuItemProps) {
  return <RadixNav.Item {...props} className={cx("neshel-navigation-menu-item", className)} />;
}
export function NavigationMenuTrigger({
  className,
  children,
  ...props
}: NavigationMenuTriggerProps) {
  return (
    <RadixNav.Trigger {...props} className={cx("neshel-navigation-menu-trigger", className)}>
      {children}
      <ChevronDownIcon className="neshel-chevron" />
    </RadixNav.Trigger>
  );
}
export function NavigationMenuContent({ className, ...props }: NavigationMenuContentProps) {
  return (
    <RadixNav.Content {...props} className={cx("neshel-navigation-menu-content", className)} />
  );
}
/** A navigation link; `active` marks the current page (`aria-current="page"`). */
export function NavigationMenuLink({ className, ...props }: NavigationMenuLinkProps) {
  if (props.asChild) asChildElement("NavigationMenuLink", props.children);
  return <RadixNav.Link {...props} className={cx("neshel-navigation-menu-link", className)} />;
}

// ---------------------------------------------------------------------------------------------
// DropdownMenu
// ---------------------------------------------------------------------------------------------

export type DropdownMenuProps = RadixMenu.DropdownMenuProps;
export type DropdownMenuTriggerProps = RadixMenu.DropdownMenuTriggerProps & {
  ref?: Ref<HTMLButtonElement>;
};
export type DropdownMenuContentProps = Omit<RadixMenu.DropdownMenuContentProps, "ref"> & {
  container?: HTMLElement | null;
  ref?: Ref<HTMLDivElement>;
};
export type DropdownMenuItemProps = RadixMenu.DropdownMenuItemProps & {
  variant?: "default" | "destructive";
  inset?: boolean;
  ref?: Ref<HTMLDivElement>;
};
export type DropdownMenuCheckboxItemProps = RadixMenu.DropdownMenuCheckboxItemProps & {
  ref?: Ref<HTMLDivElement>;
};
export type DropdownMenuRadioGroupProps = RadixMenu.DropdownMenuRadioGroupProps;
export type DropdownMenuRadioItemProps = RadixMenu.DropdownMenuRadioItemProps & {
  ref?: Ref<HTMLDivElement>;
};
export type DropdownMenuLabelProps = RadixMenu.DropdownMenuLabelProps & {
  inset?: boolean;
  ref?: Ref<HTMLDivElement>;
};
export type DropdownMenuGroupProps = RadixMenu.DropdownMenuGroupProps;
export type DropdownMenuSeparatorProps = RadixMenu.DropdownMenuSeparatorProps;
export type DropdownMenuSubProps = RadixMenu.DropdownMenuSubProps;
export type DropdownMenuSubTriggerProps = RadixMenu.DropdownMenuSubTriggerProps & {
  inset?: boolean;
  ref?: Ref<HTMLDivElement>;
};
export type DropdownMenuSubContentProps = Omit<RadixMenu.DropdownMenuSubContentProps, "ref"> & {
  container?: HTMLElement | null;
  ref?: Ref<HTMLDivElement>;
};
export interface DropdownMenuShortcutProps extends HTMLAttributes<HTMLSpanElement> {
  ref?: Ref<HTMLSpanElement>;
}

export function DropdownMenu(props: DropdownMenuProps) {
  const registry = useTriggerRegistry();
  return (
    <TriggerContext.Provider value={registry}>
      <RadixMenu.Root {...props} />
    </TriggerContext.Provider>
  );
}
export function DropdownMenuTrigger({ ref, ...props }: DropdownMenuTriggerProps) {
  if (props.asChild) asChildElement("DropdownMenuTrigger", props.children);
  const triggerRef = useTriggerRef(ref);
  return <RadixMenu.Trigger {...props} ref={triggerRef} />;
}
export function DropdownMenuContent({
  container,
  className,
  sideOffset = 6,
  collisionPadding = 8,
  ...props
}: DropdownMenuContentProps) {
  return (
    <RadixMenu.Portal container={container ?? undefined}>
      <PortalTheme>
        <RadixMenu.Content
          {...props}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          className={cx("neshel-menu-content", className)}
        />
      </PortalTheme>
    </RadixMenu.Portal>
  );
}
/** A command. Use `asChild` with a link only for menu items that navigate as a command. */
export function DropdownMenuItem({ variant, inset, className, ...props }: DropdownMenuItemProps) {
  if (props.asChild) asChildElement("DropdownMenuItem", props.children);
  const value = oneOf(
    "DropdownMenuItem",
    "variant",
    variant,
    ["default", "destructive"] as const,
    "default",
  );
  return (
    <RadixMenu.Item
      {...props}
      className={cx(
        "neshel-menu-item",
        value === "destructive" && "neshel-menu-item-destructive",
        flag("DropdownMenuItem", "inset", inset) && "neshel-menu-item-inset",
        className,
      )}
    />
  );
}
export function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: DropdownMenuCheckboxItemProps) {
  return (
    <RadixMenu.CheckboxItem
      {...props}
      className={cx("neshel-menu-item", "neshel-menu-item-indicated", className)}
    >
      <span className="neshel-menu-indicator">
        <RadixMenu.ItemIndicator>
          <CheckIcon />
        </RadixMenu.ItemIndicator>
      </span>
      {children}
    </RadixMenu.CheckboxItem>
  );
}
export function DropdownMenuRadioGroup(props: DropdownMenuRadioGroupProps) {
  return <RadixMenu.RadioGroup {...props} />;
}
export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: DropdownMenuRadioItemProps) {
  return (
    <RadixMenu.RadioItem
      {...props}
      className={cx("neshel-menu-item", "neshel-menu-item-indicated", className)}
    >
      <span className="neshel-menu-indicator">
        <RadixMenu.ItemIndicator>
          <DotIcon />
        </RadixMenu.ItemIndicator>
      </span>
      {children}
    </RadixMenu.RadioItem>
  );
}
export function DropdownMenuLabel({ inset, className, ...props }: DropdownMenuLabelProps) {
  return (
    <RadixMenu.Label
      {...props}
      className={cx(
        "neshel-menu-label",
        flag("DropdownMenuLabel", "inset", inset) && "neshel-menu-item-inset",
        className,
      )}
    />
  );
}
export function DropdownMenuGroup(props: DropdownMenuGroupProps) {
  return <RadixMenu.Group {...props} />;
}
export function DropdownMenuSeparator({ className, ...props }: DropdownMenuSeparatorProps) {
  return <RadixMenu.Separator {...props} className={cx("neshel-menu-separator", className)} />;
}
export function DropdownMenuShortcut({ className, ...props }: DropdownMenuShortcutProps) {
  return <span {...props} className={cx("neshel-menu-shortcut", className)} />;
}
export function DropdownMenuSub(props: DropdownMenuSubProps) {
  return <RadixMenu.Sub {...props} />;
}
export function DropdownMenuSubTrigger({
  inset,
  className,
  children,
  ...props
}: DropdownMenuSubTriggerProps) {
  return (
    <RadixMenu.SubTrigger
      {...props}
      className={cx(
        "neshel-menu-item",
        flag("DropdownMenuSubTrigger", "inset", inset) && "neshel-menu-item-inset",
        className,
      )}
    >
      {children}
      <ChevronRightIcon className="neshel-menu-chevron" />
    </RadixMenu.SubTrigger>
  );
}
export function DropdownMenuSubContent({
  container,
  className,
  ...props
}: DropdownMenuSubContentProps) {
  return (
    <RadixMenu.Portal container={container ?? undefined}>
      <PortalTheme>
        <RadixMenu.SubContent {...props} className={cx("neshel-menu-content", className)} />
      </PortalTheme>
    </RadixMenu.Portal>
  );
}
