import { Grid } from "@neshel-ui/layout";
import { Tile } from "./_tile";

const cards = ["Revenue", "Customers", "Orders", "Refunds", "Visits", "Conversion"];

/** One column on phones, two from sm, three from lg (responsive columns recipe). */
export default function GridColumns() {
  return (
    <Grid columns={{ base: 1, sm: 2, lg: 3 }} space={{ base: "2", md: "4" }}>
      {cards.map((card) => (
        <Tile key={card}>{card}</Tile>
      ))}
    </Grid>
  );
}
