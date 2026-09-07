import { store } from "@/store";
import { createJsonTraceStore, createSimpleCostTracker } from "@/telemetry";
import { createAgentRuntime, type AgentRuntime, type RuntimeDependencies } from "./runtime";
import { createPlanner } from "./planner";
import { createPolicyLoader } from "./policy-loader";
import { createToolSelector } from "./tool-selector";

export function createEvolynRuntime(
  overrides: Partial<RuntimeDependencies> = {},
): AgentRuntime {
  const policyLoader = overrides.policyLoader ?? createPolicyLoader();
  const toolSelector = createToolSelector(() => store.getCurrentVersion());
  const planner = overrides.planner ?? createPlanner(toolSelector);

  return createAgentRuntime({
    policyLoader,
    planner,
    traceStore: overrides.traceStore ?? createJsonTraceStore(),
    costTracker: overrides.costTracker ?? createSimpleCostTracker(),
    loadMemories:
      overrides.loadMemories ??
      ((task) =>
        store.memories
          .list()
          .filter(
            (memory) =>
              memory.validationStatus === "promoted" &&
              (task.domain === "order_investigation" ||
                /order/i.test(task.prompt) ||
                Boolean(memory.toolName)),
          )),
    getVersionId: overrides.getVersionId ?? (() => store.getCurrentVersion().version),
  });
}
