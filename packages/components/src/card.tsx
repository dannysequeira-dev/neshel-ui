/**
 * Card family (FR-020): independent, context-free, non-interactive parts. Server-safe.
 */
import { Slot } from "@radix-ui/react-slot";
import type { HTMLAttributes, Ref } from "react";
import { tv } from "tailwind-variants/lite";
import { asChildElement, checkAs } from "./internal/slot.js";
import { cx, oneOf } from "./internal/validate.js";

export type CardElement = "div" | "section" | "article" | "aside" | "li";
export type CardVariant = "default" | "outline" | "muted";
export type CardPadding = "sm" | "md" | "lg";
export type CardTitleElement = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "div";

type Polymorphic<E extends string> = { as?: E; asChild?: false } | { as?: never; asChild: true };

export type CardProps = Omit<HTMLAttributes<HTMLElement>, "color"> & {
  variant?: CardVariant;
  padding?: CardPadding;
  ref?: Ref<HTMLElement>;
} & Polymorphic<CardElement>;

export type CardTitleProps = HTMLAttributes<HTMLHeadingElement> & {
  ref?: Ref<HTMLHeadingElement>;
} & Polymorphic<CardTitleElement>;

export interface CardPartProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  ref?: Ref<HTMLParagraphElement>;
}

const CARD_ELEMENTS: readonly CardElement[] = ["div", "section", "article", "aside", "li"];
const TITLE_ELEMENTS: readonly CardTitleElement[] = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "div",
];
const VARIANTS: readonly CardVariant[] = ["default", "outline", "muted"];
const PADDINGS: readonly CardPadding[] = ["sm", "md", "lg"];

export const cardVariants = tv({
  base: "neshel-card",
  variants: {
    variant: {
      default: "neshel-card-variant-default",
      outline: "neshel-card-variant-outline",
      muted: "neshel-card-variant-muted",
    },
    padding: {
      sm: "neshel-card-padding-sm",
      md: "neshel-card-padding-md",
      lg: "neshel-card-padding-lg",
    },
  },
  defaultVariants: { variant: "default", padding: "md" },
});

export function Card(props: CardProps) {
  const { as, asChild, variant, padding, className, children, ...rest } = props;
  checkAs("Card", as, asChild, CARD_ELEMENTS);
  const classValue = cardVariants({
    variant: oneOf("Card", "variant", variant, VARIANTS, "default"),
    padding: oneOf("Card", "padding", padding, PADDINGS, "md"),
    class: typeof className === "string" ? className : undefined,
  });
  if (asChild) {
    return (
      <Slot {...rest} className={classValue}>
        {asChildElement("Card", children)}
      </Slot>
    );
  }
  const Tag = (as ?? "div") as "div";
  return (
    <Tag {...(rest as HTMLAttributes<HTMLDivElement>)} className={classValue}>
      {children}
    </Tag>
  );
}

export function CardHeader({ className, ...rest }: CardPartProps) {
  return <div {...rest} className={cx("neshel-card-header", className)} />;
}

export function CardTitle(props: CardTitleProps) {
  const { as, asChild, className, children, ...rest } = props;
  checkAs("CardTitle", as, asChild, TITLE_ELEMENTS);
  const classValue = cx("neshel-card-title", className);
  if (asChild) {
    return (
      <Slot {...rest} className={classValue}>
        {asChildElement("CardTitle", children)}
      </Slot>
    );
  }
  const Tag = (as ?? "h3") as "h3";
  return (
    <Tag {...rest} className={classValue}>
      {children}
    </Tag>
  );
}

export function CardDescription({ className, ...rest }: CardDescriptionProps) {
  return <p {...rest} className={cx("neshel-card-description", className)} />;
}

export function CardContent({ className, ...rest }: CardPartProps) {
  return <div {...rest} className={cx("neshel-card-content", className)} />;
}

export function CardFooter({ className, ...rest }: CardPartProps) {
  return <div {...rest} className={cx("neshel-card-footer", className)} />;
}

export function CardAction({ className, ...rest }: CardPartProps) {
  return <div {...rest} className={cx("neshel-card-action", className)} />;
}
