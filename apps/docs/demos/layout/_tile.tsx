import type { ReactNode } from "react";

/** Visual placeholder used by the layout demos (plain element styled with Neshel tokens). */
export function Tile({ children, tall = false }: { children: ReactNode; tall?: boolean }) {
  return (
    <div
      className="rounded-md border border-[var(--neshel-border)] bg-[var(--neshel-muted)] px-3 py-2 text-sm text-[var(--neshel-muted-foreground)]"
      style={tall ? { minBlockSize: "5rem" } : undefined}
    >
      {children}
    </div>
  );
}
