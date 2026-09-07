import type { FailureClass, RunInspection } from "@/models";
import { store } from "@/store";
import { createEvaluator } from "./evaluator";
import { createFailureAnalyzer } from "./failure-analyzer";

export async function analyzeTrace(traceId: string): Promise<RunInspection> {
  const existing = getRunInspection(traceId);
  if (existing?.evaluation) {
    return existing;
  }

  const trace = store.traces.get(traceId);
  if (!trace) {
    throw new Error(`Unknown trace: ${traceId}`);
  }

  const evaluation = await createEvaluator().evaluate(trace);
  const failures = await createFailureAnalyzer().analyze(trace, evaluation);

  store.evaluations.save(evaluation);
  for (const failure of failures) {
    store.failures.save(failure);
  }

  const failureClassification = uniqueClasses(failures);
  const updated = store.traces.save({
    ...trace,
    qualityScore: evaluation.overall,
    failureClassification,
  });

  return { trace: updated, evaluation, failures };
}

export function getRunInspection(traceId: string): RunInspection | null {
  const trace = store.traces.get(traceId);
  if (!trace) {
    return null;
  }
  return {
    trace,
    evaluation: store.evaluations.list().find((item) => item.traceId === trace.id) ?? null,
    failures: store.failures.list().filter((item) => item.traceId === trace.id),
  };
}

export function listRunInspections(): RunInspection[] {
  return [...store.traces.list()]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .map((trace) => getRunInspection(trace.id))
    .filter((item): item is RunInspection => item !== null);
}

function uniqueClasses(failures: { classification: FailureClass }[]): FailureClass[] {
  return [...new Set(failures.map((failure) => failure.classification))];
}
