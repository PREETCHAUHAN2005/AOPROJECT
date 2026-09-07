import type {
  AgentVersion,
  BenchmarkResult,
  LearningCandidate,
  LearningSnapshot,
  RunInspection,
} from "@/models";
import { store } from "@/store";
import { getRunInspection } from "./analyze";
import { recordLearningEvent } from "./ledger";
import { createMemoryManager } from "./memory-manager";
import { createReflectionEngine } from "./reflection-engine";
import { createValidationEngine } from "./validation-engine";

export interface CycleResult {
  before: RunInspection;
  candidate: LearningCandidate;
  benchmark: BenchmarkResult;
  version: AgentVersion;
  after: RunInspection;
}

export function getLearningSnapshot(): LearningSnapshot {
  const candidates = store.candidates
    .list()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const benchmarks = store.benchmarks
    .list()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    currentVersion: store.getCurrentVersion(),
    versions: [...store.versions.list()].sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true })),
    candidate: candidates[0] ?? null,
    policies: store.policies.list(),
    memories: store.memories.list(),
    benchmark: benchmarks[0] ?? null,
    events: store.learningEvents
      .list()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

export async function generateImprovement(traceId: string): Promise<LearningCandidate> {
  const inspection = getRunInspection(traceId);
  if (!inspection?.evaluation) {
    throw new Error("Analyze the run before generating an improvement.");
  }

  const existing = store.candidates
    .list()
    .find((candidate) => candidate.sourceTraceIds.includes(traceId) && candidate.status !== "rejected");
  if (existing) {
    return existing;
  }

  const candidate = await createReflectionEngine().reflect(
    inspection.trace,
    inspection.evaluation,
    inspection.failures,
  );

  if (candidate.confidence < 0.5) {
    const reusable = store.candidates
      .list()
      .find((item) => /order_api first/i.test(item.recommendation) && item.status !== "rejected");
    if (reusable) {
      return reusable;
    }
    throw new Error(
      "This run has no Slack-before-Order-API inefficiency. Reset the demo and run the v0 task first.",
    );
  }

  store.candidates.save(candidate);
  await createMemoryManager().extract(candidate);
  recordLearningEvent("candidate_created", `${candidate.recommendation} (${candidate.condition})`, {
    candidateId: candidate.id,
  });
  return candidate;
}

export async function validateImprovement(candidateId: string): Promise<BenchmarkResult> {
  const candidate = store.candidates.get(candidateId);
  if (!candidate) {
    throw new Error(`Unknown candidate: ${candidateId}`);
  }
  const existing = latestBenchmark(candidateId);
  if (existing) {
    return existing;
  }
  return createValidationEngine().validate(candidate);
}

export async function promoteImprovement(candidateId: string): Promise<AgentVersion> {
  const candidate = store.candidates.get(candidateId);
  if (candidate?.status === "promoted") {
    return store.getCurrentVersion();
  }
  const result = latestBenchmark(candidateId);
  if (!result) {
    throw new Error("Validate the candidate before promoting it.");
  }
  const engine = createValidationEngine();
  if (result.improvement >= result.threshold) {
    return engine.promote(result);
  }
  await engine.reject(result);
  throw new Error("Candidate was rejected because it did not improve the benchmark.");
}

export async function decideImprovement(candidateId: string): Promise<{
  benchmark: BenchmarkResult;
  version: AgentVersion;
}> {
  const candidate = store.candidates.get(candidateId);
  if (candidate?.status === "promoted") {
    return {
      benchmark: latestBenchmark(candidateId) ?? {
        id: "already-promoted",
        candidateId,
        baselineVersion: "v0",
        candidateVersion: store.getCurrentVersion().version,
        oldScore: 0,
        newScore: 0,
        improvement: 0,
        promoted: true,
        threshold: 0,
        createdAt: new Date().toISOString(),
      },
      version: store.getCurrentVersion(),
    };
  }
  const existing = latestBenchmark(candidateId);
  const benchmark = existing ?? (await validateImprovement(candidateId));
  const engine = createValidationEngine();
  if (benchmark.improvement >= benchmark.threshold) {
    return { benchmark, version: await engine.promote(benchmark) };
  }
  await engine.reject(benchmark);
  return { benchmark, version: store.getCurrentVersion() };
}

function latestBenchmark(candidateId: string): BenchmarkResult | null {
  return (
    store.benchmarks
      .list()
      .filter((item) => item.candidateId === candidateId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
  );
}
