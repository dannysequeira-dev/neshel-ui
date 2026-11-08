/** Error thrown for invalid layout props; identical on the server and the client (ADR 0009). */
export class NeshelLayoutError extends Error {
  override name = "NeshelLayoutError";
}

export function layoutError(component: string, message: string): NeshelLayoutError {
  return new NeshelLayoutError(`[@neshel-ui/layout] <${component}>: ${message}`);
}
