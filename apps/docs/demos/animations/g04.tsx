"use client";
import "@neshel-ui/animations/gestures.css";
import { PullToRefresh } from "@neshel-ui/animations/gestures";
import { useState } from "react";

export default function G04Example() {
  const [loads, setLoads] = useState(0);
  return (
    <PullToRefresh
      scrollerLabel="Feed"
      style={{ height: 220 }}
      onRefresh={async () => {
        await new Promise((resolve) => setTimeout(resolve, 600));
        setLoads((n) => n + 1);
      }}
    >
      <p>Refreshed {loads} times. Pull down at the top or use the button.</p>
      {Array.from({ length: 10 }, (_, index) => (
        <p key={index}>Entry {index + 1}</p>
      ))}
    </PullToRefresh>
  );
}
