import { Button } from "@neshel-ui/components";
import { Inline } from "@neshel-ui/layout";
import { Text } from "@neshel-ui/typography";

/**
 * Navbar layout from primitives: brand, links and actions spread with justify="between".
 * For a full responsive navbar with a mobile menu, use the Navbar component.
 */
export default function RecipeNavbar() {
  return (
    <Inline
      as="header"
      space="4"
      justify="between"
      align="center"
      className="rounded-lg border border-[var(--neshel-border)] px-4 py-3"
    >
      <Text weight="bold">Acme</Text>
      <Inline as="nav" aria-label="Main" space="4">
        <a href="#features">Features</a>
        <a href="#pricing">Pricing</a>
      </Inline>
      <Button size="sm">Sign up</Button>
    </Inline>
  );
}
