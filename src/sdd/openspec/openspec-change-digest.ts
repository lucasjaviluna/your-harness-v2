import { createHash } from "node:crypto";

export const openSpecChangeDigest = (input: {
  readonly changeId: string;
  readonly version: string;
  readonly proposal: string;
  readonly design: string;
  readonly tasks: string;
  readonly specificationEffects?: ReadonlyArray<{ readonly reference: string; readonly content: string }>;
}): string => createHash("sha256")
  .update(JSON.stringify({ ...input, specificationEffects: input.specificationEffects ?? [] }))
  .digest("hex");
