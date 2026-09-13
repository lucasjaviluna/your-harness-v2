import type { CompletionAuthorization } from "./completion-authorization.js";

export interface CompletionAuthorizationRepository {
  save(authorization: CompletionAuthorization): Promise<void>;
  findById(id: string): Promise<CompletionAuthorization | null>;
  findByWorkItemId(workItemId: string): Promise<ReadonlyArray<CompletionAuthorization>>;
}
