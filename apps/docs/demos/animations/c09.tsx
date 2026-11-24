"use client";
import "@neshel-ui/animations/cinematic.css";
import { Storyboard, StoryboardFrame } from "@neshel-ui/animations/cinematic";

export default function C09Example() {
  return (
    <Storyboard
      label="A day"
      interval={5000}
      transition="slide"
      // The controls are plain buttons: with a CSS reset, give them a 24 px target size.
      className="[&_button]:min-h-6 [&_button]:min-w-6"
    >
      {["Sunrise", "Noon", "Dusk"].map((moment) => (
        <StoryboardFrame key={moment} label={moment}>
          <p className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground">
            {moment}
          </p>
        </StoryboardFrame>
      ))}
    </Storyboard>
  );
}
