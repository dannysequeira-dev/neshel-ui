import { Flex, Stack } from "@neshel-ui/layout";
import { Heading, Paragraph, Text } from "@neshel-ui/typography";

/**
 * Content/sidebar layout: stacked on small screens, side by side from lg. The sidebar keeps a
 * fixed inline size; the article takes the remaining space (flex-1 utility from Tailwind).
 */
export default function RecipeContentSidebar() {
  return (
    <Flex direction={{ base: "column", lg: "row" }} space="8" alignY="start">
      <Stack as="article" space="4" className="min-w-0 flex-1">
        <Heading as="h3" size="xl">
          Release notes
        </Heading>
        <Paragraph measure="comfortable">
          The article column grows and shrinks; long text keeps a comfortable measure so lines stay
          readable on wide screens.
        </Paragraph>
      </Stack>
      <Stack as="aside" aria-label="On this page" space="2" className="lg:w-56">
        <Text weight="semibold" size="sm">
          On this page
        </Text>
        <Stack as="ul" space="1">
          <li>
            <a href="#highlights">Highlights</a>
          </li>
          <li>
            <a href="#breaking">Breaking changes</a>
          </li>
        </Stack>
      </Stack>
    </Flex>
  );
}
