import type { Memory, Policy, Task } from "@/models";
import type { ToolSelector } from "./tool-selector";

export interface Plan {
  taskId: string;
  strategy: string;
  toolOrder: string[];
}

export interface Planner {
  plan(task: Task, policies: Policy[], memories: Memory[]): Promise<Plan>;
}

export function createPlanner(selector: ToolSelector): Planner {
  return {
    async plan(task, policies, memories) {
      const toolOrder = await selector.select(task, policies, memories);
      return {
        taskId: task.id,
        strategy:
          policies.length > 0 || memories.some((memory) => memory.validationStatus === "promoted")
            ? "policy-aware"
            : "version-default",
        toolOrder,
      };
    },
  };
}
