import "@neshel-ui/animations/page-transitions.css";
import {
  getViewTransitionSupport,
  type PageEffect,
  PageTransition,
  PersistentElement,
  RouteProgress,
  SharedElement,
  startPageTransition,
  useNavigationDirection,
  usePageTransition,
} from "@neshel-ui/animations/page-transitions";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, useState } from "react";

interface Args {
  effect: PageEffect;
}

const meta = {
  title: "Animations (experimental)/Page Transitions",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Phase 013, private package (`@neshel-ui/animations/page-transitions` + `page-transitions.css`). Native View Transitions first: effects animate only the browser's snapshot pseudo-elements, keyed on `neshel-pt-*` classes. Without the API, under reduced motion (instant effects) or on a hidden page, the update runs at once — navigation never waits for an effect. Router adapters (`/next`, `/react-router`) are verified against real Next.js 16.4.5 and React Router 8.5.0 consumers. Cross-document (MPA) transitions: `page-transitions-mpa.css` in both documents (Chromium/WebKit; Firefox navigates normally).",
      },
    },
  },
  args: { effect: "slide" },
  argTypes: {
    effect: { control: "inline-radio", options: ["fade", "slide", "scale", "wipe", "none"] },
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

const card: CSSProperties = {
  padding: 16,
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  background: "#fff",
};
const photo: CSSProperties = {
  borderRadius: 10,
  background: "linear-gradient(135deg, #f59e0b, #ef4444)",
};

function MiniApp({ effect }: Args) {
  const [page, setPage] = useState<"list" | "detail">("list");
  const transition = usePageTransition();
  const { direction } = useNavigationDirection();
  const support = getViewTransitionSupport();
  return (
    <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
      <p>
        Native same-document transitions:{" "}
        <strong>{support.sameDocument ? "yes" : "no (fallback)"}</strong>
        {" · "}last direction: <output>{direction}</output>
      </p>
      <PersistentElement name="story-player" asChild>
        <div style={{ ...card, background: "#111827", color: "#fff", width: "max-content" }}>
          ♪ PT08 persistent player
        </div>
      </PersistentElement>
      <PageTransition effect={effect} style={card}>
        {page === "list" ? (
          <>
            <h3>Gallery</h3>
            <SharedElement name="story-photo" asChild>
              <div style={{ ...photo, width: 96, height: 72 }} />
            </SharedElement>
            <button
              type="button"
              onClick={() =>
                transition.start(() => setPage("detail"), { effect, direction: "forward" })
              }
            >
              Open photo (PT02 morph)
            </button>
          </>
        ) : (
          <>
            <h3>Photo detail</h3>
            <SharedElement name="story-photo" asChild>
              <div style={{ ...photo, height: 200 }} />
            </SharedElement>
            <button
              type="button"
              onClick={() => transition.start(() => setPage("list"), { effect, direction: "back" })}
            >
              Back (PT04 direction)
            </button>
          </>
        )}
      </PageTransition>
    </div>
  );
}

function ProgressDemo() {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button
        type="button"
        onClick={() => {
          setFailed(false);
          setPending(true);
          setTimeout(() => setPending(false), 1200);
        }}
      >
        Slow navigation
      </button>
      <button
        type="button"
        onClick={() => {
          setFailed(true);
          setPending(true);
          setTimeout(() => setPending(false), 500);
        }}
      >
        Failing navigation
      </button>
      <RouteProgress pending={pending} failed={failed} announce style={{ color: "#4f46e5" }} />
    </div>
  );
}

function VanillaDemo({ effect }: Args) {
  const [count, setCount] = useState(0);
  return (
    <div style={{ display: "grid", gap: 8, maxWidth: 420 }}>
      <p id="story-vanilla" style={card}>
        Framework-free update {count}
      </p>
      <button
        type="button"
        onClick={() =>
          startPageTransition(
            () => {
              const target = document.getElementById("story-vanilla");
              if (target) target.textContent = `Framework-free update ${count + 1}`;
              setCount((n) => n + 1);
            },
            { effect, scope: document.getElementById("story-vanilla") ?? undefined },
          )
        }
      >
        startPageTransition
      </button>
    </div>
  );
}

export const SpaTransitions: Story = {
  name: "PT01 fade · PT02 shared morph · PT03 slide · PT04 direction · PT05 scale · PT06 wipe · PT08 persistent",
  render: (args) => <MiniApp {...args} />,
};

export const RouteProgressStory: Story = {
  name: "PT07 route progress (indeterminate, completes, fails)",
  render: () => <ProgressDemo />,
};

export const FrameworkFree: Story = {
  name: "PT10 router-free contract — startPageTransition on a scope",
  render: (args) => <VanillaDemo {...args} />,
};

export const CrossDocument: Story = {
  name: "PT09 cross-document (MPA) — how to opt in",
  render: () => (
    <div style={{ ...card, maxWidth: 560 }}>
      <p>
        Include <code>@neshel-ui/animations/page-transitions-mpa.css</code> in both same-origin
        documents (it contains <code>@view-transition &#123; navigation: auto &#125;</code>,
        disabled under reduced motion). Optionally call{" "}
        <code>enableCrossDocumentTransitions()</code> early to add effect and direction types.
      </p>
      <p>
        Verified natively in Chromium 158 and Playwright WebKit 27.2; Firefox 159 navigates
        normally. A live two-page demo is in the Playground (<code>mpa-a.html</code> →{" "}
        <code>mpa-b.html</code>).
      </p>
    </div>
  ),
};
