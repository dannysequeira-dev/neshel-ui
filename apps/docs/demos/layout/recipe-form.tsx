import { Button, Input, Label } from "@neshel-ui/components";
import { Grid, Inline, Stack } from "@neshel-ui/layout";
import { Heading } from "@neshel-ui/typography";

/** Form layout: label/field pairs in a Stack, two columns from md, actions at the end. */
export default function RecipeForm() {
  return (
    <Stack as="form" space="6" aria-labelledby="recipe-form-title" className="max-w-xl">
      <Heading as="h3" size="lg" id="recipe-form-title">
        Billing details
      </Heading>
      <Grid columns={{ base: 1, md: 2 }} spaceX="4" spaceY="5">
        <Stack space="2">
          <Label htmlFor="recipe-first">First name</Label>
          <Input id="recipe-first" name="firstName" autoComplete="given-name" />
        </Stack>
        <Stack space="2">
          <Label htmlFor="recipe-last">Last name</Label>
          <Input id="recipe-last" name="lastName" autoComplete="family-name" />
        </Stack>
      </Grid>
      <Stack space="2">
        <Label htmlFor="recipe-email">Email</Label>
        <Input id="recipe-email" name="email" type="email" autoComplete="email" />
      </Stack>
      <Inline space="3" justify="end">
        <Button type="reset" variant="ghost">
          Reset
        </Button>
        <Button type="submit">Save</Button>
      </Inline>
    </Stack>
  );
}
