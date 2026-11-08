/** Development-only diagnostics. Never throws, never changes markup; silent in production builds. */
function isProduction(): boolean {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;
  return env?.NODE_ENV === "production";
}

const warned = new Set<string>();

export function devWarnOnce(key: string, message: string): void {
  if (isProduction() || warned.has(key)) return;
  warned.add(key);
  console.warn(`[@neshel-ui/components] ${message}`);
}
