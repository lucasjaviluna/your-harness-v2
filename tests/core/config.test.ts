import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { loadConfig } from "../../src/core/config.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("configuración de runtime por proyecto", () => {
  it("resuelve la política de runtime desde config.yml", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "your-harness-config-"));
    roots.push(root);
    const configPath = path.join(root, "config.yml");
    await writeFile(
      configPath,
      `runtime:
  defaultRuntime: pi
  sddProvider: openspec
  sddMaterializer: external-command
  requireSddChangeTraceability: true
  executionEnvironment:
    workspace:
      mode: read-write
      allowedPaths: ["src"]
    capabilities: [workspace.read, workspace.write, network.access]
    network:
      mode: allowlist
      allowedHosts: [api.example.test]
    confirmations:
      mode: on-risk
`,
    );

    const config = loadConfig({
      globalConfigPath: path.join(root, "missing-global.yml"),
      localConfigPath: configPath,
    });

    expect(config.runtime).toMatchObject({
      defaultRuntime: "pi",
      sddProvider: "openspec",
      sddMaterializer: "external-command",
      requireSddChangeTraceability: true,
      executionEnvironment: {
        workspace: { mode: "read-write", allowedPaths: ["src"] },
        capabilities: ["workspace.read", "workspace.write", "network.access"],
        network: { mode: "allowlist", allowedHosts: ["api.example.test"] },
        confirmations: { mode: "on-risk" },
      },
    });
  });
});
