import { createEvolynRuntime } from "@/agent";
import {
  analyzeTrace,
  decideImprovement,
  generateImprovement,
  getLearningSnapshot,
  getRunInspection,
  listRunInspections,
  promoteImprovement,
  validateImprovement,
  type CycleResult,
} from "@/learning";
import type {
  AgentVersion,
  BenchmarkResult,
  LearningCandidate,
  LearningSnapshot,
  RunInspection,
  Task,
} from "@/models";
import { createId } from "@/lib/ids";
import { DEMO_TASK_ID, DEMO_TASK_PROMPT, ensureSeeded, resetToSeed, store } from "@/store";

export function listRecentTraces() {
  ensureSeeded();
  return listRunInspections().map((item) => item.trace);
}

export function listRecentInspections(): RunInspection[] {
  ensureSeeded();
  return listRunInspections();
}

export function getLearningState(): LearningSnapshot {
  ensureSeeded();
  return getLearningSnapshot();
}

export async function executeTask(taskId = DEMO_TASK_ID): Promise<RunInspection> {
  ensureSeeded();
  const task = store.tasks.get(taskId);
  if (!task) {
    throw new Error(`Unknown task: ${taskId}`);
  }
  const trace = await createEvolynRuntime().execute(task);
  return analyzeTrace(trace.id);
}

export async function executeTaskByPrompt(prompt?: string): Promise<RunInspection> {
  ensureSeeded();
  const text = prompt?.trim() || DEMO_TASK_PROMPT;
  if (text === DEMO_TASK_PROMPT) {
    return executeTask(DEMO_TASK_ID);
  }
  const task = store.tasks.save({
    id: createId("task"),
    prompt: text,
    domain: /order/i.test(text) ? "order_investigation" : "general",
    createdAt: new Date().toISOString(),
  });
  const trace = await createEvolynRuntime().execute(task);
  return analyzeTrace(trace.id);
}

export async function analyzeExistingTrace(traceId?: string): Promise<RunInspection> {
  ensureSeeded();
  const id = traceId ?? listRecentTraces()[0]?.id;
  if (!id) {
    throw new Error("No trace is available to analyze.");
  }
  const existing = getRunInspection(id);
  if (existing?.evaluation) {
    return existing;
  }
  return analyzeTrace(id);
}

export async function createImprovement(traceId?: string): Promise<LearningCandidate> {
  ensureSeeded();
  const id = traceId ?? listRecentTraces()[0]?.id;
  if (!id) {
    throw new Error("Run and analyze a task before generating an improvement.");
  }
  const inspection = getRunInspection(id);
  if (!inspection?.evaluation) {
    await analyzeTrace(id);
  }
  return generateImprovement(id);
}

export async function validateCandidate(candidateId?: string): Promise<BenchmarkResult> {
  ensureSeeded();
  const id = candidateId ?? getLearningSnapshot().candidate?.id;
  if (!id) {
    throw new Error("Generate an improvement before validating.");
  }
  return validateImprovement(id);
}

export async function promoteCandidate(candidateId?: string): Promise<AgentVersion> {
  ensureSeeded();
  const id = candidateId ?? getLearningSnapshot().candidate?.id;
  if (!id) {
    throw new Error("Validate an improvement before promoting.");
  }
  return promoteImprovement(id);
}

export function resetDemo() {
  return resetToSeed();
}

export async function runFullLearningCycle(taskId = DEMO_TASK_ID): Promise<CycleResult> {
  resetToSeed();
  const before = await executeTask(taskId);
  const candidate = await generateImprovement(before.trace.id);
  const { benchmark, version } = await decideImprovement(candidate.id);
  const after = await executeTask(taskId);
  return { before, candidate, benchmark, version, after };
}

export function getDemoTask(): Task {
  ensureSeeded();
  const task = store.tasks.get(DEMO_TASK_ID);
  if (!task) {
    throw new Error("Demo task is missing.");
  }
  return task;
}
