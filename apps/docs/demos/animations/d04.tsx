"use client";
import "@neshel-ui/animations/gpu.css";
import { PageCurl, type PageCurlControl } from "@neshel-ui/animations/gpu";
import { Button } from "@neshel-ui/components";
import { useRef } from "react";
import { picture } from "./picture";

export default function D04Example() {
  const curl = useRef<PageCurlControl | null>(null);
  return (
    <div className="grid justify-items-start gap-3">
      <PageCurl
        controlRef={curl}
        className="w-80 max-w-full rounded-xl"
        front={<img src={picture("Page one", 210, 260)} alt="Page one" width={640} height={400} />}
        under={<div className="p-6">Page two, live HTML underneath</div>}
      />
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => curl.current?.play()}>
          Turn
        </Button>
        <Button variant="outline" onClick={() => curl.current?.reverse()}>
          Back
        </Button>
      </div>
    </div>
  );
}
