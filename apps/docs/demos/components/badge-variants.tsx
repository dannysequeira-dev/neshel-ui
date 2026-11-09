import { Badge } from "@neshel-ui/components";
import { Inline } from "@neshel-ui/layout";

const variants = [
  "default",
  "secondary",
  "outline",
  "success",
  "warning",
  "destructive",
  "accent",
] as const;

export default function BadgeVariants() {
  return (
    <Inline space="2" align="center" wrap>
      {variants.map((variant) => (
        <Badge key={variant} variant={variant}>
          {variant}
        </Badge>
      ))}
      <Badge size="sm" variant="success">
        Small
      </Badge>
    </Inline>
  );
}
