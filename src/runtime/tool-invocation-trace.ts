export type ToolInvocationOutcome = "allowed" | "denied" | "failed";

export interface ToolInvocationTrace {
  readonly id: string;
  readonly runtimeId: string;
  readonly sessionId?: string;
  readonly toolName: string;
  readonly requestedPath?: string;
  readonly resolvedPath?: string;
  readonly bytesRead?: number;
  readonly outcome: ToolInvocationOutcome;
  readonly reason?: string;
  readonly invokedAt: string;
}

export interface ToolInvocationRecorder {
  record(trace: ToolInvocationTrace): Promise<void>;
}
