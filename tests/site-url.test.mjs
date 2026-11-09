// Documentation origin resolution for Vercel (deployment decision 2026-11-09).
import assert from "node:assert/strict";
import test from "node:test";
import { resolveSite } from "../apps/docs/site-url.mjs";

test("explicit NESHEL_DOCS_SITE_URL wins and is indexable", () => {
  assert.deepEqual(
    resolveSite({
      NESHEL_DOCS_SITE_URL: "https://docs.example.org/",
      VERCEL: "1",
      VERCEL_ENV: "production",
      VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app",
    }),
    {
      siteUrl: "https://docs.example.org",
      indexable: true,
      source: "NESHEL_DOCS_SITE_URL",
    },
  );
});

test("Vercel production uses the project production domain", () => {
  const site = resolveSite({
    VERCEL: "1",
    VERCEL_ENV: "production",
    VERCEL_PROJECT_PRODUCTION_URL: "neshel.vercel.app",
    VERCEL_URL: "neshel-abc.vercel.app",
  });
  assert.equal(site.siteUrl, "https://neshel.vercel.app");
  assert.equal(site.indexable, true);
});

test("Vercel previews use their own URL and are never indexable", () => {
  const site = resolveSite({
    VERCEL: "1",
    VERCEL_ENV: "preview",
    VERCEL_PROJECT_PRODUCTION_URL: "neshel.vercel.app",
    VERCEL_URL: "neshel-abc.vercel.app",
  });
  assert.equal(site.siteUrl, "https://neshel-abc.vercel.app");
  assert.equal(site.indexable, false);
});

test("local and CI builds have no origin and are not indexable", () => {
  assert.deepEqual(resolveSite({}), { siteUrl: undefined, indexable: false, source: "none" });
});
