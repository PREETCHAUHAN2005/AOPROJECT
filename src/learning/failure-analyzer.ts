import { createId } from "@/lib/ids";
import type { Evaluation, ExecutionTrace, Failure } from "@/models";
import {
  firstAuthoritativeIndex,
  toolOrder,
  usedSlackBeforeOrderApi,
} from "./trace-signals";

export interface FailureAnalyzer {
  analyze(trace: ExecutionTrace, evaluation: Evaluation): Promise<Failure[]>;
}

export function createFailureAnalyzer(): FailureAnalyzer {
  return {
    async analyze(trace, _evaluation) {
      const failures: Failure[] = [];
      const order = toolOrder(trace);
      const createdAt = new Date().toISOString();

      if (usedSlackBeforeOrderApi(trace)) {
        failures.push({
          id: createId("failure"),
          traceId: trace.id,
          classification: "tool_ordering",
          description: "The agent searched Slack before querying the authoritative Order API.",
          evidence: `Tool order: ${order.join(" → ")}`,
          createdAt,
        });
        failures.push({
          id: createId("failure"),
          traceId: trace.id,
          classification: "unnecessary_tool",
          description:
            "Slack was used as a first-line search even though the Order API is authoritative for order state.",
          evidence: "Slack is operational chatter and is marked non-authoritative.",
          createdAt,
        });
        failures.push({
          id: createId("failure"),
          traceId: trace.id,
          classification: "efficiency",
          description:
            "Inefficient tool ordering: non-authoritative chatter was searched before the source of truth.",
          evidence: `toolCallCount=${trace.toolCallCount}; order=${order.join(" → ")}`,
          createdAt,
        });
        return failures;
      }

      const authIndex = firstAuthoritativeIndex(trace);
      if (authIndex > 0) {
        const prior = order.slice(0, authIndex);
        failures.push({
          id: createId("failure"),
          traceId: trace.id,
          classification: "tool_ordering",
          description: `The agent queried ${prior.join(", ")} before the authoritative ${order[authIndex]}.`,
          evidence: `Tool order: ${order.join(" → ")}`,
          createdAt,
        });
      }

      return failures;
    },
  };
}
