#!/usr/bin/env node
// The `neshel` executable. All behaviour lives in cli.ts; see contracts/cli.md.
import { run } from "./cli.js";

process.exitCode = await run(process.argv.slice(2), {
  cwd: process.cwd(),
  env: process.env,
  stdout: process.stdout,
  stderr: process.stderr,
});
