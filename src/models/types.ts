export type FailureClass =
  | "task_understanding"
  | "tool_selection"
  | "tool_ordering"
  | "unnecessary_tool"
  | "invalid_tool_call"
  | "missing_context"
  | "reasoning"
  | "unsupported_claim"
  | "policy_violation"
  | "efficiency";

export type PolicyStatus = "pending" | "validated" | "promoted" | "rejected";
export type CandidateStatus = "proposed" | "validating" | "promoted" | "rejected";
export type MemoryKind = "episodic" | "procedural" | "tool";
export type ValidationStatus = "unvalidated" | "validated" | "promoted" | "rejected";
export type CandidateType = "tool_policy" | "procedural" | "tool_memory";

export interface Task {
  id: string;
  prompt: string;
  domain: string;
  createdAt: string;
}

export interface ToolCall {
  id: string;
  tool: string;
  input: Record<string, unknown>;
  observation: unknown;
  startedAt: string;
  endedAt: string;
  latencyMs: number;
  success: boolean;
  estimatedCost: number;
}

export interface ExecutionTrace {
  id: string;
  taskId: string;
  task: string;
  agentVersion: string;
  timestamp: string;
  toolCalls: ToolCall[];
  observations: unknown[];
  finalResult: string;
  success: boolean;
  qualityScore: number;
  toolCallCount: number;
  latencyMs: number;
  estimatedCost: number;
  failureClassification: FailureClass[];
}

export interface Evaluation {
  id: string;
  traceId: string;
  correctness: number;
  evidenceQuality: number;
  efficiency: number;
  policyCompliance: number;
  overall: number;
  toolCallCount: number;
  unnecessaryToolCalls: number;
  latencyMs: number;
  estimatedCost: number;
  createdAt: string;
}

export interface Failure {
  id: string;
  traceId: string;
  classification: FailureClass;
  description: string;
  evidence: string;
  createdAt: string;
}

export interface Memory {
  id: string;
  kind: MemoryKind;
  title: string;
  content: string;
  rule?: string;
  confidence: number;
  evidenceCount: number;
  sourceRuns: string[];
  validationStatus: ValidationStatus;
  performanceImpact: number;
  toolName?: string;
  createdAt: string;
}

export interface Policy {
  id: string;
  condition: string;
  action: string;
  confidence: number;
  evidenceCount: number;
  status: PolicyStatus;
  createdFromRuns: string[];
  performanceBefore: number | null;
  performanceAfter: number | null;
  createdAt: string;
}

export interface LearningCandidate {
  id: string;
  type: CandidateType;
  condition: string;
  recommendation: string;
  avoid?: string;
  reason: string;
  confidence: number;
  status: CandidateStatus;
  sourceTraceIds: string[];
  createdAt: string;
}

export type LearningEventType = "candidate_created" | "validated" | "promoted" | "rejected";

export interface LearningEvent {
  id: string;
  type: LearningEventType;
  summary: string;
  candidateId?: string;
  policyId?: string;
  version?: string;
  createdAt: string;
}

export interface AgentVersion {
  id: string;
  version: string;
  label: string;
  changelog: string;
  policyIds: string[];
  defaultToolOrder: string[];
  createdAt: string;
  parentVersion: string | null;
}

export interface RunInspection {
  trace: ExecutionTrace;
  evaluation: Evaluation | null;
  failures: Failure[];
}

export interface LearningSnapshot {
  currentVersion: AgentVersion;
  versions: AgentVersion[];
  candidate: LearningCandidate | null;
  policies: Policy[];
  memories: Memory[];
  benchmark: BenchmarkResult | null;
  events: LearningEvent[];
}

export interface BenchmarkResult {
  id: string;
  candidateId: string;
  baselineVersion: string;
  candidateVersion: string;
  oldScore: number;
  newScore: number;
  improvement: number;
  promoted: boolean;
  threshold: number;
  createdAt: string;
}
