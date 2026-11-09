import {
  Button,
  Input,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@neshel-ui/components";
import { Inline } from "@neshel-ui/layout";

const sides = ["left", "right", "top", "bottom"] as const;

export default function SheetSides() {
  return (
    <Inline space="3" wrap>
      {sides.map((side) => (
        <Sheet key={side}>
          <SheetTrigger asChild>
            <Button variant="outline">Open {side}</Button>
          </SheetTrigger>
          <SheetContent side={side}>
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Narrow the results ({side} sheet).</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <Input aria-label="Keyword" placeholder="Keyword" />
            </SheetBody>
          </SheetContent>
        </Sheet>
      ))}
    </Inline>
  );
}
