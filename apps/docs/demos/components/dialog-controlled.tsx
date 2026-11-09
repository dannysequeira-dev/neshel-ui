"use client";
import { Button, Dialog, DialogContent, DialogFooter, DialogTitle } from "@neshel-ui/components";
import { Inline } from "@neshel-ui/layout";
import { Text } from "@neshel-ui/typography";
import { useState } from "react";

export default function DialogControlled() {
  const [open, setOpen] = useState(false);
  return (
    <Inline space="3" align="center">
      <Button onClick={() => setOpen(true)}>Open (controlled)</Button>
      <Text tone="muted">open: {String(open)}</Text>
      <Dialog open={open} onOpenChange={setOpen}>
        {/* No description: opt out of aria-describedby explicitly. */}
        <DialogContent size="sm" aria-describedby={undefined}>
          <DialogTitle>Controlled dialog</DialogTitle>
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Inline>
  );
}
