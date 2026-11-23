import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@neshel-ui/components";

export default function CollapsibleBasic() {
  return (
    <Collapsible>
      <CollapsibleTrigger>Show release notes</CollapsibleTrigger>
      <CollapsibleContent>
        <p>Accordion, Collapsible, Switch and Toast are now part of the components.</p>
      </CollapsibleContent>
    </Collapsible>
  );
}
