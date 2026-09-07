import type { ExecutionTrace } from "@/models";

export interface TraceStore {
  save(trace: ExecutionTrace): Promise<ExecutionTrace>;
  get(id: string): Promise<ExecutionTrace | null>;
  list(): Promise<ExecutionTrace[]>;
}
