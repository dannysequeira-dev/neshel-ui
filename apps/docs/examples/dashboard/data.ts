export interface Project {
  id: string;
  name: string;
  owner: string;
  status: "Planning" | "In progress" | "At risk" | "Done";
}

export const stats = [
  { label: "Revenue", value: "$48,200", trend: "+12%" },
  { label: "Active users", value: "1,284", trend: "+4%" },
  { label: "Open tickets", value: "17", trend: "-3%" },
  { label: "Uptime", value: "99.95%", trend: "+0.02%" },
] as const;

export const projects: Project[] = [
  { id: "1", name: "Website redesign", owner: "Luis Mora", status: "In progress" },
  { id: "2", name: "Mobile onboarding", owner: "Mei Tanaka", status: "At risk" },
  { id: "3", name: "Billing migration", owner: "Sam Ortiz", status: "Done" },
];
