import { renderLayout } from "./render.js";
import { assertSpacing, gridSpec, resolve } from "./resolve.js";
import type { GridProps } from "./types.js";
import { gridVariants } from "./variants.js";

/** CSS Grid with equal responsive columns. X → justify-items, Y → align-items. */
export function Grid(props: GridProps) {
  const {
    space,
    spaceX,
    spaceY,
    columns,
    align,
    alignX,
    alignY,
    as,
    asChild,
    className,
    children,
    ...rest
  } = props;
  assertSpacing("Grid", { space, spaceX, spaceY });
  const selections = resolve(gridSpec, { space, spaceX, spaceY, columns, align, alignX, alignY });
  return renderLayout({
    component: "Grid",
    as,
    asChild,
    className: gridVariants({ ...selections, class: className }),
    children,
    rest,
  });
}
