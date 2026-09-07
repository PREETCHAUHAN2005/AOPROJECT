import { LEARNED_ORDER_INVESTIGATION_TOOLS } from "@/agent/policy-order";
import { createId } from "@/lib/ids";
import type { AgentVersion, BenchmarkResult, LearningCandidate, Policy } from "@/models";
import { store } from "@/store";
import { BENCHMARK_THRESHOLD, averageScore } from "@/evaluation/order-benchmark";
import { recordLearningEvent } from "./ledger";
import { createPolicyEngine, trialPromotedPolicy } from "./policy-engine";

export interface ValidationEngine {
  validate(candidate: LearningCandidate): Promise<BenchmarkResult>;
  promote(result: BenchmarkResult): Promise<AgentVersion>;
  reject(result: BenchmarkResult): Promise<LearningCandidate>;
}

export function createValidationEngine(): ValidationEngine {
  return {
    async validate(candidate) {
      const updating = store.candidates.save({ ...candidate, status: "validating" });
      const policy = await createPolicyEngine().fromCandidate(updating);
      store.policies.save(policy);

      const baselinePolicies = store.policies.list().filter((item) => item.status === "promoted");
      const oldScore = await averageScore(baselinePolicies);
      const newScore = await averageScore([...baselinePolicies, trialPromotedPolicy(policy)]);
      const improvement = Number((newScore - oldScore).toFixed(2));
      const shouldPromote = improvement >= BENCHMARK_THRESHOLD;

      store.policies.save({
        ...policy,
        status: "validated",
        performanceBefore: oldScore,
        performanceAfter: newScore,
      });
      store.candidates.save({ ...updating, status: "proposed" });

      const result = store.benchmarks.save({
        id: createId("bench"),
        candidateId: updating.id,
        baselineVersion: store.getCurrentVersion().version,
        candidateVersion: "candidate",
        oldScore,
        newScore,
        improvement,
        promoted: shouldPromote,
        threshold: BENCHMARK_THRESHOLD,
        createdAt: new Date().toISOString(),
      });

      recordLearningEvent(
        "validated",
        `Benchmark old=${oldScore} new=${newScore} improvement=${improvement >= 0 ? "+" : ""}${improvement}`,
        { candidateId: updating.id, policyId: policy.id },
      );

      return result;
    },

    async promote(result) {
      const candidate = store.candidates.get(result.candidateId);
      if (!candidate) {
        throw new Error(`Unknown candidate: ${result.candidateId}`);
      }
      if (candidate.status === "promoted") {
        return store.getCurrentVersion();
      }
      if (result.improvement < result.threshold) {
        throw new Error("Candidate did not beat the promotion threshold.");
      }

      const policy = findPolicyForCandidate(candidate.id);
      if (!policy) {
        throw new Error("No validated policy exists for this candidate.");
      }

      const promotedPolicy = store.policies.save({
        ...policy,
        status: "promoted",
        performanceBefore: result.oldScore,
        performanceAfter: result.newScore,
      });
      store.candidates.save({ ...candidate, status: "promoted" });
      promoteRelatedMemories(candidate.sourceTraceIds, result.improvement);

      const current = store.getCurrentVersion();
      const nextVersion = nextVersionLabel(current.version);
      const version = store.versions.save({
        id: `version-${nextVersion}`,
        version: nextVersion,
        label: "Learned Order API priority",
        changelog:
          "Promoted tool policy: query order_api first and avoid Slack before authoritative lookup.",
        policyIds: [...current.policyIds, promotedPolicy.id],
        defaultToolOrder: [...LEARNED_ORDER_INVESTIGATION_TOOLS],
        createdAt: new Date().toISOString(),
        parentVersion: current.id,
      });
      store.setCurrentVersion(version.id);
      store.benchmarks.save({
        ...result,
        promoted: true,
        candidateVersion: nextVersion,
      });
      recordLearningEvent(
        "promoted",
        `Promoted ${promotedPolicy.action} as ${nextVersion}`,
        { candidateId: candidate.id, policyId: promotedPolicy.id, version: nextVersion },
      );
      return version;
    },

    async reject(result) {
      const candidate = store.candidates.get(result.candidateId);
      if (!candidate) {
        throw new Error(`Unknown candidate: ${result.candidateId}`);
      }
      const rejected = store.candidates.save({ ...candidate, status: "rejected" });
      const policy = findPolicyForCandidate(candidate.id);
      if (policy) {
        store.policies.save({
          ...policy,
          status: "rejected",
          performanceBefore: result.oldScore,
          performanceAfter: result.newScore,
        });
      }
      store.benchmarks.save({ ...result, promoted: false });
      recordLearningEvent("rejected", `Rejected candidate ${candidate.id}`, {
        candidateId: candidate.id,
        policyId: policy?.id,
      });
      return rejected;
    },
  };
}

function findPolicyForCandidate(candidateId: string): Policy | null {
  const candidate = store.candidates.get(candidateId);
  if (!candidate) {
    return null;
  }
  return (
    store.policies
      .list()
      .filter((policy) => candidate.sourceTraceIds.every((id) => policy.createdFromRuns.includes(id)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
  );
}

function promoteRelatedMemories(sourceRuns: string[], impact: number): void {
  for (const memory of store.memories.list()) {
    if (memory.sourceRuns.some((id) => sourceRuns.includes(id))) {
      store.memories.save({
        ...memory,
        validationStatus: "promoted",
        performanceImpact: impact,
      });
    }
  }
}

function nextVersionLabel(current: string): string {
  const matched = current.match(/v(\d+)/i);
  const number = matched ? Number(matched[1]) + 1 : 1;
  return `v${number}`;
}
