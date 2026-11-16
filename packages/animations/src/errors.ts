/** Error thrown for invalid effect usage; identical on the server and the client (ADR 0009 §6). */
export class NeshelAnimationsError extends Error {
  override name = "NeshelAnimationsError";
}

export function animationsError(effect: string, message: string): NeshelAnimationsError {
  return new NeshelAnimationsError(`[@neshel-ui/animations] ${effect}: ${message}`);
}
