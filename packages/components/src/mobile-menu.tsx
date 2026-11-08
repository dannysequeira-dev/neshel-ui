"use client";
/**
 * MobileMenu (FR-098): sheet-based navigation below a breakpoint. The breakpoint lives in CSS
 * (`neshel-<bp>-menu-desktop` hides the trigger); JavaScript reads the resulting mode to close
 * the menu when the viewport becomes desktop (ADR 0014).
 */
import { Slot } from "@radix-ui/react-slot";
import {
  type AnchorHTMLAttributes,
  createContext,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { buttonClassName } from "./button.js";
import { Sheet, SheetContent, type SheetContentProps, SheetTitle, SheetTrigger } from "./dialog.js";
import { closeOnNavigate, useCssMode } from "./internal/css-mode.js";
import { componentsError } from "./internal/errors.js";
import { MenuIcon } from "./internal/icons.js";
import { composeRefs } from "./internal/layer.js";
import { breakpointClass } from "./internal/responsive.js";
import { asChildElement } from "./internal/slot.js";
import { cx, flag } from "./internal/validate.js";
import type { Breakpoint } from "./types.js";

interface MobileMenuContextValue {
  breakpoint: Breakpoint;
  setOpen(open: boolean): void;
  open: boolean;
}
const MobileMenuContext = createContext<MobileMenuContextValue | null>(null);

function useMobileMenu(component: string): MobileMenuContextValue {
  const context = useContext(MobileMenuContext);
  if (!context) throw componentsError(component, "must be rendered inside <MobileMenu>.");
  return context;
}

export interface MobileMenuProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** At and above this breakpoint the trigger is hidden and the menu closes (default "md"). */
  breakpoint?: Breakpoint;
  children?: ReactNode;
}

export function MobileMenu({
  open,
  defaultOpen = false,
  onOpenChange,
  breakpoint = "md",
  children,
}: MobileMenuProps) {
  const [internal, setInternal] = useState(defaultOpen);
  const current = open ?? internal;
  const setOpen = (next: boolean) => {
    if (open === undefined) setInternal(next);
    onOpenChange?.(next);
  };
  return (
    <MobileMenuContext.Provider value={{ breakpoint, open: current, setOpen }}>
      <Sheet open={current} onOpenChange={setOpen}>
        {children}
      </Sheet>
    </MobileMenuContext.Provider>
  );
}

export interface MobileMenuTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  /** Accessible name (default "Open menu"). */
  label?: string;
  ref?: Ref<HTMLButtonElement>;
}

export function MobileMenuTrigger({
  label = "Open menu",
  className,
  children,
  ref,
  ...rest
}: MobileMenuTriggerProps) {
  const { breakpoint, open, setOpen } = useMobileMenu("MobileMenuTrigger");
  const local = useRef<HTMLButtonElement>(null);
  const mode = useCssMode(local, "--neshel-menu-mode");
  useEffect(() => {
    if (mode === "desktop" && open) setOpen(false);
  });
  return (
    <SheetTrigger
      {...rest}
      ref={composeRefs(ref, local)}
      aria-label={children ? rest["aria-label"] : label}
      data-mode={mode}
      className={buttonClassName("MobileMenuTrigger", {
        variant: "ghost",
        iconOnly: !children,
        className: cx(
          "neshel-mobile-menu-trigger",
          breakpointClass("MobileMenuTrigger", "breakpoint", breakpoint, "menu", "desktop"),
          className,
        ),
      })}
    >
      {children ?? <MenuIcon />}
    </SheetTrigger>
  );
}

export type MobileMenuContentProps = Omit<SheetContentProps, "title"> & {
  /** Dialog title (default "Menu"). */
  title?: ReactNode;
  /** Keep the title for assistive technology only (default true). */
  titleHidden?: boolean;
};

export function MobileMenuContent({
  side = "left",
  title = "Menu",
  titleHidden = true,
  children,
  onClick,
  ...rest
}: MobileMenuContentProps) {
  const { setOpen } = useMobileMenu("MobileMenuContent");
  const close = closeOnNavigate(() => setOpen(false));
  return (
    <SheetContent
      aria-describedby={undefined}
      {...rest}
      side={side}
      size="sm"
      onClick={(event) => {
        onClick?.(event);
        close(event);
      }}
    >
      <SheetTitle
        className={
          flag("MobileMenuContent", "titleHidden", titleHidden)
            ? "neshel-visually-hidden"
            : undefined
        }
      >
        {title}
      </SheetTitle>
      {children}
    </SheetContent>
  );
}

export interface MobileMenuNavProps extends HTMLAttributes<HTMLElement> {
  ref?: Ref<HTMLElement>;
}

/** `<nav>` with a list of MobileMenuLink items. */
export function MobileMenuNav({ className, children, ...rest }: MobileMenuNavProps) {
  return (
    <nav aria-label="Main" {...rest} className={className}>
      <ul className="neshel-mobile-menu-list">{children}</ul>
    </nav>
  );
}

export interface MobileMenuLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  active?: boolean;
  asChild?: boolean;
  ref?: Ref<HTMLAnchorElement>;
}

export function MobileMenuLink({
  active,
  asChild,
  className,
  children,
  ...rest
}: MobileMenuLinkProps) {
  const current = flag("MobileMenuLink", "active", active)
    ? { "aria-current": "page" as const }
    : {};
  const classValue = cx("neshel-mobile-menu-link", className);
  return (
    <li>
      {asChild ? (
        <Slot {...rest} {...current} className={classValue}>
          {asChildElement("MobileMenuLink", children)}
        </Slot>
      ) : (
        <a {...rest} {...current} className={classValue}>
          {children}
        </a>
      )}
    </li>
  );
}
