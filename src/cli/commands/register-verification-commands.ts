import { randomUUID } from "node:crypto";
import chalk from "chalk";
import type { Command } from "commander";
import {
  RecordEvidenceUseCase,
  createVerificationPlan,
  evaluateVerificationPlan,
  type EvidenceKind,
  type EvidenceOutcome,
  type EvidenceSubject,
  type VerificationCriterion,
} from "@your-harness/application";
import { createLocalOperationalStore } from "../../persistence/index.js";
import type { CliContext } from "../cli-context.js";
import { createCliConsole } from "../presentation/cli-io.js";
import { writeCliError } from "../presentation/cli-errors.js";

const evidenceKinds: ReadonlyArray<EvidenceKind> = [
  "test-result",
  "command-result",
  "artifact-digest",
  "review-note",
  "attestation",
];

const evidenceOutcomes: ReadonlyArray<EvidenceOutcome> = ["passed", "failed", "inconclusive"];

const parseEvidenceSubject = (kind: string, id: string): EvidenceSubject => {
  if (kind !== "requirement" && kind !== "scenario") {
    throw new Error("Evidence subject must be 'requirement' or 'scenario'.");
  }
  if (!id.trim()) throw new Error("Evidence subject id cannot be empty.");
  return kind === "requirement" ? { kind, requirementId: id } : { kind, scenarioId: id };
};

const parseCriterion = (value: string): VerificationCriterion => {
  const parts = value.split(":");
  if (parts.length < 4) {
    throw new Error("Criterion must use '<id>:<requirement|scenario>:<subject-id>:<evidence-kind>[,<evidence-kind>...]'.");
  }
  const [id, subjectKind, subjectId, ...kindParts] = parts;
  const expectedEvidenceKinds = kindParts.join(":").split(",").filter(Boolean) as EvidenceKind[];
  if (!id || !subjectKind || !subjectId || expectedEvidenceKinds.length === 0) {
    throw new Error("Criterion must include an id, subject and at least one expected evidence kind.");
  }
  const invalidKind = expectedEvidenceKinds.find((kind) => !evidenceKinds.includes(kind));
  if (invalidKind) throw new Error(`Unsupported evidence kind '${invalidKind}'.`);
  return {
    id,
    subject: parseEvidenceSubject(subjectKind, subjectId) as Exclude<EvidenceSubject, { kind: "artifact" }>,
    expectedEvidenceKinds,
  };
};

const parseEvidenceKind = (value: string): EvidenceKind => {
  if (!evidenceKinds.includes(value as EvidenceKind)) throw new Error(`Unsupported evidence kind '${value}'.`);
  return value as EvidenceKind;
};

const parseEvidenceOutcome = (value: string): EvidenceOutcome => {
  if (!evidenceOutcomes.includes(value as EvidenceOutcome)) throw new Error(`Unsupported evidence outcome '${value}'.`);
  return value as EvidenceOutcome;
};

/** Registra el ciclo durable de Evidence y Verification desde la CLI. */
export const registerVerificationCommands = (program: Command, { io }: CliContext): void => {
  const console = createCliConsole(io);
  const verification = program.command("verification").description("Record and evaluate post-execution verification");

  const evidence = program.command("evidence").description("Record execution evidence");
  evidence.command("record <evidenceId>")
    .requiredOption("-t, --trace <id>", "ExecutionTrace identifier")
    .requiredOption("-s, --subject-kind <kind>", "requirement or scenario")
    .requiredOption("-i, --subject-id <id>", "Requirement or Scenario identifier")
    .requiredOption("-k, --kind <kind>", "Evidence kind")
    .requiredOption("-o, --outcome <outcome>", "passed, failed or inconclusive")
    .requiredOption("--summary <text>", "Observation summary")
    .option("--locator <value>", "Optional artifact, command or test locator")
    .option("--digest <value>", "Optional observed digest")
    .option("-w, --workspace <path>", "Workspace state location", process.cwd())
    .option("--json", "Imprimir Evidence como JSON")
    .action(async (evidenceId: string, options: { trace: string; subjectKind: string; subjectId: string; kind: string; outcome: string; summary: string; locator?: string; digest?: string; workspace: string; json?: boolean }) => {
      try {
        const store = createLocalOperationalStore({ workspace: options.workspace });
        const item = await new RecordEvidenceUseCase(store.executionTraces, store.evidence).execute({
          id: evidenceId,
          executionTraceId: options.trace,
          subject: parseEvidenceSubject(options.subjectKind, options.subjectId),
          kind: parseEvidenceKind(options.kind),
          outcome: parseEvidenceOutcome(options.outcome),
          summary: options.summary,
          locator: options.locator,
          digest: options.digest,
          capturedAt: new Date().toISOString(),
        });
        if (options.json) console.log(JSON.stringify(item, null, 2));
        else console.log(chalk.green(`✓ Evidence '${item.id}' recorded for trace '${item.executionTraceId}'`));
      } catch (error) {
        writeCliError(io, error, { json: options.json, code: "EVIDENCE_RECORD_FAILED", title: chalk.red("✗ Evidence recording failed:") });
      }
    });

  const plan = verification.command("plan").description("Create a verification plan");
  plan.command("create <planId>")
    .requiredOption("-t, --trace <id>", "ExecutionTrace identifier")
    .requiredOption("-s, --specification <id>", "Specification identifier")
    .requiredOption("--digest <value>", "Approved Specification snapshot digest")
    .requiredOption("-c, --criterion <value>", "id:requirement|scenario:subject-id:evidence-kind[,evidence-kind]", (value, previous: string[] = []) => [...previous, value])
    .option("-w, --workspace <path>", "Workspace state location", process.cwd())
    .option("--json", "Imprimir VerificationPlan como JSON")
    .action(async (planId: string, options: { trace: string; specification: string; digest: string; criterion?: string[]; workspace: string; json?: boolean }) => {
      try {
        const criteria = (options.criterion ?? []).map(parseCriterion);
        const item = createVerificationPlan({
          id: planId,
          executionTraceId: options.trace,
          specificationId: options.specification,
          specificationSnapshotDigest: options.digest,
          criteria,
          createdAt: new Date().toISOString(),
        });
        const store = createLocalOperationalStore({ workspace: options.workspace });
        await store.verificationPlans.save(item);
        if (options.json) console.log(JSON.stringify(item, null, 2));
        else console.log(chalk.green(`✓ Verification plan '${item.id}' persisted with ${item.criteria.length} criterion/criteria`));
      } catch (error) {
        writeCliError(io, error, { json: options.json, code: "VERIFICATION_PLAN_FAILED", title: chalk.red("✗ Verification plan creation failed:") });
      }
    });

  verification.command("evaluate <planId>")
    .option("-r, --report <id>", "VerificationReport identifier", randomUUID())
    .option("-w, --workspace <path>", "Workspace state location", process.cwd())
    .option("--json", "Imprimir VerificationReport como JSON")
    .action(async (planId: string, options: { report: string; workspace: string; json?: boolean }) => {
      try {
        const store = createLocalOperationalStore({ workspace: options.workspace });
        const planItem = await store.verificationPlans.findById(planId);
        if (!planItem) throw new Error(`VerificationPlan '${planId}' was not found.`);
        const trace = await store.executionTraces.findById(planItem.executionTraceId);
        if (!trace) throw new Error(`ExecutionTrace '${planItem.executionTraceId}' was not found.`);
        const evidenceItems = await store.evidence.findByExecutionTraceId(planItem.executionTraceId);
        const report = evaluateVerificationPlan({
          plan: planItem,
          executionTrace: trace,
          evidence: evidenceItems,
          reportId: options.report,
          createdAt: new Date().toISOString(),
        });
        await store.verificationReports.save(report);
        if (options.json) console.log(JSON.stringify(report, null, 2));
        else console.log(chalk.green(`✓ Verification report '${report.id}' persisted with outcome '${report.outcome}'`));
      } catch (error) {
        writeCliError(io, error, { json: options.json, code: "VERIFICATION_EVALUATE_FAILED", title: chalk.red("✗ Verification evaluation failed:") });
      }
    });
};
