"use client";
/**
 * AppShell, Sidebar and SidebarTrigger (FR-100–FR-110, ADR 0014,
 * contracts/shell-and-overlays.md). CSS decides desktop vs mobile at the shell's breakpoint; the
 * shell reads that mode after hydration. Sidebar content renders once: inline on desktop, in a
 * modal sheet on mobile while open.
 */
import { Slot } from "@radix-ui/react-slot";
import {
  type ButtonHTMLAttributes,
  cloneElement,
  createContext,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { buttonClassName } from "./button.js";
import { Sheet, SheetContent, SheetTitle } from "./dialog.js";
import { type CssMode, closeOnNavigate, useCssMode } from "./internal/css-mode.js";
import { componentsError } from "./internal/errors.js";
import { ChevronDownIcon, PanelIcon } from "./internal/icons.js";
import { composeRefs } from "./internal/layer.js";
import { breakpointClass } from "./internal/responsive.js";
import { asChildElement } from "./internal/slot.js";
import { cx, flag, oneOf } from "./internal/validate.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "./popover.js";
import type { Breakpoint } from "./types.js";

// ---------------------------------------------------------------------------------------------
// AppShell state
// ---------------------------------------------------------------------------------------------

export interface AppShellState {
  /** `undefined` until the shell has read its CSS mode after hydration. */
  mode: CssMode | undefined;
  collapsed: boolean;
  setCollapsed(collapsed: boolean): void;
  mobileOpen: boolean;
  setMobileOpen(open: boolean): void;
  /** Toggles the rail on desktop and the drawer on mobile. */
  toggle(): void;
}

interface AppShellContextValue extends AppShellState {
  sidebarId: string;
  sheetId: string;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

/** Shell state for custom triggers; throws outside an AppShell. */
export function useAppShell(): AppShellState {
  const context = useContext(AppShellContext);
  if (!context) throw componentsError("useAppShell", "must be called inside <AppShell>.");
  return context;
}

function useControllable(
  value: boolean | undefined,
  initial: boolean,
  onChange: ((value: boolean) => void) | undefined,
): [boolean, (next: boolean) => void] {
  const [internal, setInternal] = useState(initial);
  const current = value ?? internal;
  return [
    current,
    (next) => {
      if (value === undefined) setInternal(next);
      if (next !== current) onChange?.(next);
    },
  ];
}

export interface AppShellProps extends HTMLAttributes<HTMLDivElement> {
  /** Desktop layout at and above this breakpoint (default "lg"; "base" = always desktop). */
  breakpoint?: Breakpoint;
  /** Desktop rail/hidden state (controlled). */
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Mobile drawer state (controlled). */
  mobileOpen?: boolean;
  defaultMobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  ref?: Ref<HTMLDivElement>;
}

export function AppShell({
  breakpoint = "lg",
  collapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  mobileOpen,
  defaultMobileOpen = false,
  onMobileOpenChange,
  className,
  children,
  ref,
  ...rest
}: AppShellProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mode = useCssMode(rootRef, "--neshel-shell-mode");
  const [isCollapsed, setCollapsed] = useControllable(
    collapsed,
    defaultCollapsed,
    onCollapsedChange,
  );
  const [isMobileOpen, setMobileOpen] = useControllable(
    mobileOpen,
    defaultMobileOpen,
    onMobileOpenChange,
  );
  const id = useId();
  useEffect(() => {
    if (mode === "desktop" && isMobileOpen) setMobileOpen(false);
  });
  const value: AppShellContextValue = {
    mode,
    collapsed: isCollapsed,
    setCollapsed,
    mobileOpen: isMobileOpen,
    setMobileOpen,
    toggle: () => (mode === "mobile" ? setMobileOpen(!isMobileOpen) : setCollapsed(!isCollapsed)),
    sidebarId: `${id}-sidebar`,
    sheetId: `${id}-sidebar-sheet`,
  };
  return (
    <AppShellContext.Provider value={value}>
      <div
        {...rest}
        ref={composeRefs(ref, rootRef)}
        data-mode={mode}
        className={cx(
          "neshel-app-shell",
          breakpointClass("AppShell", "breakpoint", breakpoint, "shell", "desktop"),
          className,
        )}
      >
        {children}
      </div>
    </AppShellContext.Provider>
  );
}

export interface AppShellPartProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/** Column next to the sidebar (navbar + content). */
export function AppShellMain({ className, ...rest }: AppShellPartProps) {
  return <div {...rest} className={cx("neshel-app-shell-main", className)} />;
}

/** The `<main>` landmark; give it an `id` for skip links. */
export function AppShellContent({
  className,
  ...rest
}: HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> }) {
  return <main {...rest} className={cx("neshel-app-shell-content", className)} />;
}

// ---------------------------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------------------------

interface SidebarContextValue {
  /** The icon rail is active (labels visually hidden, tooltips on). */
  rail: boolean;
  expand(): void;
}
const SidebarContext = createContext<SidebarContextValue>({ rail: false, expand: () => {} });

export type SidebarCollapsible = "icon" | "offcanvas" | "none";

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  /** What collapsing does on desktop: icon rail (default), hide completely, or nothing. */
  collapsible?: SidebarCollapsible;
  /** Collapsed state for a sidebar used outside an AppShell. */
  collapsed?: boolean;
  /** Accessible title of the mobile drawer (default "Navigation"). */
  mobileTitle?: string;
  /** Accessible name of the drawer's close button (default "Close navigation"). */
  closeLabel?: string;
  ref?: Ref<HTMLElement>;
}

const COLLAPSIBLE: readonly SidebarCollapsible[] = ["icon", "offcanvas", "none"];

export function Sidebar({
  collapsible,
  collapsed,
  mobileTitle = "Navigation",
  closeLabel = "Close navigation",
  className,
  children,
  ...rest
}: SidebarProps) {
  const kind = oneOf("Sidebar", "collapsible", collapsible, COLLAPSIBLE, "icon");
  const shell = useContext(AppShellContext);
  const aside = (isCollapsed: boolean, content: ReactNode, id?: string) => (
    <aside
      aria-label="Sidebar"
      {...rest}
      id={id ?? rest.id}
      data-collapsible={kind}
      data-collapsed={isCollapsed ? "" : undefined}
      className={cx("neshel-sidebar", className)}
    >
      {content}
    </aside>
  );

  if (!shell) {
    const isCollapsed = kind !== "none" && flag("Sidebar", "collapsed", collapsed);
    return (
      <SidebarContext.Provider value={{ rail: isCollapsed && kind === "icon", expand: () => {} }}>
        {aside(isCollapsed, children)}
      </SidebarContext.Provider>
    );
  }

  const mobile = shell.mode === "mobile";
  const isCollapsed = kind !== "none" && shell.collapsed && !mobile;
  const inSheet = mobile && shell.mobileOpen;
  const close = closeOnNavigate(() => shell.setMobileOpen(false));
  return (
    <>
      <SidebarContext.Provider
        value={{ rail: isCollapsed && kind === "icon", expand: () => shell.setCollapsed(false) }}
      >
        {aside(isCollapsed, inSheet ? null : children, shell.sidebarId)}
      </SidebarContext.Provider>
      {mobile ? (
        <Sheet open={shell.mobileOpen} onOpenChange={shell.setMobileOpen}>
          <SheetContent
            id={shell.sheetId}
            side="left"
            aria-describedby={undefined}
            closeLabel={closeLabel}
            className="neshel-sidebar-sheet"
            onClick={close}
          >
            <SheetTitle className="neshel-visually-hidden">{mobileTitle}</SheetTitle>
            <SidebarContext.Provider value={{ rail: false, expand: () => {} }}>
              {children}
            </SidebarContext.Provider>
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  );
}

export interface SidebarPartProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

export function SidebarHeader({ className, ...rest }: SidebarPartProps) {
  return <div {...rest} className={cx("neshel-sidebar-header", className)} />;
}

/** Scrollable `<nav>` landmark (default label "Main navigation"). */
export function SidebarContent({
  className,
  ...rest
}: HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> }) {
  return (
    <nav
      aria-label="Main navigation"
      {...rest}
      className={cx("neshel-sidebar-content", className)}
    />
  );
}

export function SidebarFooter({ className, ...rest }: SidebarPartProps) {
  return <div {...rest} className={cx("neshel-sidebar-footer", className)} />;
}

export interface SidebarGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Visible group heading; labels the list (visually hidden in the rail). */
  label?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

export function SidebarGroup({ label, className, children, ...rest }: SidebarGroupProps) {
  const id = useId();
  const hasLabel = label !== undefined && label !== null;
  return (
    <div {...rest} className={cx("neshel-sidebar-group", className)}>
      {hasLabel ? (
        <div id={id} className="neshel-sidebar-group-label">
          {label}
        </div>
      ) : null}
      <ul className="neshel-sidebar-list" aria-labelledby={hasLabel ? id : undefined}>
        {children}
      </ul>
    </div>
  );
}

export interface SidebarItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  /** Decorative icon (shown alone in the rail). */
  icon?: ReactNode;
  /** The current page: `aria-current="page"` on links, `data-active` always. */
  active?: boolean;
  /** Rail tooltip text (default: the label when it is a string). */
  tooltip?: string;
  /** Render the single child (a link or router link) as the item. */
  asChild?: boolean;
  type?: "button" | "submit" | "reset";
  ref?: Ref<HTMLButtonElement>;
}

export function SidebarItem({
  icon,
  active,
  tooltip,
  asChild,
  className,
  children,
  type,
  ...rest
}: SidebarItemProps) {
  const { rail } = useContext(SidebarContext);
  const isActive = flag("SidebarItem", "active", active);
  const child = asChild ? asChildElement("SidebarItem", children) : undefined;
  const labelContent = child ? (child.props as { children?: ReactNode }).children : children;
  const inner = (
    <>
      {icon ? (
        <span className="neshel-sidebar-item-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="neshel-sidebar-item-label">{labelContent}</span>
    </>
  );
  const classValue = cx("neshel-sidebar-item", className);
  const state = { "data-active": isActive ? "" : undefined };
  const element = child ? (
    <Slot
      {...rest}
      {...state}
      {...(isActive ? { "aria-current": "page" as const } : {})}
      className={classValue}
    >
      {cloneElement(child as ReactElement<{ children?: ReactNode }>, undefined, inner)}
    </Slot>
  ) : (
    <button type={type ?? "button"} {...rest} {...state} className={classValue}>
      {inner}
    </button>
  );
  const text = tooltip ?? (typeof labelContent === "string" ? labelContent : undefined);
  return (
    <li>
      <Tooltip open={rail && text ? undefined : false}>
        <TooltipTrigger asChild>{element}</TooltipTrigger>
        {rail && text ? <TooltipContent side="right">{text}</TooltipContent> : null}
      </Tooltip>
    </li>
  );
}

export interface SidebarSubProps {
  label: ReactNode;
  icon?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  children?: ReactNode;
}

/** Nested disclosure of SidebarItems (native button + list). */
export function SidebarSub({
  label,
  icon,
  open,
  defaultOpen = false,
  onOpenChange,
  className,
  children,
}: SidebarSubProps) {
  const { rail, expand } = useContext(SidebarContext);
  const [isOpen, setOpen] = useControllable(open, defaultOpen, onOpenChange);
  const id = useId();
  return (
    <li className={className}>
      <button
        type="button"
        className="neshel-sidebar-item neshel-sidebar-sub-trigger"
        aria-expanded={isOpen}
        aria-controls={id}
        onClick={() => {
          if (rail) {
            expand();
            setOpen(true);
          } else setOpen(!isOpen);
        }}
      >
        {icon ? (
          <span className="neshel-sidebar-item-icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="neshel-sidebar-item-label">{label}</span>
        <ChevronDownIcon className="neshel-chevron" />
      </button>
      <ul id={id} className="neshel-sidebar-list neshel-sidebar-sub-list" hidden={!isOpen}>
        {children}
      </ul>
    </li>
  );
}

export function SidebarSeparator({ className, ...rest }: HTMLAttributes<HTMLHRElement>) {
  return <hr {...rest} className={cx("neshel-sidebar-separator", className)} />;
}

// ---------------------------------------------------------------------------------------------
// SidebarTrigger
// ---------------------------------------------------------------------------------------------

export interface SidebarTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name when no children are given (default "Toggle sidebar"). */
  label?: string;
  ref?: Ref<HTMLButtonElement>;
}

export function SidebarTrigger({
  label = "Toggle sidebar",
  className,
  children,
  onClick,
  ...rest
}: SidebarTriggerProps) {
  const shell = useContext(AppShellContext);
  if (!shell) throw componentsError("SidebarTrigger", "must be rendered inside <AppShell>.");
  const mobile = shell.mode === "mobile";
  return (
    <button
      type="button"
      aria-label={children ? undefined : label}
      {...rest}
      aria-controls={mobile ? (shell.mobileOpen ? shell.sheetId : undefined) : shell.sidebarId}
      aria-expanded={mobile ? shell.mobileOpen : !shell.collapsed}
      data-mode={shell.mode}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) shell.toggle();
      }}
      className={buttonClassName("SidebarTrigger", {
        variant: "ghost",
        iconOnly: !children,
        className: cx("neshel-sidebar-trigger", className),
      })}
    >
      {children ?? <PanelIcon />}
    </button>
  );
}
