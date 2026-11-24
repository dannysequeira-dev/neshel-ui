"use client";
import "@neshel-ui/animations/media.css";
import { Lightbox } from "@neshel-ui/animations/media";
import { picture } from "./picture";

export default function M07Example() {
  return (
    <Lightbox
      label="Violet gradient, enlarged"
      thumbnail={
        <img
          src={picture("Open", 280, 330)}
          alt="Open the violet gradient"
          width={192}
          height={120}
        />
      }
    >
      <img src={picture("Large", 280, 330)} alt="Violet gradient" width={640} height={400} />
    </Lightbox>
  );
}
