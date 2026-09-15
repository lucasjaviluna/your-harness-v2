import { mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";

import type {
  SddDraftChangeInput,
  SddDraftChangePreview,
  SddChangeProjection,
  SddMaterializationResult,
  SddMaterializer,
} from "@your-harness/application";
import type { ExecutionEnvironmentGuard } from "../../runtime/execution-environment.js";
import { openSpecChangeDigest } from "./openspec-change-digest.js";
import {
  createFilesystemOpenSpecGenerationStrategy,
  type OpenSpecGenerationStrategy,
} from "./openspec-generation-strategy.js";
import { OpenSpecSddProvider } from "./openspec-sdd-provider.js";

const safeChangeId = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

async function readProjectIfPresent(root: string) {
  try {
    return await new OpenSpecSddProvider().readProject({ root });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("OpenSpec directory not found")) return undefined;
    throw error;
  }
}

export interface OpenSpecMaterializerOptions {
  readonly guard: ExecutionEnvironmentGuard;
  readonly confirmed: boolean;
  readonly generationStrategy?: OpenSpecGenerationStrategy;
}

/** Materializa Changes draft nuevos o existentes; no modifica Specifications. */
export class OpenSpecMaterializer implements SddMaterializer {
  private readonly generationStrategy: OpenSpecGenerationStrategy;

  constructor(private readonly options: OpenSpecMaterializerOptions) {
    this.generationStrategy = options.generationStrategy ?? createFilesystemOpenSpecGenerationStrategy();
  }

  async previewDraftChange(input: SddDraftChangeInput): Promise<SddDraftChangePreview> {
    if (!safeChangeId.test(input.changeId)) throw new Error(`OpenSpec Change id '${input.changeId}' is unsafe.`);
    let existing: SddChangeProjection | undefined;
    const project = await readProjectIfPresent(input.scope.root);
    existing = project?.changes.find((change) => change.id === input.changeId);
    if (existing) {
      if (!input.baseContentDigest) {
        throw new Error(`OpenSpec Change '${input.changeId}' update requires baseContentDigest.`);
      }
      if (existing.contentDigest !== input.baseContentDigest) {
        throw new Error(`OpenSpec Change '${input.changeId}' base digest is stale.`);
      }
    }
    const currentVersion = input.baseVersion ?? existing?.version;
    const version = existing ? String(Number(currentVersion ?? "1") + 1) : "1";
    return {
      ...input,
      version,
      contentDigest: openSpecChangeDigest({
        changeId: input.changeId,
        version,
        proposal: input.proposal,
        design: input.design,
        tasks: input.tasks,
      }),
    };
  }

  async materializeApprovedChange(preview: SddDraftChangePreview): Promise<SddMaterializationResult> {
    if (!safeChangeId.test(preview.changeId)) throw new Error(`OpenSpec Change id '${preview.changeId}' is unsafe.`);
    const root = path.resolve(preview.scope.root);
    const changesRoot = path.join(root, "openspec", "changes");
    const changeRoot = path.join(changesRoot, preview.changeId);
    this.options.guard.assertCapability("workspace.write");
    this.options.guard.assertWorkspacePath(changeRoot, "write");
    this.options.guard.requireConfirmation("sdd.change.write", this.options.confirmed);
    for (const capability of this.generationStrategy.requiredCapabilities ?? []) {
      this.options.guard.assertCapability(capability);
    }
    if (this.generationStrategy.confirmationRiskClass) {
      this.options.guard.requireConfirmation(this.generationStrategy.confirmationRiskClass, this.options.confirmed);
    }

    const actualDigest = openSpecChangeDigest({
      changeId: preview.changeId,
      version: preview.version,
      proposal: preview.proposal,
      design: preview.design,
      tasks: preview.tasks,
    });
    if (actualDigest !== preview.contentDigest) {
      throw new Error(`OpenSpec Change '${preview.changeId}' preview digest is stale.`);
    }

    const currentProject = await readProjectIfPresent(root);
    const currentChange = currentProject?.changes.find((change) => change.id === preview.changeId);
    if (currentChange && (!preview.baseContentDigest || currentChange.contentDigest !== preview.baseContentDigest)) {
      throw new Error(`OpenSpec Change '${preview.changeId}' changed after preview; re-preview is required.`);
    }

    await mkdir(changesRoot, { recursive: true });
    const temporaryRoot = path.join(changesRoot, `.yh-materialize-${preview.changeId}-${process.pid}`);
    const backupRoot = path.join(changesRoot, `.yh-backup-${preview.changeId}-${process.pid}`);
    try {
      await mkdir(temporaryRoot);
      await this.generationStrategy.generate(preview, temporaryRoot);
      if (currentChange) await rename(changeRoot, backupRoot);
      await rename(temporaryRoot, changeRoot);
      if (currentChange) await rm(backupRoot, { recursive: true, force: true });
    } catch (error) {
      await rm(temporaryRoot, { recursive: true, force: true });
      if (currentChange) {
        const finalExists = await stat(changeRoot).then(() => true, () => false);
        if (!finalExists) await rename(backupRoot, changeRoot).catch(() => undefined);
      }
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        throw new Error(`OpenSpec Change '${preview.changeId}' already exists and could not be replaced safely.`);
      }
      throw error;
    }

    const observedProject = await new OpenSpecSddProvider().readProject({ root });
    const observedChange = observedProject.changes.find((change) => change.id === preview.changeId);
    if (!observedChange || observedChange.contentDigest !== preview.contentDigest) {
      await rm(changeRoot, { recursive: true, force: true });
      throw new Error(`OpenSpec Change '${preview.changeId}' did not match its approved preview after materialization.`);
    }

    return {
      changeId: preview.changeId,
      version: preview.version,
      contentDigest: preview.contentDigest,
      references: [
        `openspec/changes/${preview.changeId}/proposal.md`,
        `openspec/changes/${preview.changeId}/design.md`,
        `openspec/changes/${preview.changeId}/tasks.md`,
      ],
    };
  }
}
