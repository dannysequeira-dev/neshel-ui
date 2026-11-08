/** Exit codes of contracts/cli.md. */
export const ExitCode = {
  ok: 0,
  invalid: 1,
  usage: 2,
  config: 3,
  stale: 4,
  internal: 5,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

/** An expected failure with a documented exit code and a human-readable message. */
export class CliError extends Error {
  constructor(
    readonly exitCode: ExitCodeValue,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "CliError";
  }
}
