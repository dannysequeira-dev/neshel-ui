"use client";
import { Component, type ReactNode, Suspense } from "react";
import { effectDemos } from "@/demos/animations/registry";

class ExampleBoundary extends Component<
  { children: ReactNode; message: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <p role="alert">{this.props.message}</p> : this.props.children;
  }
}

/** Mounts the example of one effect; every example is its own lazily loaded module. */
export function EffectCanvas({
  id,
  loading,
  failed,
}: {
  id: string;
  loading: string;
  failed: string;
}) {
  const Demo = effectDemos[id];
  if (!Demo) return null;
  return (
    <ExampleBoundary message={failed}>
      <Suspense fallback={<p>{loading}</p>}>
        <div data-effect-example={id}>
          <Demo />
        </div>
      </Suspense>
    </ExampleBoundary>
  );
}
