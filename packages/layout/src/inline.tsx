import { layoutError } from "./errors.js";
import { anyTrue, renderLayout } from "./render.js";
import { assertSpacing, inlineSpec, resolve } from "./resolve.js";
import type { InlineProps } from "./types.js";
import { inlineVariants } from "./variants.js";

/** Horizontal flex layout (`flex-direction: row`). X → justify-content, Y → align-items. */
export function Inline(props: InlineProps) {
  const {
    space,
    spaceX,
    spaceY,
    align,
    alignX,
    alignY,
    justify,
    wrap,
    separator,
    as,
    asChild,
    className,
    children,
    ...rest
  } = props;
  assertSpacing("Inline", { space, spaceX, spaceY });
  if (separator !== undefined && separator !== null && separator !== false && anyTrue(wrap)) {
    throw layoutError(
      "Inline",
      `"separator" cannot be combined with "wrap": a wrapped line could start or end with a ` +
        `separator. Remove "wrap", or render separators yourself.`,
    );
  }
  const selections = resolve(inlineSpec, {
    space,
    spaceX,
    spaceY,
    align,
    alignX,
    alignY,
    justify,
    wrap,
  });
  return renderLayout({
    component: "Inline",
    as,
    asChild,
    className: inlineVariants({ ...selections, class: className }),
    children,
    rest,
    separator: { value: separator, orientation: "vertical" },
  });
}
