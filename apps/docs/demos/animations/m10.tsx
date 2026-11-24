"use client";
import "@neshel-ui/animations/media.css";
import { HoverPan } from "@neshel-ui/animations/media";
import { picture } from "./picture";

export default function M10Example() {
  return (
    <HoverPan
      keyboard
      label="Pan the detail with the arrow keys"
      className="h-52 w-80 max-w-full rounded-xl"
    >
      <img src={picture("Pan", 30, 300)} alt="Gradient detail" width={640} height={400} />
    </HoverPan>
  );
}
