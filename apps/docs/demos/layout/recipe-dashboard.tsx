import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@neshel-ui/components";
import { Grid, Stack } from "@neshel-ui/layout";
import { Heading, Text } from "@neshel-ui/typography";

const stats = [
  { label: "Revenue", value: "$48,200" },
  { label: "Active users", value: "1,284" },
  { label: "Open tickets", value: "17" },
  { label: "Uptime", value: "99.95%" },
];

/** Dashboard grid: KPI cards (1 → 2 → 4 columns) above a two-column content area. */
export default function RecipeDashboard() {
  return (
    <Stack space="6">
      <Grid columns={{ base: 1, sm: 2, xl: 4 }} space="4">
        {stats.map((stat) => (
          <Card key={stat.label} padding="sm">
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle as="p">
                <Text size="2xl" weight="bold">
                  {stat.value}
                </Text>
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </Grid>
      <Grid columns={{ base: 1, lg: 3 }} space="4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Text tone="muted">Chart placeholder</Text>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Heading as="h3" size="base">
              Team
            </Heading>
          </CardHeader>
          <CardContent>
            <Text tone="muted">Members list</Text>
          </CardContent>
        </Card>
      </Grid>
    </Stack>
  );
}
