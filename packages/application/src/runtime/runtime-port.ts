import type { ExecutionRequest } from "./execution-request.js";
import type { RuntimeResult } from "./runtime-result.js";

/**
 * Application-level boundary between the Engineering/Application layers
 * and a concrete agent execution runtime.
 *
 * Implementations may delegate to the native YH runtime, Pi, or another
 * runtime without leaking that implementation into the Application layer.
 */
export interface RuntimePort {
  execute(request: ExecutionRequest): Promise<RuntimeResult>;
}
