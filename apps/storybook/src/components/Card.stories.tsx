import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@neshel-ui/components";
import { Grid } from "@neshel-ui/layout";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Foundation/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Composable, context-free parts. `CardTitle` defaults to `h3`; choose the level with `as`. Cards are not interactive: put buttons or links inside, never wrap a card in one.",
      },
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

const content = (
  <>
    <CardHeader>
      <CardTitle>Account overview</CardTitle>
      <CardDescription>Your latest activity.</CardDescription>
      <CardAction>
        <Badge variant="success">Active</Badge>
      </CardAction>
    </CardHeader>
    <CardContent>
      <p style={{ margin: 0 }}>Account information</p>
    </CardContent>
    <CardFooter>
      <Button>Continue</Button>
      <Button variant="ghost">Later</Button>
    </CardFooter>
  </>
);

export const Default: Story = { render: () => <Card style={{ maxWidth: 420 }}>{content}</Card> };

export const Variants: Story = {
  render: () => (
    <Grid columns={{ base: 1, tablet: 3 }} space="4">
      <Card variant="default">{content}</Card>
      <Card variant="outline">{content}</Card>
      <Card variant="muted">{content}</Card>
    </Grid>
  ),
};

export const SemanticElement: Story = {
  render: () => (
    <Card as="article" aria-labelledby="card-title" padding="lg" style={{ maxWidth: 420 }}>
      <CardHeader>
        <CardTitle as="h2" id="card-title">
          Article card
        </CardTitle>
        <CardDescription>Rendered as an article with an h2 title.</CardDescription>
      </CardHeader>
    </Card>
  ),
};
