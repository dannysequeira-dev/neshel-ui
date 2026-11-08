/** Error thrown for invalid component usage; identical on the server and the client (ADR 0009). */
export class NeshelComponentsError extends Error {
  override name = "NeshelComponentsError";
}

export function componentsError(component: string, message: string): NeshelComponentsError {
  return new NeshelComponentsError(`[@neshel-ui/components] <${component}>: ${message}`);
}
