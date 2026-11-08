import { renderLayout } from "./render.js";
import { assertSpacing, centerSpec, resolve } from "./resolve.js";
import type { CenterProps } from "./types.js";
import { centerVariants } from "./variants.js";

/** Flex container centred on both axes by default. X → justify-content, Y → align-items. */
export function Center(props: CenterProps) {
  const {
    space,
    spaceX,
    spaceY,
    align,
    alignX,
    alignY,
    as,
    asChild,
    className,
    children,
    ...rest
  } = props;
  assertSpacing("Center", { space, spaceX, spaceY });
  const selections = resolve(centerSpec, { space, spaceX, spaceY, align, alignX, alignY });
  return renderLayout({
    component: "Center",
    as,
    asChild,
    className: centerVariants({ ...selections, class: className }),
    children,
    rest,
  });
}
