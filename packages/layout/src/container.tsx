import { renderLayout } from "./render.js";
import { containerSpec, resolve } from "./resolve.js";
import type { ContainerProps } from "./types.js";
import { containerVariants } from "./variants.js";

/** Width-constrained block with automatic inline margins; `size` defaults to `xl` (80rem). */
export function Container(props: ContainerProps) {
  const { size, gutter, as, asChild, className, children, ...rest } = props;
  const selections = resolve(containerSpec, { size, gutter });
  return renderLayout({
    component: "Container",
    as,
    asChild,
    className: containerVariants({ ...selections, class: className }),
    children,
    rest,
  });
}
