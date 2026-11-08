import { type ComponentConfig, renderTypography } from "./render.js";
import type { CaptionProps, HeadingProps, ParagraphProps, TextProps } from "./types.js";

const HEADING_SIZES: Readonly<Record<string, string>> = {
  h1: "4xl",
  h2: "3xl",
  h3: "2xl",
  h4: "xl",
  h5: "lg",
  h6: "base",
};

const heading: ComponentConfig = {
  name: "Heading",
  elements: ["h1", "h2", "h3", "h4", "h5", "h6"],
  defaultElement: "h2",
  // The default size follows the rendered level; `size` never changes the level.
  defaults: (element) => ({
    size: HEADING_SIZES[element ?? "h2"] ?? HEADING_SIZES.h2,
    weight: "semibold",
    family: "display",
  }),
  trimmable: true,
};

const paragraph: ComponentConfig = {
  name: "Paragraph",
  elements: ["p", "div"],
  defaultElement: "p",
  defaults: () => ({ size: "base", family: "body" }),
  trimmable: true,
};

const caption: ComponentConfig = {
  name: "Caption",
  elements: ["p", "span", "div", "small", "figcaption"],
  defaultElement: "p",
  defaults: () => ({ size: "sm", tone: "muted", family: "body" }),
  trimmable: true,
};

const text: ComponentConfig = {
  name: "Text",
  elements: [
    "span",
    "p",
    "div",
    "strong",
    "em",
    "b",
    "i",
    "small",
    "code",
    "kbd",
    "samp",
    "mark",
    "abbr",
    "cite",
    "q",
    "s",
    "del",
    "ins",
    "sub",
    "sup",
    "time",
    "dfn",
  ],
  defaultElement: "span",
  defaults: () => ({}),
  trimmable: false,
};

/** Semantic heading (`h1`–`h6`, default `h2`); visual size is independent of the level. */
export function Heading(props: HeadingProps) {
  return renderTypography(heading, props as Record<string, unknown>);
}

/** Body paragraph (`p`), trimmed to its cap height and baseline. */
export function Paragraph(props: ParagraphProps) {
  return renderTypography(paragraph, props as Record<string, unknown>);
}

/** Small supporting text (`p` by default; `figcaption` for figures). Muted by default. */
export function Caption(props: CaptionProps) {
  return renderTypography(caption, props as Record<string, unknown>);
}

/** Inline text (`span` by default) that inherits everything it does not set. Never trimmed. */
export function Text(props: TextProps) {
  return renderTypography(text, props as Record<string, unknown>);
}
