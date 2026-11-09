import {
  Button,
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@neshel-ui/components";
import { Stack } from "@neshel-ui/layout";
import { Heading, Paragraph } from "@neshel-ui/typography";

export default function PopoverBasic() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Plan details</Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start">
        <Stack space="3" className="max-w-64">
          <Heading as="h3" size="base">
            Team plan
          </Heading>
          <Paragraph size="sm" tone="muted">
            Ten seats, shared themes and priority support.
          </Paragraph>
          <PopoverClose asChild>
            <Button size="sm">Got it</Button>
          </PopoverClose>
        </Stack>
      </PopoverContent>
    </Popover>
  );
}
