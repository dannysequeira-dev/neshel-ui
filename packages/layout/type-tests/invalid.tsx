// Negative type fixtures: each `@ts-expect-error` must be needed, or `pnpm typecheck` fails.
import { Box, Center, Container, Flex, Grid, Inline, Stack } from "../src/index.js";

export function Invalid() {
  return (
    <>
      {/* space excludes spaceX / spaceY (brief §4) */}
      {/* @ts-expect-error space + spaceX */}
      <Stack space="4" spaceX="2" />
      {/* @ts-expect-error space + spaceY */}
      <Inline space="4" spaceY="2" />
      {/* @ts-expect-error space + spaceX + spaceY */}
      <Grid space="4" spaceX="2" spaceY="3" />
      {/* @ts-expect-error responsive space + responsive spaceX */}
      <Flex space={{ md: "4" }} spaceX={{ lg: "2" }} />
      {/* @ts-expect-error space + spaceY on Center */}
      <Center space="1" spaceY="1" />

      {/* No competing gap props (FR-013) */}
      {/* @ts-expect-error gap is not a prop */}
      <Stack gap="4" />
      {/* @ts-expect-error rowGap is not a prop */}
      <Grid rowGap="4" />

      {/* Values and breakpoints */}
      {/* @ts-expect-error unknown space token */}
      <Stack space="7" />
      {/* @ts-expect-error space tokens are strings */}
      <Stack space={4} />
      {/* @ts-expect-error unknown breakpoint */}
      <Stack space={{ tablet: "4" }} />
      {/* @ts-expect-error columns out of range */}
      <Grid columns={13} />
      {/* @ts-expect-error columns are numbers */}
      <Grid columns={{ md: "2" }} />

      {/* Alignment sets per component (FR-023) */}
      {/* @ts-expect-error justify-content axis rejects stretch */}
      <Stack alignY="stretch" />
      {/* @ts-expect-error baseline is meaningless on Stack X */}
      <Stack alignX="baseline" />
      {/* @ts-expect-error between belongs to justify */}
      <Inline alignX="between" />
      {/* @ts-expect-error Center has no justify */}
      <Center justify="between" />
      {/* @ts-expect-error Grid has no justify */}
      <Grid justify="center" />
      {/* @ts-expect-error align on both axes excludes stretch for flex primitives */}
      <Inline align="stretch" />
      {/* @ts-expect-error grid alignment has no baseline */}
      <Grid alignY="baseline" />

      {/* Component-specific props */}
      {/* @ts-expect-error Stack does not wrap */}
      <Stack wrap />
      {/* @ts-expect-error Flex has no separator */}
      <Flex separator />
      {/* @ts-expect-error Grid has no separator */}
      <Grid separator />
      {/* @ts-expect-error Box has no spacing */}
      <Box space="4" />
      {/* @ts-expect-error Container has no spacing */}
      <Container space="4" />
      {/* @ts-expect-error unknown display */}
      <Box display="flex" />
      {/* @ts-expect-error unknown container size */}
      <Container size="3xl" />
      {/* @ts-expect-error direction values */}
      <Flex direction="vertical" />

      {/* Composition (FR-052) */}
      {/* @ts-expect-error as + asChild */}
      <Stack as="nav" asChild>
        <nav />
      </Stack>
      {/* @ts-expect-error element outside LayoutElement */}
      <Stack as="button" />
      {/* @ts-expect-error separator must be boolean or element */}
      <Stack separator="|" />
    </>
  );
}
