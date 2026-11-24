"use client";
import "@neshel-ui/animations/feedback.css";
import { Shimmer, SkeletonShimmer } from "@neshel-ui/animations/feedback";
import { Skeleton } from "@neshel-ui/components";

export default function F02Example() {
  return (
    <section aria-busy="true" aria-label="Loading profile" className="grid w-72 gap-3">
      <SkeletonShimmer shape="circle" />
      <SkeletonShimmer width="12rem" />
      <Shimmer>
        <Skeleton className="h-4 w-full" />
      </Shimmer>
    </section>
  );
}
