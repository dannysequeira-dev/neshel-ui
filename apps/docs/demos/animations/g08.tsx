"use client";
import "@neshel-ui/animations/gestures.css";
import { PinchZoom } from "@neshel-ui/animations/gestures";
import { picture } from "./picture";

export default function G08Example() {
  return (
    <PinchZoom maxScale={4} style={{ width: 360, maxWidth: "100%" }}>
      <img src={picture("Map", 120, 200)} alt="Green map" width={640} height={400} />
    </PinchZoom>
  );
}
