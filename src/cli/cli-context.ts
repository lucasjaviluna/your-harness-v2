import type { ValidatedConfig } from "../core/config.js";
import type { Logger } from "../core/logger.js";
import type { CliIo } from "./presentation/cli-io.js";

/** Dependencias compartidas por los adaptadores de comandos de la CLI. */
export interface CliContext {
  readonly config: ValidatedConfig;
  readonly logger: Logger;
  readonly io: CliIo;
}
