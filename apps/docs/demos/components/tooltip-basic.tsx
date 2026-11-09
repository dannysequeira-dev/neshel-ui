import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@neshel-ui/components";
import { Inline } from "@neshel-ui/layout";
import { Copy, Trash2 } from "lucide-react";

export default function TooltipBasic() {
  return (
    <Inline space="2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button iconOnly variant="ghost" aria-label="Copy link">
            <Copy aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copy link</TooltipContent>
      </Tooltip>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button iconOnly variant="ghost" aria-label="Delete">
            <Trash2 aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Delete (no delay)</TooltipContent>
      </Tooltip>
    </Inline>
  );
}
