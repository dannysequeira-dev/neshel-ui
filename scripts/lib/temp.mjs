import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Create a temporary directory that is removed on dispose(), on normal exit, and on
 * SIGINT/SIGTERM (exit codes 130/143), so an interrupted gate never leaves files behind.
 * Retries cover transient Windows file locks (antivirus, esbuild/rolldown shutdown).
 * @param {string} prefix directory name prefix; spaces and Unicode are intentional in callers
 * @param {{ keep?: boolean }} [options] keep: skip removal (debugging)
 */
export function createTempDir(prefix, { keep = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  let disposed = false;
  const dispose = () => {
    if (disposed || keep) return;
    disposed = true;
    process.off("exit", dispose);
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  };
  const onSigint = () => {
    dispose();
    process.exit(130);
  };
  const onSigterm = () => {
    dispose();
    process.exit(143);
  };
  process.on("exit", dispose);
  process.on("SIGINT", onSigint);
  process.on("SIGTERM", onSigterm);
  return { dir, dispose };
}
