import assert from "node:assert/strict";
import test from "node:test";
import {
  bareImports,
  checkDeclarations,
  checkDependencySpecs,
  checkLifecycleScripts,
  checkPackageContract,
  checkPublicPeers,
  checkSideEffects,
  checkSourceMaps,
  checkTargets,
  checkUnexpectedFiles,
  exportEntries,
} from "../scripts/lib/pack-checks.mjs";

const files = (entries) =>
  new Map(Object.entries(entries).map(([path, text]) => [path, Buffer.from(text, "utf8")]));

const validManifest = {
  name: "@neshel-ui/config",
  sideEffects: ["**/*.css"],
  exports: {
    ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
    "./styles.css": "./dist/styles.css",
  },
};
const validFiles = files({
  "package.json": "{}",
  "dist/index.js": "export {};\n//# sourceMappingURL=index.js.map",
  "dist/index.js.map": JSON.stringify({ version: 3, sources: ["../src/index.ts"] }),
  "dist/index.d.ts": "export {};\n//# sourceMappingURL=index.d.ts.map",
  "dist/index.d.ts.map": JSON.stringify({ version: 3, sources: ["../src/index.ts"] }),
  "dist/styles.css": ":root{}",
  "src/index.ts": "export {};",
});

test("a valid package produces no errors", () => {
  assert.deepEqual(checkDependencySpecs(validManifest, ["@neshel-ui/core"]), []);
  assert.deepEqual(checkTargets(validManifest, validFiles), []);
  assert.deepEqual(checkDeclarations(validManifest), []);
  assert.deepEqual(checkSourceMaps(validFiles), []);
  assert.deepEqual(checkSideEffects(validManifest), []);
  assert.deepEqual(checkUnexpectedFiles(validFiles), []);
});

test("exportEntries flattens nested conditions and string shorthands", () => {
  assert.deepEqual(exportEntries("./dist/index.js"), [
    { subpath: ".", conditions: [], target: "./dist/index.js" },
  ]);
  assert.deepEqual(
    exportEntries({ ".": { node: { types: "./a.d.ts", default: "./a.js" } } }).map((entry) =>
      entry.conditions.join("."),
    ),
    ["node.types", "node.default"],
  );
});

test("rejects unresolved local protocols and internal runtime dependencies", () => {
  const errors = checkDependencySpecs(
    {
      dependencies: { "@neshel-ui/core": "0.0.0", a: "workspace:*", b: "file:../b" },
      peerDependencies: { c: "link:../c" },
      devDependencies: { d: "catalog:" },
    },
    ["@neshel-ui/core"],
  );
  assert.equal(errors.length, 5);
  assert.match(errors.join("\n"), /@neshel-ui\/core is internal/);
  assert.match(errors.join("\n"), /"workspace:"/);
  assert.match(errors.join("\n"), /"catalog:"/);
});

test("detects missing export, bin and shebang targets", () => {
  const manifest = {
    name: "@neshel-ui/cli",
    exports: { ".": { types: "./dist/index.d.ts", import: "./dist/missing.js" } },
    bin: { neshel: "./dist/bin.js", other: "./dist/nope.js" },
  };
  const errors = checkTargets(
    manifest,
    files({ "dist/index.d.ts": "", "dist/bin.js": "console.log(1)" }),
  );
  assert.equal(errors.length, 3);
  assert.match(errors.join("\n"), /missing\.js is missing/);
  assert.match(errors.join("\n"), /no shebang/);
});

test("requires a first-position types condition for JavaScript exports", () => {
  assert.equal(checkDeclarations({ exports: { ".": "./dist/index.js" } }).length, 1);
  assert.match(
    checkDeclarations({
      exports: { ".": { import: "./dist/index.js", types: "./dist/index.d.ts" } },
    })[0],
    /must be the first condition/,
  );
});

test("detects broken source maps and unpackaged sources", () => {
  const errors = checkSourceMaps(
    files({
      "dist/a.js": "//# sourceMappingURL=a.js.map",
      "dist/b.js": "//# sourceMappingURL=b.js.map",
      "dist/b.js.map": JSON.stringify({ sources: ["../src/b.ts"] }),
      "dist/c.js.map": "not json",
    }),
  );
  assert.equal(errors.length, 3);
  assert.match(errors.join("\n"), /missing source map dist\/a\.js\.map/);
  assert.match(errors.join("\n"), /src\/b\.ts, which is not packaged/);
});

test("requires exported CSS to be covered by sideEffects", () => {
  const base = { exports: { "./styles.css": "./dist/styles.css" } };
  assert.equal(checkSideEffects({ ...base, sideEffects: false }).length, 1);
  assert.equal(checkSideEffects({ ...base, sideEffects: ["*.js"] }).length, 1);
  assert.equal(checkSideEffects({ ...base, sideEffects: ["*.css"] }).length, 0);
  assert.equal(checkSideEffects({ ...base, sideEffects: ["./dist/styles.css"] }).length, 0);
});

test("flags tests, stories, tsconfigs and dotfiles in tarballs", () => {
  const errors = checkUnexpectedFiles(
    files({
      "src/a.test.ts": "",
      "src/a.stories.tsx": "",
      "tsconfig.build.json": "",
      ".env": "",
      "src/a.ts": "",
    }),
  );
  assert.equal(errors.length, 4);
});

test("rejects install lifecycle scripts", () => {
  assert.deepEqual(checkLifecycleScripts({ scripts: { build: "tsc", test: "x" } }), []);
  const errors = checkLifecycleScripts({ scripts: { postinstall: "x", prepare: "y" } });
  assert.equal(errors.length, 2);
  assert.match(errors[0], /scripts.postinstall/);
});

test("public workspace peers must be caret ranges", () => {
  const publicNames = ["@neshel-ui/config"];
  assert.deepEqual(
    checkPublicPeers({ peerDependencies: { "@neshel-ui/config": "^0.1.0" } }, publicNames),
    [],
  );
  assert.deepEqual(checkPublicPeers({ peerDependencies: { react: "^19.0.0" } }, publicNames), []);
  assert.match(
    checkPublicPeers({ peerDependencies: { "@neshel-ui/config": "0.1.0" } }, publicNames)[0],
    /caret range/,
  );
});

test("bareImports finds package and node: specifiers, ignoring relative ones", () => {
  const source = [
    'import a from "./a.js";',
    'export { b } from "../b.js";',
    'import x from "node:fs";',
    'const y = await import("pkg");',
  ].join("\n");
  assert.deepEqual(bareImports(source), ["node:fs", "pkg"]);
});

const configFiles = (overrides = {}) =>
  files({
    "dist/index.js": 'export { a } from "./contract.js";',
    "dist/contract.js": "export const a = 1;",
    "dist/tailwind.css": "@theme inline {}",
    "dist/styles.css": "@theme inline {}",
    ...overrides,
  });
const configManifest = {
  name: "@neshel-ui/config",
  exports: { ".": {}, "./tokens.css": "", "./tailwind.css": "", "./styles.css": "" },
};

test("config package contract: exact exports, no deps, relative imports, identical alias", () => {
  assert.deepEqual(checkPackageContract(configManifest, configFiles()), []);
  const errors = checkPackageContract(
    {
      ...configManifest,
      exports: { ...configManifest.exports, "./engine": "" },
      dependencies: { "colorjs.io": "~0.7.1" },
    },
    configFiles({ "dist/index.js": 'import "node:fs";', "dist/styles.css": "old" }),
  );
  assert.equal(errors.length, 4);
  const text = errors.join("\n");
  assert.match(text, /exports must be exactly/);
  assert.match(text, /dependencies must be empty/);
  assert.match(text, /imports "node:fs"/);
  assert.match(text, /byte-identical/);
});

test("cli package contract: exact runtime dependencies and config peer", () => {
  const good = {
    name: "@neshel-ui/cli",
    dependencies: { jiti: "^2.7.0", "colorjs.io": "~0.7.1", "@capsizecss/core": "^4.1.3" },
    peerDependencies: { "@neshel-ui/config": "^0.0.0" },
  };
  assert.deepEqual(checkPackageContract(good, new Map()), []);
  const errors = checkPackageContract(
    { name: "@neshel-ui/cli", dependencies: { jiti: "^2.7.0", zod: "^4.0.0" } },
    new Map(),
  );
  assert.equal(errors.length, 2);
});

const layoutCss = `/* header */
@layer components.neshel {
  .neshel-stack { display: flex; flex-direction: column; }
}
`;
const layoutManifest = {
  name: "@neshel-ui/layout",
  version: "0.0.0",
  exports: {
    ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
    "./styles.css": "./dist/styles.css",
    "./style-manifest.json": "./dist/style-manifest.json",
  },
  dependencies: { "@radix-ui/react-slot": "^1.5.0", "tailwind-variants": "^3.3.1" },
  peerDependencies: { "@neshel-ui/config": "^0.0.0", react: "^19.0.0" },
};
const styleManifest = `${JSON.stringify({ schema: 1, package: "@neshel-ui/layout", version: "0.0.0" })}\n`;
const layoutFiles = (overrides = {}) =>
  files({
    "dist/index.js": 'export { Stack } from "./stack.js";',
    "dist/stack.js":
      'import { jsx } from "react/jsx-runtime";\nimport { Slot } from "@radix-ui/react-slot";\nimport { tv } from "tailwind-variants/lite";\nimport { Children } from "react";',
    "dist/styles.css": layoutCss,
    "dist/style-manifest.json": styleManifest,
    ...overrides,
  });

test("layout package contract: exports, deps, peers, imports and stylesheet (feature 003)", () => {
  assert.deepEqual(
    checkPackageContract(layoutManifest, layoutFiles(), {
      sourceCss: layoutCss,
      sourceManifest: styleManifest,
    }),
    [],
  );
  assert.deepEqual(
    checkPackageContract(
      { ...layoutManifest, name: "@neshel-ui/typography" },
      layoutFiles(),
      {},
    ).join(),
    "dist/style-manifest.json describes @neshel-ui/layout@0.0.0, not @neshel-ui/typography@0.0.0",
  );
});

test("negative: component contract detects stale manifests and font files (FR-046, FR-050)", () => {
  const errors = checkPackageContract(
    layoutManifest,
    layoutFiles({
      "dist/fonts/inter.woff2": "binary",
      "dist/style-manifest.json": `${JSON.stringify({ schema: 2, package: "@neshel-ui/layout", version: "0.0.0" })}\n`,
    }),
    { sourceManifest: styleManifest },
  ).join("\n");
  assert.match(errors, /dist\/fonts\/inter\.woff2: font files must not be published/);
  assert.match(errors, /schema must be 1/);
  assert.match(errors, /differs from src\/style-manifest\.json/);
  const missing = new Map([...layoutFiles()].filter(([path]) => !path.endsWith(".json")));
  assert.match(
    checkPackageContract(layoutManifest, missing).join(),
    /style-manifest\.json is missing/,
  );
});

test("negative: layout contract detects broken exports, leaked deps and Node imports (SC-005)", () => {
  const errors = checkPackageContract(
    {
      ...layoutManifest,
      exports: { ".": layoutManifest.exports["."] },
      dependencies: { ...layoutManifest.dependencies, "tailwind-merge": "^3.0.0" },
      peerDependencies: { react: "^19.0.0", "react-dom": "^19.0.0" },
    },
    layoutFiles({
      "dist/a.js":
        'import { readFileSync } from "node:fs";\nimport "tailwind-variants";\nimport "@neshel-ui/components";',
    }),
  );
  const text = errors.join("\n");
  assert.match(text, /exports must be exactly \., \.\/styles\.css, \.\/style-manifest\.json/);
  assert.match(
    text,
    /dependencies must be exactly @radix-ui\/react-slot, tailwind-variants; found .*tailwind-merge/,
  );
  assert.match(text, /peerDependencies must be exactly @neshel-ui\/config, react$/m);
  assert.match(text, /dist\/a\.js imports "node:fs"/);
  assert.match(text, /dist\/a\.js imports "tailwind-variants"; allowed/);
  assert.match(text, /dist\/a\.js imports "@neshel-ui\/components"/);
});

test("negative: layout contract detects a missing, unhygienic or stale stylesheet (SC-005)", () => {
  const missing = new Map([...layoutFiles()].filter(([path]) => path !== "dist/styles.css"));
  assert.match(
    checkPackageContract(layoutManifest, missing).join(),
    /dist\/styles\.css is missing/,
  );
  const dirty = layoutFiles({
    "dist/styles.css": `${layoutCss}\n@source "../src";\ndiv { margin: 0 }`,
  });
  const dirtyErrors = checkPackageContract(layoutManifest, dirty).join("\n");
  assert.match(dirtyErrors, /@source/);
  assert.match(dirtyErrors, /selector "div"/);
  const stale = checkPackageContract(layoutManifest, layoutFiles(), {
    sourceCss: `${layoutCss}/* newer */`,
  });
  assert.match(stale.join(), /dist\/styles\.css differs from src\/styles\.css/);
});

test("negative: components contract rejects root Base UI imports, Neshel runtime imports and schema 1", () => {
  const manifest = {
    ...layoutManifest,
    name: "@neshel-ui/components",
    dependencies: { "@radix-ui/react-slot": "^1.5.0", "tailwind-variants": "^3.3.1" },
    peerDependencies: { react: "^19.0.0" },
  };
  const files = layoutFiles({
    "dist/a.js": [
      'import { Select } from "@base-ui/react";',
      'import { Stack } from "@neshel-ui/layout";',
      'import * as D from "@radix-ui/react-dialog";',
    ].join("\n"),
    "dist/style-manifest.json": JSON.stringify({
      schema: 1,
      package: "@neshel-ui/components",
      version: manifest.version,
    }),
  });
  const text = checkPackageContract(manifest, files).join("\n");
  assert.match(text, /dependencies must be exactly @base-ui\/react, /);
  assert.match(text, /peerDependencies must be exactly @neshel-ui\/config, react, react-dom/);
  assert.match(text, /dist\/a\.js imports "@base-ui\/react"; allowed/);
  assert.match(text, /dist\/a\.js imports "@neshel-ui\/layout"; allowed/);
  assert.doesNotMatch(text, /imports "@radix-ui\/react-dialog"/);
  assert.match(text, /schema must be 2/);
});

test("bareImports ignores string literals that contain the word from", () => {
  const source = [
    'const k = [{ selector: "from", d: [] }, { selector: "to" }];',
    'import x from "react";',
    'export { y } from "./y.js";',
    'await import("tailwind-variants/lite");',
  ].join("\n");
  assert.deepEqual(bareImports(source), ["react", "tailwind-variants/lite"]);
});

test("checkReleaseMetadata requires the public release fields (feature 006)", async () => {
  const { checkReleaseMetadata } = await import("../scripts/lib/pack-checks.mjs");
  const good = {
    description: "x",
    keywords: ["a", "b", "c"],
    license: "MIT",
    author: "Neshel-UI maintainers",
    homepage: "https://github.com/dannysequeira-dev/neshel-ui",
    bugs: { url: "https://github.com/dannysequeira-dev/neshel-ui/issues" },
    repository: {
      type: "git",
      url: "git+https://github.com/dannysequeira-dev/neshel-ui.git",
      directory: "packages/config",
    },
    publishConfig: { access: "public" },
  };
  assert.deepEqual(checkReleaseMetadata(good, "packages/config"), []);
  assert.equal(
    checkReleaseMetadata(
      { ...good, repository: { type: "git", url: "https://example.com/x.git" } },
      "packages/config",
    ).length,
    2,
  );
  assert.match(checkReleaseMetadata({ ...good, keywords: [] }).join(), /keywords/);
});
