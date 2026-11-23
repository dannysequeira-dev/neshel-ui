import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@neshel-ui/components";

export default function AccordionBasic() {
  return (
    // Single (default) and collapsible: one section at a time, the open one can close again.
    <Accordion collapsible defaultValue="install" style={{ maxWidth: 520 }}>
      <AccordionItem value="install">
        <AccordionTrigger>How do I install it?</AccordionTrigger>
        <AccordionContent>Add @neshel-ui/components and import its stylesheet.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="tailwind">
        <AccordionTrigger>Does it need Tailwind?</AccordionTrigger>
        <AccordionContent>
          No. The stylesheet is precompiled and works with plain CSS.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="pricing" disabled>
        <AccordionTrigger>Is there a paid plan?</AccordionTrigger>
        <AccordionContent>Not yet.</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
