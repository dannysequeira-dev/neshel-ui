import type { ComboboxItem, SelectOptions } from "@neshel-ui/components";

export const countries: SelectOptions = [
  { value: "cr", label: "Costa Rica" },
  { value: "es", label: "Spain" },
  { value: "mx", label: "Mexico" },
  { value: "jp", label: "Japan" },
];

export const cities: Record<string, ComboboxItem[]> = {
  cr: [
    { value: "sjo", label: "San José" },
    { value: "lib", label: "Liberia" },
    { value: "lim", label: "Limón" },
  ],
  es: [
    { value: "mad", label: "Madrid" },
    { value: "bcn", label: "Barcelona" },
    { value: "vlc", label: "Valencia" },
  ],
  mx: [
    { value: "cdmx", label: "Mexico City" },
    { value: "gdl", label: "Guadalajara" },
  ],
  jp: [
    { value: "tyo", label: "Tokyo" },
    { value: "osa", label: "Osaka" },
  ],
};

export const skills: SelectOptions = [
  {
    label: "Engineering",
    options: [
      { value: "react", label: "React" },
      { value: "typescript", label: "TypeScript" },
      { value: "node", label: "Node.js" },
    ],
  },
  {
    label: "Design",
    options: [
      { value: "ux", label: "UX research" },
      { value: "visual", label: "Visual design" },
      { value: "a11y", label: "Accessibility" },
    ],
  },
];

export const roles: SelectOptions = [
  { value: "engineer", label: "Engineer" },
  { value: "designer", label: "Designer" },
  { value: "manager", label: "Product manager" },
];
