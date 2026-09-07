import { LEARNED_ORDER_INVESTIGATION_TOOLS } from "@/agent/policy-order";
import { createId } from "@/lib/ids";
import type { LearningCandidate, Policy } from "@/models";

export interface PolicyEngine {
  fromCandidate(candidate: LearningCandidate): Promise<Policy>;
}

export function createPolicyEngine(): PolicyEngine {
  return {
    async fromCandidate(candidate) {
      const action = policyActionFrom(candidate);
      return {
        id: createId("policy"),
        condition: candidate.condition,
        action,
        confidence: candidate.confidence,
        evidenceCount: candidate.sourceTraceIds.length,
        status: "pending",
        createdFromRuns: candidate.sourceTraceIds,
        performanceBefore: null,
        performanceAfter: null,
        createdAt: new Date().toISOString(),
      };
    },
  };
}

export function policyActionFrom(candidate: LearningCandidate): string {
  const parts = [candidate.recommendation];
  if (candidate.avoid) {
    parts.push(`avoid ${candidate.avoid}`);
  }
  if (
    /query order_api first/i.test(candidate.recommendation) ||
    /order_api before slack/i.test(candidate.recommendation)
  ) {
    parts.push(`use tools: ${LEARNED_ORDER_INVESTIGATION_TOOLS.join(", ")}`);
  }
  return parts.join("; ");
}

export function trialPromotedPolicy(policy: Policy): Policy {
  return { ...policy, status: "promoted" };
}
