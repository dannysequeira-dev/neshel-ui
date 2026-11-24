"use client";
import "@neshel-ui/animations/feedback.css";
import { LoadingButton } from "@neshel-ui/animations/feedback";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function F07Example() {
  const [loading, setLoading] = useState(false);
  const pay = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };
  return (
    <LoadingButton loading={loading}>
      <Button onClick={pay}>Pay now</Button>
    </LoadingButton>
  );
}
