#!/usr/bin/env node

import { createCliProgram } from "./create-program.js";

const { program } = createCliProgram();
program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
