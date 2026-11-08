/** Error thrown for invalid typography props; identical on the server and the client. */
export class NeshelTypographyError extends Error {
  override name = "NeshelTypographyError";
}

export function typographyError(component: string, message: string): NeshelTypographyError {
  return new NeshelTypographyError(`[@neshel-ui/typography] <${component}>: ${message}`);
}
