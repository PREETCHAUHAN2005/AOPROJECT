import type { AgentVersion, Task } from "../models";
import type { EvolynDatabase } from "./schema";

export const V0_VERSION_ID = "version-v0";
export const DEMO_TASK_ID = "task-order-4821";

export const V0_TOOL_ORDER = ["slack", "crm", "order_api", "knowledge_base"] as const;

export const DEMO_TASK_PROMPT =
  "Investigate why order #4821 was delayed and determine what action should be taken.";

export function createV0Version(createdAt: string): AgentVersion {
  return {
    id: V0_VERSION_ID,
    version: "v0",
    label: "Initial behavior",
    changelog:
      "Default suboptimal tool order: Slack → CRM → Order API → Knowledge Base",
    policyIds: [],
    defaultToolOrder: [...V0_TOOL_ORDER],
    createdAt,
    parentVersion: null,
  };
}

export function createDemoTask(createdAt: string): Task {
  return {
    id: DEMO_TASK_ID,
    prompt: DEMO_TASK_PROMPT,
    domain: "order_investigation",
    createdAt,
  };
}

export function createSeedDatabase(createdAt = new Date().toISOString()): EvolynDatabase {
  return {
    tasks: [createDemoTask(createdAt)],
    traces: [],
    evaluations: [],
    failures: [],
    memories: [],
    policies: [],
    candidates: [],
    versions: [createV0Version(createdAt)],
    benchmarks: [],
    learningEvents: [],
    currentVersionId: V0_VERSION_ID,
  };
}
