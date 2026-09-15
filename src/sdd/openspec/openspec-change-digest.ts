import { createHash } from "node:crypto";

export const openSpecChangeDigest = (input: {
  readonly changeId: string;
  readonly version: string;
  readonly proposal: string;
  readonly design: string;
  readonly tasks: string;
  readonly specificationEffects?: ReadonlyArray<{ readonly reference: string; readonly content: string }>;
}): string => createHash("sha256")
  // La versión pertenece a la línea de revisión de YH, no al contenido que OpenSpec persiste.
  .update(JSON.stringify({
    changeId: input.changeId,
    proposal: input.proposal,
    design: input.design,
    tasks: input.tasks,
    specificationEffects: input.specificationEffects ?? [],
  }))
  .digest("hex");
