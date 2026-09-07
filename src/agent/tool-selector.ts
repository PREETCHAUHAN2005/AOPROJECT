import type { AgentVersion, Memory, Policy, Task } from "@/models";
import { applyPromotedMemories, applyPromotedPolicies } from "./policy-order";

export interface ToolSelector {
  select(task: Task, policies: Policy[], memories: Memory[]): Promise<string[]>;
}

export function createToolSelector(getVersion: () => AgentVersion): ToolSelector {
  return {
    async select(_task, policies, memories) {
      const version = getVersion();
      const fromPolicy = applyPromotedPolicies(version.defaultToolOrder, policies);
      return applyPromotedMemories(fromPolicy, memories);
    },
  };
}
