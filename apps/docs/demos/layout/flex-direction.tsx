import { Flex } from "@neshel-ui/layout";
import { Tile } from "./_tile";

/** A column on small screens, a row from md: alignment props follow the direction. */
export default function FlexDirection() {
  return (
    <Flex
      direction={{ base: "column", md: "row" }}
      space="3"
      alignX={{ base: "stretch", md: "start" }}
      alignY="center"
    >
      <Tile tall>Image</Tile>
      <Tile>Title and description</Tile>
      <Tile>Actions</Tile>
    </Flex>
  );
}
