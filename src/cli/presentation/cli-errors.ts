import type { CliIo } from "./cli-io.js";

export interface CliErrorPayload {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

const messageFor = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Emite errores de comandos con una forma estable para humanos y agentes. */
export const writeCliError = (
  io: CliIo,
  error: unknown,
  options: { readonly json?: boolean; readonly code?: string; readonly title: string },
): void => {
  const message = messageFor(error);
  if (options.json) {
    io.write(JSON.stringify({
      ok: false,
      error: { code: options.code ?? "CLI_COMMAND_FAILED", message },
    } satisfies CliErrorPayload, null, 2));
  } else {
    io.write(options.title);
    io.write(message);
  }
  io.setExitCode(1);
};
