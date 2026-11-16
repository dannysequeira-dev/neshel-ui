/** Development diagnostics shared by the engine. Never throws; silent in production builds. */

export function isProduction(): boolean {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;
  return env?.NODE_ENV === "production";
}

const warned = new Set<string>();

export function devWarnOnce(key: string, message: string): void {
  if (isProduction() || warned.has(key)) return;
  warned.add(key);
  console.warn(`[@neshel-ui/animations] ${message}`);
}

/** Short, stable description of an element for messages: `<div#id.class>`. */
export function describeElement(element: unknown): string {
  const node = element as { tagName?: string; id?: string; classList?: ArrayLike<string> };
  const tag = node.tagName?.toLowerCase() ?? "element";
  const id = node.id ? `#${node.id}` : "";
  const first = node.classList?.[0];
  return `<${tag}${id}${first ? `.${first}` : ""}>`;
}
