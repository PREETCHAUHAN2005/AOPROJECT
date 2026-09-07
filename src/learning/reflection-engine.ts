import { createId } from "@/lib/ids";
import type { Evaluation, ExecutionTrace, Failure, LearningCandidate } from "@/models";
import { roundScore, usedSlackBeforeOrderApi } from "./trace-signals";

export interface ReflectionEngine {
  reflect(
    trace: ExecutionTrace,
    evaluation: Evaluation,
    failures: Failure[],
  ): Promise<LearningCandidate>;
}

export function createReflectionEngine(): ReflectionEngine {
  return {
    async reflect(trace, evaluation, failures) {
      if (
        usedSlackBeforeOrderApi(trace) ||
        failures.some((failure) => failure.classification === "tool_ordering")
      ) {
        return {
          id: createId("candidate"),
          type: "tool_policy",
          condition: "task requires authoritative order state",
          recommendation: "query order_api first",
          avoid: "slack before authoritative lookup",
          reason: "order_api is authoritative",
          confidence: confidenceFrom(evaluation, failures),
          status: "proposed",
          sourceTraceIds: [trace.id],
          createdAt: new Date().toISOString(),
        };
      }

      return {
        id: createId("candidate"),
        type: "tool_policy",
        condition: "no strong reusable lesson detected",
        recommendation: "keep current tool policy",
        reason: "failures did not yield a structured tool-ordering improvement",
        confidence: 0.2,
        status: "proposed",
        sourceTraceIds: [trace.id],
        createdAt: new Date().toISOString(),
      };
    },
  };
}

function confidenceFrom(evaluation: Evaluation, failures: Failure[]): number {
  let confidence = 0.72;
  if (failures.some((failure) => failure.classification === "tool_ordering")) confidence += 0.08;
  if (failures.some((failure) => failure.classification === "unnecessary_tool")) confidence += 0.05;
  if (failures.some((failure) => failure.classification === "efficiency")) confidence += 0.04;
  confidence += (1 - evaluation.efficiency) * 0.06;
  return roundScore(Math.min(0.95, confidence));
}
