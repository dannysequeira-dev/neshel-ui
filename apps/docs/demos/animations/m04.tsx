"use client";
import "@neshel-ui/animations/media.css";
import { CompareSlider } from "@neshel-ui/animations/media";
import { picture } from "./picture";

export default function M04Example() {
  return (
    <CompareSlider
      label="Compare the edit"
      before={
        <img
          src={picture("Before", 210, 260)}
          alt="Before: cool tones"
          className="h-full w-full object-cover"
        />
      }
      after={
        <img
          src={picture("After", 20, 330)}
          alt="After: warm tones"
          className="h-full w-full object-cover"
        />
      }
      jumps={{ before: "Show before", after: "Show after" }}
      className="h-56 w-80 max-w-full"
    />
  );
}
