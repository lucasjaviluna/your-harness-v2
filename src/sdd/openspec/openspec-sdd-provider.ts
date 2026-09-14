import { readdir, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import type { Dirent } from "node:fs";
import path from "node:path";

import { SddChangeStatus, SddTaskStatus } from "@your-harness/application";
import type {
  SddArtifactReference,
  SddChangeProjection,
  SddProjectProjection,
  SddProjectScope,
  SddProvider,
  SddProvenance,
  SddRequirementProjection,
  SddScenarioProjection,
  SddSpecificationProjection,
  SddTaskProjection,
} from "@your-harness/application";

const providerId = "openspec";

const toReference = (root: string, filePath: string): string =>
  path.relative(root, filePath).split(path.sep).join("/");

const toId = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "unnamed";

const provenance = (root: string, filePath: string): SddProvenance => ({
  providerId,
  reference: toReference(root, filePath),
});

const projectionDigest = (projection: {
  readonly id: string;
  readonly title: string;
  readonly provenance: SddProvenance;
  readonly requirements: ReadonlyArray<SddRequirementProjection>;
}): string => createHash("sha256")
  .update(JSON.stringify(projection))
  .digest("hex");

const firstHeading = (markdown: string, fallback: string): string =>
  markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? fallback;

const sectionAfterHeading = (markdown: string, heading: string): string | undefined => {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^#{1,3}\\s+${heading}\\s*$`, "i").test(line));
  if (start === -1) return undefined;

  const content: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,3}\s+/.test(line)) break;
    content.push(line);
  }
  return content.join("\n").trim() || undefined;
};

const textAfterMarker = (lines: ReadonlyArray<string>, marker: string): string | undefined => {
  const match = lines
    .join("\n")
    .match(new RegExp(`(?:^|\\n)\\s*(?:-\\s*)?\\*\\*${marker}\\*\\*\\s*(.+)$`, "im"));
  return match?.[1]?.trim();
};

const parseScenarios = (
  root: string,
  filePath: string,
  requirementId: string,
  lines: ReadonlyArray<string>,
): ReadonlyArray<SddScenarioProjection> => {
  const starts = lines
    .map((line, index) => ({ match: line.match(/^####\s+Scenario:\s*(.+)$/i), index }))
    .filter((entry): entry is { match: RegExpMatchArray; index: number } => entry.match !== null);

  return starts.map(({ match, index }, scenarioIndex) => {
    const end = starts[scenarioIndex + 1]?.index ?? lines.length;
    const body = lines.slice(index + 1, end);
    const name = match[1].trim();
    const id = `${requirementId}:${toId(name)}`;

    return {
      id,
      name,
      condition: textAfterMarker(body, "WHEN") ?? "",
      expectedBehavior: textAfterMarker(body, "THEN") ?? "",
      provenance: provenance(root, filePath),
    };
  });
};

const parseRequirements = (
  root: string,
  filePath: string,
  markdown: string,
): ReadonlyArray<SddRequirementProjection> => {
  const lines = markdown.split(/\r?\n/);
  const starts = lines
    .map((line, index) => ({ match: line.match(/^###\s+Requirement:\s*(.+)$/i), index }))
    .filter((entry): entry is { match: RegExpMatchArray; index: number } => entry.match !== null);

  return starts.map(({ match, index }, requirementIndex) => {
    const end = starts[requirementIndex + 1]?.index ?? lines.length;
    const name = match[1].trim();
    const id = toId(name);
    const body = lines.slice(index + 1, end);
    const firstScenario = body.findIndex((line) => /^####\s+Scenario:/i.test(line));
    const normativeLines = body.slice(0, firstScenario === -1 ? body.length : firstScenario);
    const normativeStatement = normativeLines
      .filter((line) => line.trim() && !/^#{1,6}\s+/.test(line))
      .join(" ")
      .trim();

    return {
      id,
      name,
      normativeStatement,
      scenarios: parseScenarios(root, filePath, id, body),
      provenance: provenance(root, filePath),
    };
  });
};

const readOptional = async (filePath: string): Promise<string | undefined> => {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
};

const readMarkdownFiles = async (directory: string): Promise<ReadonlyArray<string>> => {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return readMarkdownFiles(entryPath);
        return entry.isFile() && entry.name.endsWith(".md") ? [entryPath] : [];
      }),
    );
    return files.flat();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
};

/** Read-only OpenSpec adapter. It never invokes an OpenSpec CLI or writes artifacts. */
export class OpenSpecSddProvider implements SddProvider {
  readonly id = providerId;

  async readProject(scope: SddProjectScope): Promise<SddProjectProjection> {
    const root = path.resolve(scope.root);
    const openspecRoot = path.join(root, "openspec");

    try {
      if (!(await stat(openspecRoot)).isDirectory()) {
        throw new Error(`OpenSpec directory not found: ${openspecRoot}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("OpenSpec directory not found")) {
        throw error;
      }
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new Error(`OpenSpec directory not found: ${openspecRoot}`);
      }
      throw error;
    }

    return {
      providerId: this.id,
      scope: { root },
      specifications: await this.readSpecifications(root, openspecRoot),
      changes: await this.readChanges(root, openspecRoot),
    };
  }

  private async readSpecifications(
    root: string,
    openspecRoot: string,
  ): Promise<ReadonlyArray<SddSpecificationProjection>> {
    const specificationsRoot = path.join(openspecRoot, "specs");
    const files = (await readMarkdownFiles(specificationsRoot))
      .filter((filePath) => path.basename(filePath) === "spec.md")
      .sort();

    return Promise.all(
      files.map(async (filePath) => {
        const markdown = await readFile(filePath, "utf8");
        const projection = {
          id: toId(path.basename(path.dirname(filePath))),
          title: firstHeading(markdown, path.basename(path.dirname(filePath))),
          requirements: parseRequirements(root, filePath, markdown),
          provenance: provenance(root, filePath),
        };
        return { ...projection, contentDigest: projectionDigest(projection) };
      }),
    );
  }

  private async readChanges(
    root: string,
    openspecRoot: string,
  ): Promise<ReadonlyArray<SddChangeProjection>> {
    const changesRoot = path.join(openspecRoot, "changes");
    let entries: Dirent[];
    try {
      entries = await readdir(changesRoot, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }

    return Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((entry) => this.readChange(root, path.join(changesRoot, entry.name), entry.name)),
    );
  }

  private async readChange(
    root: string,
    changeRoot: string,
    directoryName: string,
  ): Promise<SddChangeProjection> {
    const proposalPath = path.join(changeRoot, "proposal.md");
    const designPath = path.join(changeRoot, "design.md");
    const tasksPath = path.join(changeRoot, "tasks.md");
    const proposal = await readOptional(proposalPath);
    const tasks = await readOptional(tasksPath);
    const specificationEffects = await readMarkdownFiles(path.join(changeRoot, "specs"));
    const artifacts: SddArtifactReference[] = [];

    if (proposal !== undefined) artifacts.push({ kind: "proposal", provenance: provenance(root, proposalPath) });
    if ((await readOptional(designPath)) !== undefined) artifacts.push({ kind: "design", provenance: provenance(root, designPath) });
    if (tasks !== undefined) artifacts.push({ kind: "tasks", provenance: provenance(root, tasksPath) });
    specificationEffects.forEach((filePath) =>
      artifacts.push({ kind: "specification-effect", provenance: provenance(root, filePath) }),
    );

    return {
      id: directoryName,
      title: proposal ? firstHeading(proposal, directoryName) : directoryName,
      status: SddChangeStatus.Unknown,
      rationale: proposal ? sectionAfterHeading(proposal, "Why") : undefined,
      tasks: this.parseTasks(root, tasksPath, tasks),
      artifacts,
      provenance: {
        providerId,
        reference: toReference(root, changeRoot),
      },
    };
  }

  private parseTasks(
    root: string,
    filePath: string,
    markdown: string | undefined,
  ): ReadonlyArray<SddTaskProjection> {
    if (!markdown) return [];

    return markdown
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*-\s*\[([ xX])\]\s+(.+)$/))
      .filter((match): match is RegExpMatchArray => match !== null)
      .map((match, index) => ({
        id: `${toReference(root, filePath)}#${index + 1}`,
        title: match[2].trim(),
        completed: match[1].toLowerCase() === "x",
        status: match[1].toLowerCase() === "x" ? SddTaskStatus.Completed : SddTaskStatus.Pending,
        provenance: provenance(root, filePath),
      }));
  }
}
