import { Stack } from "@neshel-ui/layout";
import { Heading, Paragraph } from "@neshel-ui/typography";

/** Values cascade upwards (mobile first); resize the window to see the changes. */
export default function TypographyResponsive() {
  return (
    <Stack space="4">
      <Heading
        as="h2"
        size={{ base: "xl", md: "3xl", lg: "5xl" }}
        weight={{ base: "medium", md: "bold" }}
        align={{ base: "center", lg: "start" }}
      >
        Rooted in faith. Built with hope.
      </Heading>
      <Paragraph
        size={{ base: "sm", md: "base", lg: "lg" }}
        align={{ base: "center", lg: "start" }}
      >
        Size, weight, alignment and leading accept a value per breakpoint.
      </Paragraph>
    </Stack>
  );
}
