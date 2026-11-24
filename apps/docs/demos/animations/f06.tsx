"use client";
import { EnterExit } from "@neshel-ui/animations/feedback";
import { Button, createToaster, Toaster } from "@neshel-ui/components";

const toaster = createToaster({ max: 3 });

export default function F06Example() {
  return (
    <div>
      <Button onClick={() => toaster.show({ title: "Draft saved" })}>Show a toast</Button>
      <EnterExit from="bottom" exitTo="end">
        <Toaster toaster={toaster} motion="none" label="Example notifications" hotkey="F9" />
      </EnterExit>
    </div>
  );
}
