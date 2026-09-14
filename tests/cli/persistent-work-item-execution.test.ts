import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { WorkItemId, WorkItemStatus } from "@your-harness/domain";
import { createLocalOperationalStore } from "../../src/persistence/index.js";

const executeFile = promisify(execFile);
const workspaces: string[] = [];
const cli = path.resolve("dist/src/cli/index.js");

const runYh = async (workspace: string, ...arguments_: string[]): Promise<string> => {
  const { stdout } = await executeFile(process.execPath, [cli, ...arguments_], {
    cwd: workspace,
  });
  return stdout;
};

const createWorkspace = async (): Promise<string> => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "yh-cli-persistence-"));
  workspaces.push(workspace);
  await mkdir(path.join(workspace, "openspec/specs/authentication"), { recursive: true });
  await mkdir(path.join(workspace, "openspec/changes/add-login"), { recursive: true });
  await writeFile(
    path.join(workspace, "openspec/specs/authentication/spec.md"),
    `# Authentication

## Requirements

### Requirement: Authenticate users
The system SHALL authenticate users with valid credentials.

#### Scenario: Valid credentials
- **WHEN** a user submits valid credentials
- **THEN** the system grants access
`,
  );
  await writeFile(
    path.join(workspace, "openspec/changes/add-login/proposal.md"),
    "# Add login\n",
  );
  await writeFile(
    path.join(workspace, "openspec/changes/add-login/tasks.md"),
    "- [ ] Implement login\n",
  );
  return workspace;
};

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((workspace) => rm(workspace, { recursive: true, force: true })));
});

describe("yh work execute", () => {
  it("loads durable state, resolves SDD provenance and stores an ExecutionTrace", async () => {
    const workspace = await createWorkspace();

    await runYh(workspace, "work", "create", "login-work", "--title", "Implement login");
    await runYh(
      workspace,
      "work",
      "bind",
      "login-work",
      "--specification",
      "authentication",
      "--approve-specification",
      "--change",
      "add-login",
      "--task",
      "openspec/changes/add-login/tasks.md#1",
    );
    const output = await runYh(workspace, "work", "execute", "login-work", "--runtime", "fake");

    expect(output).toContain("Work item completed");
    const tracesDirectory = path.join(workspace, ".your-harness/state/execution-traces");
    const traceFile = (await readdir(tracesDirectory)).find((file) => file.endsWith(".json"));
    expect(traceFile).toBeDefined();
    const trace = JSON.parse(await readFile(path.join(tracesDirectory, traceFile!), "utf8"));
    expect(trace).toMatchObject({
      workItemId: "login-work",
      specificationId: "authentication",
      specificationSnapshot: {
        id: "authentication",
        provenance: { providerId: "openspec" },
        requirementIds: [expect.any(String)],
      },
      change: { id: "add-login" },
      runtimeId: "fake",
      runtimeResult: { status: "completed" },
    });
    expect(trace.specificationSnapshot.contentDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(trace.taskReferences).toHaveLength(1);

    const requirementId = trace.specificationSnapshot.requirementIds[0];
    await runYh(
      workspace,
      "evidence",
      "record",
      "evidence-cli",
      "--trace",
      trace.id,
      "--subject-kind",
      "requirement",
      "--subject-id",
      requirementId,
      "--kind",
      "test-result",
      "--outcome",
      "passed",
      "--summary",
      "Authentication tests passed",
    );
    await runYh(
      workspace,
      "verification",
      "plan",
      "create",
      "plan-cli",
      "--trace",
      trace.id,
      "--specification",
      trace.specificationId,
      "--digest",
      trace.specificationSnapshot.contentDigest,
      "--criterion",
      `authenticate:requirement:${requirementId}:test-result`,
    );
    const verificationOutput = await runYh(
      workspace,
      "verification",
      "evaluate",
      "plan-cli",
      "--report",
      "report-cli",
    );
    expect(verificationOutput).toContain("outcome 'verified'");
    await runYh(workspace, "work", "start", "login-work");
    const authorizationOutput = await runYh(
      workspace,
      "work",
      "authorize",
      "login-work",
      "--report",
      "report-cli",
      "--decision",
      "authorize-completion",
      "--by",
      "human-reviewer",
      "--reason",
      "Verification reviewed",
    );
    expect(authorizationOutput).toContain("Decision 'authorize-completion' recorded");
    const store = createLocalOperationalStore({ workspace });
    await expect(store.workItems.findById(new WorkItemId("login-work"))).resolves.toMatchObject({
      status: WorkItemStatus.Done,
    });
  }, 60_000);
});
