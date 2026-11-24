"use client";
import "@neshel-ui/animations/gestures.css";
import { ElasticScroll } from "@neshel-ui/animations/gestures";

export default function G06Example() {
  return (
    <ElasticScroll
      label="Release notes"
      style={{ height: 180 }}
      className="rounded-xl border border-neshel-border"
    >
      {Array.from({ length: 12 }, (_, index) => (
        <p key={index} className="px-4 py-1">
          Note {index + 1}
        </p>
      ))}
    </ElasticScroll>
  );
}
