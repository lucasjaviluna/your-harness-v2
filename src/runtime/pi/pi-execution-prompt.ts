import type { ExecutionRequest } from "../../../packages/application/src/runtime/execution-request.js";

export function buildPiExecutionPrompt(request: ExecutionRequest): string {
  const sections: string[] = ["## Objective", request.objective, "", "## Engineering Context"];

  if (request.engineeringContext.knowledge.length) {
    sections.push("", "### Knowledge");
    for (const item of request.engineeringContext.knowledge) {
      sections.push(`#### ${item.title}`, item.content);
    }
  }

  if (request.engineeringContext.requirements.length) {
    sections.push("", "### Requirements");
    for (const requirement of request.engineeringContext.requirements) {
      sections.push(`#### ${requirement.name}`, requirement.normativeStatement);
      for (const scenario of requirement.scenarios) {
        sections.push("", "Scenario:", `WHEN ${scenario.condition}`, `THEN ${scenario.expectedBehavior}`);
      }
    }
  }

  if (request.engineeringContext.engineeringConstraints.length) {
    sections.push("", "### Engineering Constraints");
    for (const constraint of request.engineeringContext.engineeringConstraints) sections.push(`- ${constraint}`);
  }

  if (request.executionConstraints.length) {
    sections.push("", "## Execution Constraints");
    for (const constraint of request.executionConstraints) sections.push(`- ${constraint}`);
  }

  return sections.join("\n");
}
