import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { SddProvider } from "@your-harness/application";
import { OpenSpecSddProvider } from "../../src/sdd/index.js";

const temporaryRoots: string[] = [];

const createFixture = async (): Promise<string> => {
  const root = await mkdtemp(path.join(os.tmpdir(), "yh-openspec-"));
  temporaryRoots.push(root);
  await mkdir(path.join(root, "openspec/specs/authentication"), { recursive: true });
  await mkdir(path.join(root, "openspec/changes/add-mfa/specs/authentication"), { recursive: true });

  await writeFile(
    path.join(root, "openspec/specs/authentication/spec.md"),
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
    path.join(root, "openspec/changes/add-mfa/proposal.md"),
    `# Add MFA

## Why
Accounts need stronger protection.
`,
  );
  await writeFile(path.join(root, "openspec/changes/add-mfa/design.md"), "# MFA design\n");
  await writeFile(
    path.join(root, "openspec/changes/add-mfa/tasks.md"),
    "- [ ] Add challenge\n- [x] Document the flow\n",
  );
  await writeFile(
    path.join(root, "openspec/changes/add-mfa/specs/authentication/spec.md"),
    "# Authentication delta\n",
  );
  return root;
};

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("OpenSpecSddProvider", () => {
  it("implements the neutral read-only SddProvider contract", async () => {
    const root = await createFixture();
    const provider: SddProvider = new OpenSpecSddProvider();

    const project = await provider.readProject({ root });

    expect(project.providerId).toBe("openspec");
    expect(project.specifications).toEqual([
      expect.objectContaining({
        id: "authentication",
        title: "Authentication",
        contentDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
        requirements: [
          expect.objectContaining({
            name: "Authenticate users",
            normativeStatement: "The system SHALL authenticate users with valid credentials.",
            scenarios: [
              expect.objectContaining({
                condition: "a user submits valid credentials",
                expectedBehavior: "the system grants access",
              }),
            ],
          }),
        ],
      }),
    ]);
    expect(project.changes).toEqual([
      expect.objectContaining({
        id: "add-mfa",
        title: "Add MFA",
        version: "1",
        contentDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
        status: "unknown",
        rationale: "Accounts need stronger protection.",
        tasks: [
          expect.objectContaining({ title: "Add challenge", completed: false, status: "pending" }),
          expect.objectContaining({ title: "Document the flow", completed: true, status: "completed" }),
        ],
      }),
    ]);
    expect(project.changes[0]?.artifacts.map((artifact) => artifact.kind)).toEqual([
      "proposal",
      "design",
      "tasks",
      "specification-effect",
    ]);
  });

  it("does not mutate OpenSpec artifacts while reading", async () => {
    const root = await createFixture();
    const specPath = path.join(root, "openspec/specs/authentication/spec.md");
    const before = await readFile(specPath, "utf8");

    await new OpenSpecSddProvider().readProject({ root });

    await expect(readFile(specPath, "utf8")).resolves.toBe(before);
  });

  it("fails clearly when the workspace has no OpenSpec root", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "yh-no-openspec-"));
    temporaryRoots.push(root);

    await expect(new OpenSpecSddProvider().readProject({ root })).rejects.toThrow(
      "OpenSpec directory not found",
    );
  });
});
