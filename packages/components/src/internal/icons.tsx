/**
 * Decorative internal icons (inline SVG, `aria-hidden`). Not a public icon set: applications pass
 * their own icons to components (FR-009).
 */
import type { ReactElement } from "react";

function Svg({
  children,
  className,
}: {
  children: ReactElement | ReactElement[];
  className?: string;
}) {
  return (
    <svg
      className={className ? `neshel-icon ${className}` : "neshel-icon"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const ChevronDownIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);
export const ChevronRightIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
);
export const CheckIcon = () => (
  <Svg>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
);
export const CloseIcon = () => (
  <Svg>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Svg>
);
export const MenuIcon = () => (
  <Svg>
    <path d="M4 6h16" />
    <path d="M4 12h16" />
    <path d="M4 18h16" />
  </Svg>
);
export const PanelIcon = () => (
  <Svg>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
  </Svg>
);
export const DotIcon = () => (
  <svg className="neshel-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="4" fill="currentColor" />
  </svg>
);
