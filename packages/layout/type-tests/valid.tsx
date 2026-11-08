// Positive type fixtures: everything here must type-check (`pnpm typecheck`).
import { useRef } from "react";
import {
  Box,
  Center,
  Container,
  Flex,
  Grid,
  Inline,
  type Responsive,
  type SpaceValue,
  Stack,
  type StackProps,
} from "../src/index.js";

export function Valid() {
  const ref = useRef<HTMLElement>(null);
  const responsiveSpace: Responsive<SpaceValue> = { base: "2", md: "4", "2xl": "24" };
  const spread: StackProps = { space: "4", align: "center" };
  return (
    <>
      <Stack space="4" />
      <Inline spaceX="4" />
      <Inline spaceY="2" />
      <Grid spaceX="4" spaceY="2" />
      <Grid columns={{ base: 1, md: 2, lg: 4 }} space={{ base: "2", md: "4" }} />
      <Stack spaceY={{ base: "3", lg: "6" }} alignX={{ base: "start", lg: "center" }} />
      <Stack space={responsiveSpace} {...spread} />
      <Stack space={undefined} spaceX="2" />
      <Inline align="center" justify="between" wrap={{ base: true, md: false }} />
      <Inline alignY="baseline" />
      <Stack alignX="stretch" alignY="end" justify="evenly" />
      <Flex direction={{ base: "column", md: "row" }} alignX="center" alignY="stretch" />
      <Center alignX="start" alignY="baseline" space="2" />
      <Grid align="stretch" alignX="start" />
      <Box display={{ base: "none", md: "block" }} id="box" aria-hidden />
      <Container size={{ base: "full", lg: "lg" }} gutter="4" />
      <Stack
        as="section"
        aria-label="Settings"
        ref={ref}
        onClick={(event) => event.currentTarget}
      />
      <Stack asChild space="4">
        <section aria-label="Settings" />
      </Stack>
      <Stack separator space="4">
        <p>A</p>
        <p>B</p>
      </Stack>
      <Inline separator={<span aria-hidden="true">|</span>} space="3" />
      <Inline separator={false} wrap />
      <Box className="x" style={{ color: "red" }} data-testid="box" />
    </>
  );
}
