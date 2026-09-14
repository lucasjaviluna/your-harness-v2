import { writeFile } from "node:fs/promises";

import type { SddDraftChangePreview } from "@your-harness/application";

/**
 * Mecanismo interno para generar los artefactos de un Change OpenSpec.
 * La estrategia no decide aprobaciones ni valida el resultado observado.
 */
export interface OpenSpecGenerationStrategy {
  generate(preview: SddDraftChangePreview, targetRoot: string): Promise<void>;
}

export interface OpenSpecProposalInvocation {
  readonly changeId: string;
  readonly instruction: string;
  readonly targetRoot: string;
}

export interface OpenSpecProposalCommandResult {
  readonly exitCode: number;
  readonly stdout?: string;
  readonly stderr?: string;
}

/**
 * Port para un runner externo de OpenSpec o de una skill del asistente.
 * La implementación concreta debe dejar los artefactos en `targetRoot`.
 */
export interface OpenSpecProposalCommandRunner {
  execute(invocation: OpenSpecProposalInvocation): Promise<OpenSpecProposalCommandResult>;
}

/**
 * Estrategia futura para delegar la generación a un runner inyectado.
 * No ejecuta procesos por sí misma y no se usa por defecto.
 */
export function createOpenSpecCommandGenerationStrategy(
  runner: OpenSpecProposalCommandRunner,
): OpenSpecGenerationStrategy {
  return {
    async generate(preview, targetRoot) {
      const result = await runner.execute({
        changeId: preview.changeId,
        instruction: `/opsx:propose ${preview.changeId}`,
        targetRoot,
      });
      if (result.exitCode !== 0) {
        const details = result.stderr?.trim() || result.stdout?.trim() || "sin detalles";
        throw new Error(`OpenSpec proposal runner failed with exit code ${result.exitCode}: ${details}`);
      }
    },
  };
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
