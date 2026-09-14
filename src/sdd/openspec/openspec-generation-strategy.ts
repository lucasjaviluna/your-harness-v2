import { writeFile } from "node:fs/promises";

import type { SddDraftChangePreview } from "@your-harness/application";

/**
 * Mecanismo interno para generar los artefactos de un Change OpenSpec.
 * La estrategia no decide aprobaciones ni valida el resultado observado.
 */
export interface OpenSpecGenerationStrategy {
  generate(preview: SddDraftChangePreview, targetRoot: string): Promise<void>;
}

/** Estrategia segura por defecto: escribe los tres artefactos en el directorio temporal. */
export function createFilesystemOpenSpecGenerationStrategy(): OpenSpecGenerationStrategy {
  return {
    async generate(preview, targetRoot) {
      await writeFile(`${targetRoot}/proposal.md`, preview.proposal, "utf8");
      await writeFile(`${targetRoot}/design.md`, preview.design, "utf8");
      await writeFile(`${targetRoot}/tasks.md`, preview.tasks, "utf8");
    },
  };
}
