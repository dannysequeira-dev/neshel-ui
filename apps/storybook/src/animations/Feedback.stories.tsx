import "@neshel-ui/animations/feedback.css";
import { motionValue } from "@neshel-ui/animations/core";
import {
  DotsPulse,
  EnterExit,
  LoadingButton,
  OptimisticPulse,
  type OptimisticStatus,
  PendingText,
  ProgressBar,
  ProgressRing,
  Shimmer,
  SkeletonShimmer,
  Spinner,
  SuccessMark,
} from "@neshel-ui/animations/feedback";
import { Button, createToaster, Skeleton, Toaster } from "@neshel-ui/components";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useMemo, useState } from "react";

const meta = {
  title: "Animations (experimental)/Loading & Feedback",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Phase 015, private package (`@neshel-ui/animations/feedback` + `feedback.css`). Semantics before motion: indicators are ARIA progressbars with a name and a value only when it is known; skeletons are hidden from assistive technology (mark the region `aria-busy`); the success mark never announces. F06 is enter/exit motion only: the notifications themselves are the `@neshel-ui/components` Toaster (feature 017), which F06 can move (`<EnterExit>` around a Toaster with motion set to none). Works with `@neshel-ui/components` (`Button`, `Skeleton`, `Toaster`) through DOM contracts — no dependency in either direction. Under reduced motion loading indicators keep a slow opacity pulse.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const F01Spinner: Story = {
  render: () => (
    <p>
      <Spinner label="Loading results" /> Loading results…
    </p>
  ),
};

export const F02SkeletonShimmer: Story = {
  render: () => (
    <section
      aria-busy="true"
      aria-label="Loading profile"
      style={{ display: "grid", gap: 8, width: 280 }}
    >
      <SkeletonShimmer shape="circle" />
      <SkeletonShimmer width="12rem" />
      <Shimmer>
        <Skeleton />
      </Shimmer>
      <small>The last line is a Components Skeleton with the shimmer token.</small>
    </section>
  ),
};

export const F03ProgressBar: Story = {
  render: () => {
    const [value, setValue] = useState(30);
    return (
      <div style={{ display: "grid", gap: 12, width: 320 }}>
        <ProgressBar label="Preparing export" />
        <ProgressBar label="Uploading files" value={value} valueText={`${value} of 100 files`} />
        <button type="button" onClick={() => setValue((v) => Math.min(100, v + 10))}>
          More progress
        </button>
      </div>
    );
  },
};

export const F04DotsPulse: Story = {
  render: () => (
    <p>
      Connecting <DotsPulse label="Connecting" />
    </p>
  ),
};

export const F05SuccessMark: Story = {
  render: () => {
    const [done, setDone] = useState(false);
    return (
      <div style={{ display: "flex", gap: 12, alignItems: "center", color: "#188038" }}>
        <SuccessMark show={done} />
        <button type="button" onClick={() => setDone((d) => !d)}>
          {done ? "Reset" : "Complete"}
        </button>
        <span role="status">{done ? "Saved" : ""}</span>
      </div>
    );
  },
};

/** F06 moving a Components Toaster (the toaster owns messages, roles, timers and focus). */
export const F06EnterExit: Story = {
  render: () => {
    const toaster = useMemo(() => createToaster({ max: 3 }), []);
    useEffect(() => () => toaster.destroy(), [toaster]);
    return (
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => toaster.show({ title: "Draft saved", description: "Version 3 stored" })}
        >
          Show toast
        </button>
        <button
          type="button"
          onClick={() =>
            toaster.show({
              title: "Message archived",
              action: { label: "Undo", onAction: () => {} },
            })
          }
        >
          Toast with action
        </button>
        <button
          type="button"
          onClick={() => toaster.show({ title: "Upload failed", tone: "error" })}
        >
          Error
        </button>
        <EnterExit from="bottom" exitTo="end">
          <Toaster toaster={toaster} motion="none" />
        </EnterExit>
      </div>
    );
  },
};

export const F07LoadingButton: Story = {
  render: () => {
    const [loading, setLoading] = useState(false);
    return (
      <LoadingButton loading={loading}>
        <Button
          onClick={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 2000);
          }}
        >
          Pay now
        </Button>
      </LoadingButton>
    );
  },
};

export const F08OptimisticPulse: Story = {
  render: () => {
    const [status, setStatus] = useState<OptimisticStatus>("idle");
    const [likes, setLikes] = useState(10);
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <OptimisticPulse status={status} onRollback={() => setLikes((n) => n - 1)}>
          <button
            type="button"
            style={{ borderRadius: 8 }}
            onClick={() => {
              setLikes((n) => n + 1);
              setStatus("pending");
            }}
          >
            ♥ {likes}
          </button>
        </OptimisticPulse>
        <button type="button" onClick={() => setStatus("confirmed")}>
          Server confirms
        </button>
        <button type="button" onClick={() => setStatus("failed")}>
          Server fails (roll back)
        </button>
      </div>
    );
  },
};

export const F09ProgressRing: Story = {
  render: () => {
    const progress = useMemo(() => motionValue(0.35), []);
    return (
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <ProgressRing label="Rendering" progress={progress} />
        <input
          type="range"
          aria-label="Ring progress"
          min={0}
          max={100}
          defaultValue={35}
          onInput={(e) => progress.set(Number((e.target as HTMLInputElement).value) / 100)}
        />
        <ProgressRing label="Waiting" />
      </div>
    );
  },
};

export const F10PendingText: Story = {
  render: () => {
    const [pending, setPending] = useState(true);
    return (
      <p>
        <PendingText pending={pending}>Saving your changes</PendingText>{" "}
        <button type="button" onClick={() => setPending((p) => !p)}>
          Toggle
        </button>
      </p>
    );
  },
};
