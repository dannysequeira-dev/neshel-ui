import { Container, Stack } from "@neshel-ui/layout";
import { Tile } from "./_tile";

const sizes = ["sm", "md", "lg"] as const;

/** Page container: a centred max-width with a responsive inline gutter. */
export default function ContainerSizes() {
  return (
    <Stack space="3">
      {sizes.map((size) => (
        <Container key={size} size={size} gutter={{ base: "2", md: "4" }}>
          <Tile>Container size “{size}”</Tile>
        </Container>
      ))}
    </Stack>
  );
}
