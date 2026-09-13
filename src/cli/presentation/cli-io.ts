/** Salida y estado de proceso reemplazables para los adaptadores CLI. */
export interface CliIo {
  write(...values: ReadonlyArray<unknown>): void;
  setExitCode(code: number): void;
}

export const createConsoleCliIo = (): CliIo => ({
  write: (...values) => console.log(...values),
  setExitCode: (code) => {
    process.exitCode = code;
  },
});

/** Fachada local que permite conservar los llamados existentes a `console.log`. */
export const createCliConsole = (io: CliIo): Pick<Console, "log"> => ({
  log: (...values: unknown[]) => io.write(...values),
});
