#!/usr/bin/env node

import { createCliProgram } from "./create-program.js";
import { CliExitCode, writeCliError } from "./presentation/cli-errors.js";

const { program, context } = createCliProgram();

try {
  program.parse(process.argv);
} catch (error) {
  const isUsageError = typeof error === "object" && error !== null &&
    "code" in error && String((error as { code?: unknown }).code).startsWith("commander.");
  writeCliError(context.io, error, {
    json: process.argv.includes("--json"),
    code: isUsageError ? "CLI_USAGE_ERROR" : "CLI_COMMAND_FAILED",
    exitCode: isUsageError ? CliExitCode.Usage : CliExitCode.Unexpected,
    title: "✗ Error de uso de la CLI:",
  });
}

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
