export interface CostTracker {
  estimate(toolName: string, latencyMs: number): number;
}
