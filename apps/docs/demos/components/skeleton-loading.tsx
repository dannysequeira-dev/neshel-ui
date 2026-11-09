import { Skeleton } from "@neshel-ui/components";
import { Inline, Stack } from "@neshel-ui/layout";

export default function SkeletonLoading() {
  return (
    // The region announces its busy state; the skeletons themselves are aria-hidden.
    <section aria-busy="true" aria-label="Loading profile">
      <Stack space="4">
        <Inline space="3" alignY="center">
          <Skeleton shape="circle" width={48} />
          <Stack space="2" className="flex-1">
            <Skeleton shape="text" width="60%" />
            <Skeleton shape="text" width="40%" />
          </Stack>
        </Inline>
        <Skeleton height={96} />
      </Stack>
    </section>
  );
}
