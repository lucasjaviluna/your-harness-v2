import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  Evidence,
  CompletionAuthorization,
  ExecutionScopeSelection,
  CompletionAuthorizationRepository,
  ExecutionTrace,
  ExecutionTraceRepository,
  VerificationPlan,
  VerificationPlanRepository,
  VerificationReport,
  VerificationReportRepository,
  WorkItemRepository,
} from "@your-harness/application";
import { createEvidence, createVerificationPlan } from "@your-harness/application";
import {
  IntentId,
  WorkItem,
  WorkItemId,
  WorkItemStatus,
  WorkItemTitle,
} from "@your-harness/domain";
import type { ToolInvocationTrace } from "../../runtime/tool-invocation-trace.js";

interface StoredWorkItem {
  readonly version: 1;
  readonly id: string;
  readonly intentId: string;
  readonly title: string;
  readonly status: WorkItemStatus;
}

export interface LocalOperationalStoreOptions {
  readonly workspace: string;
}

export interface LocalOperationalStore {
  readonly root: string;
  readonly workItems: WorkItemRepository;
  readonly executionTraces: ExecutionTraceRepository;
  readonly executionBindings: WorkItemExecutionBindingRepository;
  readonly evidence: EvidenceRepository;
  readonly verificationPlans: VerificationPlanRepository;
  readonly verificationReports: VerificationReportRepository;
  readonly completionAuthorizations: CompletionAuthorizationRepository;
  readonly executionScopeSelections: ExecutionScopeSelectionRepository;
  readonly toolInvocations: ToolInvocationRepository;
}

export interface ToolInvocationRepository {
  record(trace: ToolInvocationTrace): Promise<void>;
  findByRuntimeId(runtimeId: string): Promise<ReadonlyArray<ToolInvocationTrace>>;
  findByExecutionTraceId(executionTraceId: string): Promise<ReadonlyArray<ToolInvocationTrace>>;
}

export interface ExecutionScopeSelectionRepository {
  save(selection: ExecutionScopeSelection): Promise<void>;
  findByWorkItemId(workItemId: string): Promise<ExecutionScopeSelection | null>;
}

export interface EvidenceRepository {
  save(evidence: Evidence): Promise<void>;
  findById(id: string): Promise<Evidence | null>;
  findByExecutionTraceId(executionTraceId: string): Promise<ReadonlyArray<Evidence>>;
}

/** Asociación operacional con material SDD; no modifica el aggregate WorkItem. */
export interface WorkItemExecutionBinding {
  readonly workItemId: string;
  readonly specificationId: string;
  readonly specificationApproved: boolean;
  /** Digest de la proyección aprobada al momento del bind. */
  readonly specificationSnapshotDigest?: string;
  readonly changeId?: string;
  readonly taskIds: ReadonlyArray<string>;
}

export interface WorkItemExecutionBindingRepository {
  findByWorkItemId(workItemId: WorkItemId): Promise<WorkItemExecutionBinding | null>;
  save(binding: WorkItemExecutionBinding): Promise<void>;
  delete(workItemId: WorkItemId): Promise<void>;
}

const stateDirectory = "state";
const validIdentifier = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

const fileNameFor = (id: string): string => {
  if (!validIdentifier.test(id)) {
    throw new Error(`Persistent record id '${id}' contains unsupported characters.`);
  }
  return `${id}.json`;
};

const readJson = async <T>(filePath: string): Promise<T | null> => {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw new Error(
      `Unable to read persisted record '${filePath}': ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};

const writeJson = async (filePath: string, value: unknown): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, filePath);
};

const toStoredWorkItem = (workItem: WorkItem): StoredWorkItem => ({
  version: 1,
  id: workItem.id.value,
  intentId: workItem.intentId.value,
  title: workItem.title.value,
  status: workItem.status,
});

const toWorkItem = (stored: StoredWorkItem): WorkItem => {
  if (
    stored.version !== 1 ||
    typeof stored.id !== "string" ||
    typeof stored.intentId !== "string" ||
    typeof stored.title !== "string" ||
    !Object.values(WorkItemStatus).includes(stored.status)
  ) {
    throw new Error("Persisted WorkItem has an unsupported format.");
  }

  return new WorkItem(
    new WorkItemId(stored.id),
    new IntentId(stored.intentId),
    new WorkItemTitle(stored.title),
    stored.status,
  );
};

const isExecutionTrace = (value: unknown): value is ExecutionTrace => {
  if (!value || typeof value !== "object") return false;
  const trace = value as Partial<ExecutionTrace>;
  const snapshot = trace.specificationSnapshot;
  return (
    typeof trace.id === "string" &&
    typeof trace.workItemId === "string" &&
    typeof trace.specificationId === "string" &&
    typeof trace.runtimeId === "string" &&
    typeof trace.recordedAt === "string" &&
    Array.isArray(trace.taskReferences) &&
    !!trace.runtimeResult &&
    (snapshot === undefined || (
      typeof snapshot.id === "string" &&
      typeof snapshot.title === "string" &&
      typeof snapshot.contentDigest === "string" &&
      Array.isArray(snapshot.requirementIds) &&
      !!snapshot.provenance
    ))
  );
};

const isEvidence = (value: unknown): value is Evidence => {
  if (!value || typeof value !== "object") return false;
  const evidence = value as Partial<Evidence>;
  return (
    typeof evidence.id === "string" &&
    typeof evidence.executionTraceId === "string" &&
    typeof evidence.kind === "string" &&
    typeof evidence.outcome === "string" &&
    typeof evidence.summary === "string" &&
    typeof evidence.capturedAt === "string" &&
    !!evidence.subject
  );
};

const isVerificationPlan = (value: unknown): value is VerificationPlan => {
  if (!value || typeof value !== "object") return false;
  const plan = value as Partial<VerificationPlan>;
  return (
    typeof plan.id === "string" &&
    typeof plan.executionTraceId === "string" &&
    typeof plan.specificationId === "string" &&
    typeof plan.specificationSnapshotDigest === "string" &&
    typeof plan.createdAt === "string" &&
    Array.isArray(plan.criteria)
  );
};

const isVerificationReport = (value: unknown): value is VerificationReport => {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<VerificationReport>;
  return (
    typeof report.id === "string" &&
    typeof report.planId === "string" &&
    typeof report.executionTraceId === "string" &&
    typeof report.specificationId === "string" &&
    typeof report.specificationSnapshotDigest === "string" &&
    typeof report.outcome === "string" &&
    typeof report.createdAt === "string" &&
    Array.isArray(report.criteria)
  );
};

const isCompletionAuthorization = (value: unknown): value is CompletionAuthorization => {
  if (!value || typeof value !== "object") return false;
  const authorization = value as Partial<CompletionAuthorization>;
  return (
    typeof authorization.id === "string" &&
    typeof authorization.workItemId === "string" &&
    typeof authorization.verificationReportId === "string" &&
    typeof authorization.executionTraceId === "string" &&
    typeof authorization.decision === "string" &&
    typeof authorization.authorizedBy === "string" &&
    typeof authorization.authorizedByRole === "string" &&
    typeof authorization.reason === "string" &&
    typeof authorization.authorizedAt === "string"
  );
};

const isExecutionBinding = (value: unknown): value is WorkItemExecutionBinding => {
  if (!value || typeof value !== "object") return false;
  const binding = value as Partial<WorkItemExecutionBinding>;
  return (
    typeof binding.workItemId === "string" &&
    typeof binding.specificationId === "string" &&
    typeof binding.specificationApproved === "boolean" &&
    (binding.specificationSnapshotDigest === undefined || typeof binding.specificationSnapshotDigest === "string") &&
    (binding.changeId === undefined || typeof binding.changeId === "string") &&
    Array.isArray(binding.taskIds) &&
    binding.taskIds.every((taskId) => typeof taskId === "string")
  );
};

/**
 * Infraestructura local de estado operacional.
 *
 * Sólo persiste records propios de YH bajo `.your-harness/state`; no replica ni
 * modifica artifacts de un proveedor SDD.
 */
export const createLocalOperationalStore = (
  options: LocalOperationalStoreOptions,
): LocalOperationalStore => {
  const root = path.join(path.resolve(options.workspace), ".your-harness", stateDirectory);
  const workItemsDirectory = path.join(root, "work-items");
  const executionTracesDirectory = path.join(root, "execution-traces");
  const executionBindingsDirectory = path.join(root, "execution-bindings");
  const evidenceDirectory = path.join(root, "evidence");
  const verificationPlansDirectory = path.join(root, "verification-plans");
  const verificationReportsDirectory = path.join(root, "verification-reports");
  const completionAuthorizationsDirectory = path.join(root, "completion-authorizations");
  const executionScopeSelectionsDirectory = path.join(root, "execution-scope-selections");
  const toolInvocationsDirectory = path.join(root, "tool-invocations");

  return {
    root,
    workItems: {
      async findById(id) {
        const stored = await readJson<StoredWorkItem>(
          path.join(workItemsDirectory, fileNameFor(id.value)),
        );
        return stored ? toWorkItem(stored) : null;
      },
      async save(workItem) {
        await writeJson(
          path.join(workItemsDirectory, fileNameFor(workItem.id.value)),
          toStoredWorkItem(workItem),
        );
      },
      async delete(id) {
        await rm(path.join(workItemsDirectory, fileNameFor(id.value)), { force: true });
      },
    },
    executionTraces: {
      async save(trace) {
        await writeJson(
          path.join(executionTracesDirectory, fileNameFor(trace.id)),
          trace,
        );
      },
      async findById(id) {
        const trace = await readJson<unknown>(
          path.join(executionTracesDirectory, fileNameFor(id)),
        );
        if (trace === null) return null;
        if (!isExecutionTrace(trace)) {
          throw new Error("Persisted ExecutionTrace has an unsupported format.");
        }
        return trace;
      },
      async findByWorkItemId(workItemId) {
        try {
          const entries = await readdir(executionTracesDirectory);
          const traces = await Promise.all(
            entries
              .filter((entry) => entry.endsWith(".json"))
              .map((entry) => readJson<unknown>(path.join(executionTracesDirectory, entry))),
          );
          return traces.filter(isExecutionTrace).filter((trace) => trace.workItemId === workItemId);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
          throw error;
        }
      },
    },
    executionBindings: {
      async findByWorkItemId(workItemId) {
        const binding = await readJson<unknown>(
          path.join(executionBindingsDirectory, fileNameFor(workItemId.value)),
        );
        if (binding === null) return null;
        if (!isExecutionBinding(binding)) {
          throw new Error("Persisted WorkItem execution binding has an unsupported format.");
        }
        return binding;
      },
      async save(binding) {
        fileNameFor(binding.workItemId);
        if (!binding.specificationId.trim()) {
          throw new Error("Execution binding requires a specification id.");
        }
        if (binding.changeId !== undefined && !binding.changeId.trim()) {
          throw new Error("Execution binding change id cannot be empty.");
        }
        if (binding.taskIds.some((taskId) => !taskId.trim())) {
          throw new Error("Execution binding task ids cannot be empty.");
        }
        await writeJson(
          path.join(executionBindingsDirectory, fileNameFor(binding.workItemId)),
          {
            workItemId: binding.workItemId,
            specificationId: binding.specificationId,
            specificationApproved: binding.specificationApproved,
            ...(binding.specificationSnapshotDigest === undefined ? {} : { specificationSnapshotDigest: binding.specificationSnapshotDigest }),
            ...(binding.changeId === undefined ? {} : { changeId: binding.changeId }),
            taskIds: [...binding.taskIds],
          },
        );
      },
      async delete(workItemId) {
        await rm(path.join(executionBindingsDirectory, fileNameFor(workItemId.value)), {
          force: true,
        });
      },
    },
    evidence: {
      async save(evidence) {
        const filePath = path.join(evidenceDirectory, fileNameFor(evidence.id));
        if (await readJson<unknown>(filePath)) {
          throw new Error(`Evidence '${evidence.id}' already exists and is immutable.`);
        }
        await writeJson(filePath, createEvidence(evidence));
      },
      async findById(id) {
        const value = await readJson<unknown>(path.join(evidenceDirectory, fileNameFor(id)));
        if (value === null) return null;
        if (!isEvidence(value)) throw new Error("Persisted Evidence has an unsupported format.");
        return createEvidence(value);
      },
      async findByExecutionTraceId(executionTraceId) {
        try {
          const entries = await readdir(evidenceDirectory);
          const values = await Promise.all(entries.filter((entry) => entry.endsWith(".json")).map((entry) => readJson<unknown>(path.join(evidenceDirectory, entry))));
          return values.filter(isEvidence).filter((evidence) => evidence.executionTraceId === executionTraceId).map(createEvidence);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
          throw error;
        }
      },
    },
    verificationPlans: {
      async save(plan) {
        const filePath = path.join(verificationPlansDirectory, fileNameFor(plan.id));
        if (await readJson<unknown>(filePath)) throw new Error(`VerificationPlan '${plan.id}' already exists.`);
        await writeJson(filePath, createVerificationPlan(plan));
      },
      async findById(id) {
        const value = await readJson<unknown>(path.join(verificationPlansDirectory, fileNameFor(id)));
        if (value === null) return null;
        if (!isVerificationPlan(value)) throw new Error("Persisted VerificationPlan has an unsupported format.");
        return createVerificationPlan(value);
      },
    },
    verificationReports: {
      async save(report) {
        const filePath = path.join(verificationReportsDirectory, fileNameFor(report.id));
        if (await readJson<unknown>(filePath)) throw new Error(`VerificationReport '${report.id}' already exists.`);
        await writeJson(filePath, report);
      },
      async findById(id) {
        const value = await readJson<unknown>(path.join(verificationReportsDirectory, fileNameFor(id)));
        if (value === null) return null;
        if (!isVerificationReport(value)) throw new Error("Persisted VerificationReport has an unsupported format.");
        return value;
      },
      async findByPlanId(planId) {
        try {
          const entries = await readdir(verificationReportsDirectory);
          const values = await Promise.all(entries.filter((entry) => entry.endsWith(".json")).map((entry) => readJson<unknown>(path.join(verificationReportsDirectory, entry))));
          return values.filter(isVerificationReport).filter((report) => report.planId === planId);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
          throw error;
        }
      },
    },
    completionAuthorizations: {
      async save(authorization) {
        const filePath = path.join(completionAuthorizationsDirectory, fileNameFor(authorization.id));
        if (await readJson<unknown>(filePath)) {
          throw new Error(`CompletionAuthorization '${authorization.id}' already exists and is immutable.`);
        }
        await writeJson(filePath, authorization);
      },
      async findById(id) {
        const value = await readJson<unknown>(path.join(completionAuthorizationsDirectory, fileNameFor(id)));
        if (value === null) return null;
        if (!isCompletionAuthorization(value)) throw new Error("Persisted CompletionAuthorization has an unsupported format.");
        return value;
      },
      async findByWorkItemId(workItemId) {
        try {
          const entries = await readdir(completionAuthorizationsDirectory);
          const values = await Promise.all(entries.filter((entry) => entry.endsWith(".json")).map((entry) => readJson<unknown>(path.join(completionAuthorizationsDirectory, entry))));
          return values.filter(isCompletionAuthorization).filter((authorization) => authorization.workItemId === workItemId);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
          throw error;
        }
      },
    },
    executionScopeSelections: {
      async save(selection) {
        const filePath = path.join(executionScopeSelectionsDirectory, fileNameFor(selection.workItemId));
        await writeJson(filePath, selection);
      },
      async findByWorkItemId(workItemId) {
        const value = await readJson<unknown>(path.join(executionScopeSelectionsDirectory, fileNameFor(workItemId)));
        if (!value) return null;
        return value as ExecutionScopeSelection;
      },
    },
    toolInvocations: {
      async record(trace) {
        await writeJson(path.join(toolInvocationsDirectory, fileNameFor(trace.id)), trace);
      },
      async findByRuntimeId(runtimeId) {
        try {
          const entries = await readdir(toolInvocationsDirectory);
          const values = await Promise.all(entries.filter((entry) => entry.endsWith(".json")).map((entry) => readJson<unknown>(path.join(toolInvocationsDirectory, entry))));
          return values.filter((value): value is ToolInvocationTrace => !!value && typeof value === "object" && (value as Partial<ToolInvocationTrace>).runtimeId === runtimeId);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
          throw error;
        }
      },
      async findByExecutionTraceId(executionTraceId) {
        try {
          const entries = await readdir(toolInvocationsDirectory);
          const values = await Promise.all(entries.filter((entry) => entry.endsWith(".json")).map((entry) => readJson<unknown>(path.join(toolInvocationsDirectory, entry))));
          return values.filter((value): value is ToolInvocationTrace => !!value && typeof value === "object" && (value as Partial<ToolInvocationTrace>).executionTraceId === executionTraceId);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
          throw error;
        }
      },
    },
  };
};
