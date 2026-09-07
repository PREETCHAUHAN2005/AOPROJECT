import { createId } from "@/lib/ids";
import type { ExecutionTrace, Memory, Task, ToolCall } from "@/models";
import { getTool } from "@/tools";
import type { CostTracker, TraceStore } from "@/telemetry";
import { synthesizeAnswer } from "./answer";
import { buildToolInput } from "./inputs";
import type { Planner } from "./planner";
import type { PolicyLoader } from "./policy-loader";

export interface AgentRuntime {
  execute(task: Task): Promise<ExecutionTrace>;
}

export interface RuntimeDependencies {
  policyLoader: PolicyLoader;
  planner: Planner;
  traceStore: TraceStore;
  costTracker: CostTracker;
  loadMemories: (task: Task) => Memory[];
  getVersionId: () => string;
}

export function createAgentRuntime(deps: RuntimeDependencies): AgentRuntime {
  return {
    async execute(task: Task) {
      const startedAt = Date.now();
      const policies = await deps.policyLoader.loadActive();
      const memories = deps.loadMemories(task);
      const plan = await deps.planner.plan(task, policies, memories);

      const toolCalls: ToolCall[] = [];
      const observations: unknown[] = [];

      for (const toolName of plan.toolOrder) {
        const input = buildToolInput(task, toolName, observations);
        const toolCall = await invokeTool(toolName, input, deps.costTracker);
        toolCalls.push(toolCall);
        observations.push(toolCall.observation);
      }

      const endedAt = Date.now();
      const allSucceeded = toolCalls.every((call) => call.success);
      const trace: ExecutionTrace = {
        id: createId("trace"),
        taskId: task.id,
        task: task.prompt,
        agentVersion: deps.getVersionId(),
        timestamp: new Date(startedAt).toISOString(),
        toolCalls,
        observations,
        finalResult: synthesizeAnswer(task.prompt, toolCalls),
        success: allSucceeded && toolCalls.length > 0,
        qualityScore: 0,
        toolCallCount: toolCalls.length,
        latencyMs: endedAt - startedAt,
        estimatedCost: Number(
          toolCalls.reduce((sum, call) => sum + call.estimatedCost, 0).toFixed(5),
        ),
        failureClassification: [],
      };

      return deps.traceStore.save(trace);
    },
  };
}

async function invokeTool(
  toolName: string,
  input: Record<string, unknown>,
  costTracker: CostTracker,
): Promise<ToolCall> {
  const startedAt = new Date();
  const startMs = Date.now();

  try {
    const observation = await getTool(toolName).execute(input);
    const endedAt = new Date();
    const latencyMs = endedAt.getTime() - startMs;
    return {
      id: createId("call"),
      tool: toolName,
      input,
      observation,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      latencyMs,
      success: true,
      estimatedCost: costTracker.estimate(toolName, latencyMs),
    };
  } catch (error) {
    const endedAt = new Date();
    const latencyMs = endedAt.getTime() - startMs;
    return {
      id: createId("call"),
      tool: toolName,
      input,
      observation: {
        error: error instanceof Error ? error.message : "Tool execution failed",
      },
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      latencyMs,
      success: false,
      estimatedCost: costTracker.estimate(toolName, latencyMs),
    };
  }
}
