import type { CliIo } from "./cli-io.js";

export interface CliErrorPayload {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly exitCode: number;
  };
}

/** Códigos públicos de proceso; se conservan deliberadamente pequeños y estables. */
export const CliExitCode = {
  Success: 0,
  Unexpected: 1,
  Usage: 2,
  Guardrail: 3,
  NotFound: 4,
  Conflict: 5,
  External: 6,
} as const;

const messageFor = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Emite errores de comandos con una forma estable para humanos y agentes. */
export const writeCliError = (
  io: CliIo,
  error: unknown,
  options: { readonly json?: boolean; readonly code?: string; readonly title: string; readonly exitCode?: number },
): void => {
  const message = messageFor(error);
  const exitCode = options.exitCode ?? CliExitCode.Unexpected;
  if (options.json) {
    io.write(JSON.stringify({
      ok: false,
      error: { code: options.code ?? "CLI_COMMAND_FAILED", message, exitCode },
    } satisfies CliErrorPayload, null, 2));
  } else {
    io.write(options.title);
    io.write(message);
  }
  io.setExitCode(exitCode);
};
