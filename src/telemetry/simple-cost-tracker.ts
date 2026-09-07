import type { CostTracker } from "./cost-tracker";

const BASE_COST: Record<string, number> = {
  slack: 0.008,
  crm: 0.004,
  order_api: 0.003,
  knowledge_base: 0.006,
};

export function createSimpleCostTracker(): CostTracker {
  return {
    estimate(toolName, latencyMs) {
      const base = BASE_COST[toolName] ?? 0.002;
      return Number((base + latencyMs * 0.00001).toFixed(5));
    },
  };
}
