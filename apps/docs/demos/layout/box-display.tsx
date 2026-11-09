import { Box, Inline } from "@neshel-ui/layout";
import { Tile } from "./_tile";

/** Box adds semantics and a responsive display without extra styling. */
export default function BoxDisplay() {
  return (
    <Inline space="3" align="center">
      <Box as="section" aria-label="Always visible">
        <Tile>Always visible</Tile>
      </Box>
      {/* Hidden below md, block from md (resize the window to see it). */}
      <Box display={{ base: "none", md: "block" }}>
        <Tile>Visible from md</Tile>
      </Box>
    </Inline>
  );
}
