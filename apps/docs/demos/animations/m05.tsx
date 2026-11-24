"use client";
import { Duotone, type ProgressControl } from "@neshel-ui/animations/media";
import { Button } from "@neshel-ui/components";
import { useRef } from "react";
import { picture } from "./picture";

export default function M05Example() {
  const control = useRef<ProgressControl | null>(null);
  return (
    <div className="grid justify-items-start gap-3">
      <Duotone controlRef={control} trigger="manual">
        <img src={picture("Duotone", 120, 200)} alt="Green gradient" width={320} height={200} />
      </Duotone>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => control.current?.play()}>
          Duotone
        </Button>
        <Button variant="outline" onClick={() => control.current?.reverse()}>
          Original
        </Button>
      </div>
    </div>
  );
}
