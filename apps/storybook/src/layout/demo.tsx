import type { CSSProperties, ReactNode } from "react";

/** Demo tile: Tailwind utilities style the demo chrome only; layout comes from the primitives. */
export function Tile({
  children,
  tone = "surface",
  style,
}: {
  children?: ReactNode;
  tone?: "surface" | "primary" | "accent" | "muted";
  style?: CSSProperties;
}) {
  const tones = {
    surface: "border border-neshel-border bg-neshel-surface text-neshel-surface-foreground",
    primary: "bg-neshel-primary text-neshel-primary-foreground",
    accent: "bg-neshel-accent text-neshel-accent-foreground",
    muted: "bg-neshel-muted text-neshel-muted-foreground",
  } as const;
  return (
    <div className={`rounded-neshel-md px-3 py-2 text-sm ${tones[tone]}`} style={style}>
      {children}
    </div>
  );
}

/** Dashed frame that makes a primitive's box visible. */
export function Frame({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="rounded-neshel-md border border-dashed border-neshel-input p-2" style={style}>
      {children}
    </div>
  );
}

export const tiles = (count: number, prefix = "Item") =>
  Array.from({ length: count }, (_, index) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: static demo content
    <Tile key={index}>{`${prefix} ${index + 1}`}</Tile>
  ));
