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
import { Paragraph } from "@neshel-ui/typography";

const variants = ["default", "outline", "muted"] as const;

export default function CardBasic() {
  return (
    <Grid columns={{ base: 1, md: 3 }} space="4">
      {variants.map((variant) => (
        <Card key={variant} variant={variant} as="article" aria-labelledby={`card-${variant}`}>
          <CardHeader>
            <CardTitle id={`card-${variant}`}>Account overview</CardTitle>
            <CardDescription>Variant “{variant}”.</CardDescription>
            <CardAction>
              <Badge variant="success">Active</Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <Paragraph size="sm">Three projects, two pending invitations.</Paragraph>
          </CardContent>
          <CardFooter>
            <Button size="sm">Open</Button>
            <Button size="sm" variant="ghost">
              Later
            </Button>
          </CardFooter>
        </Card>
      ))}
    </Grid>
  );
}
