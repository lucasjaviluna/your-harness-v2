import { describe, expect, it } from "vitest";
import {
  CreateChangeDraftHandoffUseCase,
  InMemoryChangeDraftHandoffRepository,
} from "@your-harness/application";

const input = (overrides: Record<string, unknown> = {}) => ({
  id: "handoff-1",
  changeId: "add-mfa",
  providerId: "openspec",
  provenance: { providerId: "openspec", reference: "openspec/changes/add-mfa" },
  origin: "agent" as const,
  baseVersion: "1",
  baseContentDigest: "base-digest",
  proposedVersion: "2",
  proposedContentDigest: "proposed-digest",
  proposal: "# Proposal",
  design: "# Design",
  tasks: "- [ ] Implement",
  createdBy: "agent",
  createdByRole: "engineer",
  createdAt: "2026-09-15T01:30:00.000Z",
  ...overrides,
});

describe("ChangeDraftHandoff", () => {
  it("crea un snapshot ready-for-review y conserva el contenido completo", async () => {
    const repository = new InMemoryChangeDraftHandoffRepository();
    const handoff = await new CreateChangeDraftHandoffUseCase(repository).execute(input());

    expect(handoff.status).toBe("ready-for-review");
    expect(handoff.proposal).toBe("# Proposal");
    expect(await repository.findCurrentByChangeId("add-mfa")).toEqual(handoff);
  });

  it("exige encadenar una nueva revisión al handoff vigente", async () => {
    const repository = new InMemoryChangeDraftHandoffRepository();
    const useCase = new CreateChangeDraftHandoffUseCase(repository);
    await useCase.execute(input());

    await expect(useCase.execute(input({ id: "handoff-2", createdAt: "2026-09-15T01:31:00.000Z" })))
      .rejects.toThrow("supersedesHandoffId");

    const replacement = await useCase.execute(input({
      id: "handoff-2",
      createdAt: "2026-09-15T01:31:00.000Z",
      supersedesHandoffId: "handoff-1",
    }));
    expect(replacement.supersedesHandoffId).toBe("handoff-1");
    expect((await repository.findByChangeId("add-mfa")).map((item) => item.id)).toEqual(["handoff-1", "handoff-2"]);
  });
});
