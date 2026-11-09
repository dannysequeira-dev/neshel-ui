"use client";
import {
  MobileMenu,
  MobileMenuContent,
  MobileMenuLink,
  MobileMenuNav,
  MobileMenuTrigger,
} from "@neshel-ui/components";
import { Inline } from "@neshel-ui/layout";
import { Text } from "@neshel-ui/typography";
import { useState } from "react";

/**
 * A MobileMenu that stays available at every width (breakpoint "2xl" hides it only from 96rem),
 * controlled so the page can show its state. It closes after a link is activated.
 */
export default function MobileMenuBasic() {
  const [open, setOpen] = useState(false);
  return (
    <Inline space="3" align="center">
      <MobileMenu breakpoint="2xl" open={open} onOpenChange={setOpen}>
        <MobileMenuTrigger label="Open navigation" />
        <MobileMenuContent title="Navigation">
          <MobileMenuNav>
            <MobileMenuLink href="#home" active>
              Home
            </MobileMenuLink>
            <MobileMenuLink href="#pricing">Pricing</MobileMenuLink>
            <MobileMenuLink href="#contact">Contact</MobileMenuLink>
          </MobileMenuNav>
        </MobileMenuContent>
      </MobileMenu>
      <Text tone="muted" size="sm">
        open: {String(open)}
      </Text>
    </Inline>
  );
}
