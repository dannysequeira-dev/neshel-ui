"use client";
import { useLogoReveal } from "@neshel-ui/animations/svg";
import { Button } from "@neshel-ui/components";
import { useRef } from "react";

export default function S08Example() {
  const logo = useRef<SVGSVGElement>(null);
  const reveal = useLogoReveal(logo, { pattern: "circle", trigger: "mount" });
  return (
    <div className="grid justify-items-start gap-3">
      <svg ref={logo} viewBox="0 0 90 50" width={200} role="img" aria-label="Example mark">
        <path
          d="M10 40L30 10L50 40Z M60 40V10L80 40V10"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
        />
      </svg>
      <Button
        variant="outline"
        onClick={() => {
          reveal.current?.seek(0);
          reveal.current?.play();
        }}
      >
        Reveal again
      </Button>
    </div>
  );
}
