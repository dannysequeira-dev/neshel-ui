// Demo icons (inline SVG). Neshel-UI does not ship an icon library: applications pass their own.
import type { SVGProps } from "react";

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export const HomeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p} aria-hidden="true">
    <path d="M3 10.5 12 3l9 7.5V21H3z" />
  </svg>
);
export const ChartIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p} aria-hidden="true">
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);
export const UsersIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p} aria-hidden="true">
    <circle cx="9" cy="8" r="4" />
    <path d="M2 21c0-4 3-6 7-6s7 2 7 6M17 11a3 3 0 1 0 0-6M22 21c0-3-2-5-5-5" />
  </svg>
);
export const SettingsIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p} aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
  </svg>
);
export const PlusIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p} aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const TrashIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p} aria-hidden="true">
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
  </svg>
);
