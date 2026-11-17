// node scripts/copy-css.mjs <source.css> <dist.css> [<source.css> <dist.css> ...]
// node scripts/copy-css.mjs --concat <dist.css> <source.css> [<source.css> ...]
//   (concatenates the sources, in order, into one stylesheet; used by @neshel-ui/animations)
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const args = process.argv.slice(2);
if (args[0] === "--concat") {
  const [, to, ...sources] = args;
  if (!to || sources.length === 0) {
    console.error("Usage: node scripts/copy-css.mjs --concat <dist.css> <source.css> [...sources]");
    process.exit(1);
  }
  const parts = await Promise.all(sources.map((source) => readFile(resolve(source), "utf8")));
  await mkdir(dirname(resolve(to)), { recursive: true });
  await writeFile(resolve(to), `${parts.map((part) => part.trimEnd()).join("\n\n")}\n`);
  console.info(`Concatenated ${sources.join(" + ")} -> ${to}`);
} else {
  if (args.length === 0 || args.length % 2 !== 0) {
    console.error("Usage: node scripts/copy-css.mjs <source.css> <dist.css> [...pairs]");
    process.exit(1);
  }
  for (let index = 0; index < args.length; index += 2) {
    const [from, to] = [args[index], args[index + 1]];
    await mkdir(dirname(resolve(to)), { recursive: true });
    await copyFile(resolve(from), resolve(to));
    console.info(`Copied ${from} -> ${to}`);
  }
}
