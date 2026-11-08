import { renderLayout } from "./render.js";
import { assertSpacing, joinClasses, resolve, stackSpec } from "./resolve.js";
import type { StackProps } from "./types.js";
import { stackVariants } from "./variants.js";

/** Vertical flex layout (`flex-direction: column`). X → align-items, Y → justify-content. */
export function Stack(props: StackProps) {
  const {
    space,
    spaceX,
    spaceY,
    align,
    alignX,
    alignY,
    justify,
    separator,
    as,
    asChild,
    className,
    children,
    ...rest
  } = props;
  assertSpacing("Stack", { space, spaceX, spaceY });
  const classes = resolve(stackSpec, { space, spaceX, spaceY, align, alignX, alignY, justify });
  return renderLayout({
    component: "Stack",
    as,
    asChild,
    className: stackVariants({ class: joinClasses(classes, className) }),
    children,
    rest,
    separator: { value: separator, orientation: "horizontal" },
  });
}
