"use client";
import "@neshel-ui/animations/press.css";
import { ContentSwap } from "@neshel-ui/animations/press";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function P10Example() {
  const [copied, setCopied] = useState(false);
  return (
    <Button variant="outline" onClick={() => setCopied(!copied)}>
      <ContentSwap active={copied} confirm="Copied">
        Copy link
      </ContentSwap>
    </Button>
  );
}
