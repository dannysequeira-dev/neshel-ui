import { renderLayout } from "./render.js";
import { boxSpec, joinClasses, resolve } from "./resolve.js";
import type { BoxProps } from "./types.js";

/** Neutral polymorphic element; adds CSS only for the responsive `display` prop. */
export function Box(props: BoxProps) {
  const { display, as, asChild, className, children, ...rest } = props;
  const classes = resolve(boxSpec, { display });
  return renderLayout({
    component: "Box",
    as,
    asChild,
    className: joinClasses(classes, className),
    children,
    rest,
  });
}
