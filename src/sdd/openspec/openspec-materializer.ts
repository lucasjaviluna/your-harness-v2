import { mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";

import type {
  SddDraftChangeInput,
  SddDraftChangePreview,
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

export interface OpenSpecMaterializerOptions {
  readonly guard: ExecutionEnvironmentGuard;
  readonly confirmed: boolean;
  readonly generationStrategy?: OpenSpecGenerationStrategy;
}

/** Materializa únicamente Changes nuevos; no modifica Specifications existentes. */
export class OpenSpecMaterializer implements SddMaterializer {
  private readonly generationStrategy: OpenSpecGenerationStrategy;

  constructor(private readonly options: OpenSpecMaterializerOptions) {
    this.generationStrategy = options.generationStrategy ?? createFilesystemOpenSpecGenerationStrategy();
  }

  async previewDraftChange(input: SddDraftChangeInput): Promise<SddDraftChangePreview> {
    if (!safeChangeId.test(input.changeId)) throw new Error(`OpenSpec Change id '${input.changeId}' is unsafe.`);
    const version = "1";
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

    await mkdir(changesRoot, { recursive: true });
    const temporaryRoot = path.join(changesRoot, `.yh-materialize-${preview.changeId}-${process.pid}`);
    try {
      await mkdir(temporaryRoot);
      await this.generationStrategy.generate(preview, temporaryRoot);
      await rename(temporaryRoot, changeRoot);
    } catch (error) {
      await rm(temporaryRoot, { recursive: true, force: true });
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        throw new Error(`OpenSpec Change '${preview.changeId}' already exists; updates are not enabled in this slice.`);
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
