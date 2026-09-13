import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  ExecutionTrace,
  ExecutionTraceRepository,
  WorkItemRepository,
} from "@your-harness/application";
import {
  IntentId,
  WorkItem,
  WorkItemId,
  WorkItemStatus,
  WorkItemTitle,
} from "@your-harness/domain";

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
  return (
    typeof trace.id === "string" &&
    typeof trace.workItemId === "string" &&
    typeof trace.specificationId === "string" &&
    typeof trace.runtimeId === "string" &&
    typeof trace.recordedAt === "string" &&
    Array.isArray(trace.taskReferences) &&
    !!trace.runtimeResult
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
  };
};
