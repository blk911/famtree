import type { ExecutionResultStatus } from "./types";

export const EXECUTION_STUB_MESSAGE =
  "Execution adapter is stubbed. No message sent, no payment processed, no booking changed.";

export function isExecutionAllowed(): boolean {
  return false;
}

export function defaultExecutionStatus(): ExecutionResultStatus {
  return "NOT_IMPLEMENTED";
}
