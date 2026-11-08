import { renderLayout } from "./render.js";
import { boxSpec, resolve } from "./resolve.js";
import type { BoxProps } from "./types.js";
import { boxVariants } from "./variants.js";

/** Neutral polymorphic element; adds CSS only for the responsive `display` prop. */
export function Box(props: BoxProps) {
  const { display, as, asChild, className, children, ...rest } = props;
  const selections = resolve(boxSpec, { display });
  return renderLayout({
    component: "Box",
    as,
    asChild,
    className: boxVariants({ ...selections, class: className }) || undefined,
    children,
    rest,
  });
}
