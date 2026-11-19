// Phase 013 PT10 — React Router adapter against the installed react-router@8.5.0 (data router in memory):
// progress follows the router's REAL navigation state (a slow loader), focus moves only after the commit,
// and links keep their native behaviour. The Next.js adapter is verified in a real Next 16.4.5 consumer
// (check:animations:routers), since it needs the App Router runtime.
import assert from "node:assert/strict";
import test from "node:test";
import { setupGestureDom } from "./gesture-helpers.mjs";
import { h, mount } from "./helpers.mjs";

await setupGestureDom();
globalThis.Request ??= window.Request;
const rr = await import("react-router");
const { RouterPageTransitions } = await import("../dist/page-transitions/react-router.js");
const { act } = await import("react");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("React Router adapter: pending from a slow loader drives PT07; focus after commit; idle at the end", async () => {
  let release;
  const routes = [
    {
      path: "/",
      element: h(RouterPageTransitions, { progress: { delay: 0, minVisible: 0 } }, h(rr.Outlet)),
      children: [
        { index: true, element: h("h1", { "data-neshel-route-focus": "" }, "Home") },
        {
          path: "slow",
          // Only the first load is slow (the later traverse back must not wait for the test).
          loader: () =>
            release ? null : new Promise((resolve) => (release = () => resolve(null))),
          element: h("h1", { "data-neshel-route-focus": "", id: "slow-title" }, "Slow"),
        },
        {
          path: "broken",
          loader: () => {
            throw new Error("loader failed");
          },
          element: h("h1", null, "never"),
          errorElement: h("p", { id: "route-error" }, "Failed"),
        },
      ],
    },
  ];
  const router = rr.createMemoryRouter(routes, { initialEntries: ["/"] });
  const view = await mount(h(rr.RouterProvider, { router }));
  const bar = view.container.querySelector(".neshel-route-progress");
  assert.ok(bar, "progress bar rendered by the adapter");
  assert.equal(bar.getAttribute("data-state"), "idle");

  await act(async () => {
    void router.navigate("/slow");
    await wait(5);
  });
  assert.equal(router.state.navigation.state, "loading");
  assert.equal(bar.getAttribute("data-state"), "pending", "a click is not a completed navigation");
  assert.equal(view.container.querySelector("h1").textContent, "Home", "old route still shown");

  await act(async () => {
    release();
    await wait(5);
  });
  assert.equal(view.container.querySelector("h1").textContent, "Slow");
  assert.equal(bar.getAttribute("data-state"), "complete", "completed when the route committed");
  await act(async () => wait(10));
  assert.equal(bar.getAttribute("data-state"), "idle", "never left pending after the commit");
  assert.equal(document.activeElement?.id, "slow-title", "focus moved after the committed push");

  await act(async () => {
    await router.navigate("/broken");
    await wait(5);
  });
  assert.ok(view.container.querySelector("#route-error"), "error boundary shown");
  await act(async () => wait(10));
  assert.equal(
    bar.getAttribute("data-state"),
    "idle",
    "a failed navigation does not leave it active",
  );

  document.body.focus();
  await act(async () => {
    await router.navigate(-1);
    await wait(5);
  });
  assert.notEqual(document.activeElement?.id, "slow-title", "no focus move on traverse (POP)");
  await view.unmount();
});
