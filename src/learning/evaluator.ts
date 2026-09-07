import { createId } from "@/lib/ids";
import type { Evaluation, ExecutionTrace } from "@/models";
import {
  clamp01,
  countUnnecessaryTools,
  observationRecord,
  roundScore,
  usedSlackBeforeOrderApi,
} from "./trace-signals";

export interface Evaluator {
  evaluate(trace: ExecutionTrace): Promise<Evaluation>;
}

export function createEvaluator(): Evaluator {
  return {
    async evaluate(trace) {
      const correctness = scoreCorrectness(trace);
      const evidenceQuality = scoreEvidence(trace);
      const efficiency = scoreEfficiency(trace);
      const policyCompliance = scorePolicy(trace);
      const overall = roundScore(
        0.35 * correctness + 0.2 * evidenceQuality + 0.3 * efficiency + 0.15 * policyCompliance,
      );

      return {
        id: createId("eval"),
        traceId: trace.id,
        correctness,
        evidenceQuality,
        efficiency,
        policyCompliance,
        overall,
        toolCallCount: trace.toolCallCount,
        unnecessaryToolCalls: countUnnecessaryTools(trace),
        latencyMs: trace.latencyMs,
        estimatedCost: trace.estimatedCost,
        createdAt: new Date().toISOString(),
      };
    },
  };
}

function scoreCorrectness(trace: ExecutionTrace): number {
  const answer = trace.finalResult.toLowerCase();
  const order = trace.toolCalls
    .map(observationRecord)
    .find((observation) => observation?.tool === "order_api");
  let score = 0;
  if (trace.success) score += 0.2;
  if (order?.found === true) score += 0.3;
  if (answer.includes("delay")) score += 0.2;
  if (answer.includes("4821") || answer.includes(String(order?.orderId ?? ""))) score += 0.15;
  if (/(notify|escalate|expedite)/.test(answer)) score += 0.15;
  return roundScore(score);
}

function scoreEvidence(trace: ExecutionTrace): number {
  const foundCalls = trace.toolCalls.filter((call) => observationRecord(call)?.found === true);
  const hasAuthoritative = foundCalls.some((call) => observationRecord(call)?.authoritative === true);
  let score = foundCalls.length === 0 ? 0 : 0.35 + 0.1 * Math.min(foundCalls.length, 4);
  if (hasAuthoritative) score += 0.25;
  if (usedSlackBeforeOrderApi(trace)) score -= 0.15;
  return roundScore(score);
}

function scoreEfficiency(trace: ExecutionTrace): number {
  const unnecessary = countUnnecessaryTools(trace);
  const idealCount = 3;
  let score = 1;
  if (trace.toolCallCount > idealCount) {
    score -= 0.14 * (trace.toolCallCount - idealCount);
  }
  score -= 0.28 * unnecessary;
  if (usedSlackBeforeOrderApi(trace)) score -= 0.24;
  return roundScore(score);
}

function scorePolicy(trace: ExecutionTrace): number {
  let score = 1;
  if (usedSlackBeforeOrderApi(trace)) score -= 0.45;
  if (countUnnecessaryTools(trace) > 0) score -= 0.12;
  return roundScore(clamp01(score));
}
