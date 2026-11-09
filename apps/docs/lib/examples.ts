export const exampleSlugs = ["dashboard", "form", "landing"] as const;
export type ExampleSlug = (typeof exampleSlugs)[number];
