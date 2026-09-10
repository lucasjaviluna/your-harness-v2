/**
 * Result returned by a Runtime implementation.
 *
 * RuntimeResult represents runtime output only. It is not an Engineering
 * state transition and must not be interpreted as automatic WorkItem
 * completion.
 */
export type RuntimeResultStatus =
  | "completed"
  | "failed"
  | "cancelled";

export interface RuntimeFailure {
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface RuntimeResult {
  readonly status: RuntimeResultStatus;
  readonly summary: string;
  readonly runtimeSessionId?: string;
  readonly timestamps: {
    readonly startedAt: string;
    readonly completedAt?: string;
  };
  readonly failure?: RuntimeFailure;
}
