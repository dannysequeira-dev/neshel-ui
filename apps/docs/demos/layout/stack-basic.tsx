import { Stack } from "@neshel-ui/layout";
import { Tile } from "./_tile";

export default function StackBasic() {
  return (
    <Stack space={{ base: "2", md: "4" }} alignX="start">
      <Tile>First</Tile>
      <Tile>Second, a little longer</Tile>
      <Tile>Third</Tile>
    </Stack>
  );
}
