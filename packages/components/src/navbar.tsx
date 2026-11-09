/**
 * Navbar family (FR-090): a `<header>` with brand, a navigation landmark of links and actions.
 * Server-safe; links come from the application (`asChild` for router links).
 */
import { Slot } from "@radix-ui/react-slot";
import type { AnchorHTMLAttributes, HTMLAttributes, Ref } from "react";
import { breakpointClass } from "./internal/responsive.js";
import { asChildElement } from "./internal/slot.js";
import { cx, flag } from "./internal/validate.js";
import type { Breakpoint } from "./types.js";

export interface NavbarProps extends HTMLAttributes<HTMLElement> {
  /** Stick to the top of the scroll container. */
  sticky?: boolean;
  ref?: Ref<HTMLElement>;
}

export interface NavbarBrandProps extends HTMLAttributes<HTMLElement> {
  /** Render the single child (e.g. a home link) with the brand styles. */
  asChild?: boolean;
  ref?: Ref<HTMLElement>;
}

export interface NavbarNavProps extends HTMLAttributes<HTMLElement> {
  /** Hide the links below this breakpoint (pair with a MobileMenu using the same breakpoint). */
  hideBelow?: Breakpoint;
  ref?: Ref<HTMLElement>;
}

export interface NavbarLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** The current page: sets `aria-current="page"`. */
  active?: boolean;
  /** Render the single child element (e.g. a router link) inside the `<li>` instead of an `<a>`. */
  asChild?: boolean;
  ref?: Ref<HTMLAnchorElement>;
}

export interface NavbarActionsProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

export function Navbar({ sticky, className, ...rest }: NavbarProps) {
  return (
    <header
      {...rest}
      className={cx(
        "neshel-navbar",
        flag("Navbar", "sticky", sticky) && "neshel-navbar-sticky",
        className,
      )}
    />
  );
}

export function NavbarBrand({ asChild, className, children, ...rest }: NavbarBrandProps) {
  const classValue = cx("neshel-navbar-brand", className);
  if (asChild) {
    return (
      <Slot {...rest} className={classValue}>
        {asChildElement("NavbarBrand", children)}
      </Slot>
    );
  }
  return (
    <div {...(rest as HTMLAttributes<HTMLDivElement>)} className={classValue}>
      {children}
    </div>
  );
}

/** `<nav>` landmark with a list of NavbarLink items. */
export function NavbarNav({ hideBelow, className, children, ...rest }: NavbarNavProps) {
  const responsive =
    hideBelow === undefined || hideBelow === null
      ? undefined
      : cx(
          "neshel-navbar-nav-responsive",
          breakpointClass("NavbarNav", "hideBelow", hideBelow, "navbar-nav", "visible"),
        );
  return (
    <nav aria-label="Main" {...rest} className={cx("neshel-navbar-nav", responsive, className)}>
      <ul className="neshel-navbar-list">{children}</ul>
    </nav>
  );
}

export function NavbarLink({ active, asChild, className, children, ...rest }: NavbarLinkProps) {
  const current = flag("NavbarLink", "active", active) ? { "aria-current": "page" as const } : {};
  const classValue = cx("neshel-navbar-link", className);
  return (
    <li>
      {asChild ? (
        <Slot {...rest} {...current} className={classValue}>
          {asChildElement("NavbarLink", children)}
        </Slot>
      ) : (
        <a {...rest} {...current} className={classValue}>
          {children}
        </a>
      )}
    </li>
  );
}

export function NavbarActions({ className, ...rest }: NavbarActionsProps) {
  return <div {...rest} className={cx("neshel-navbar-actions", className)} />;
}
