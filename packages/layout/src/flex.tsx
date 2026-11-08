import { renderLayout } from "./render.js";
import { assertSpacing, flexSpec, resolve } from "./resolve.js";
import type { FlexProps } from "./types.js";
import { flexVariants } from "./variants.js";

/** Flexbox container with a responsive direction; alignment follows the active direction. */
export function Flex(props: FlexProps) {
  const {
    space,
    spaceX,
    spaceY,
    direction,
    wrap,
    align,
    alignX,
    alignY,
    justify,
    as,
    asChild,
    className,
    children,
    ...rest
  } = props;
  assertSpacing("Flex", { space, spaceX, spaceY });
  const selections = resolve(flexSpec, {
    space,
    spaceX,
    spaceY,
    direction,
    wrap,
    align,
    alignX,
    alignY,
    justify,
  });
  return renderLayout({
    component: "Flex",
    as,
    asChild,
    className: flexVariants({ ...selections, class: className }),
    children,
    rest,
  });
}
