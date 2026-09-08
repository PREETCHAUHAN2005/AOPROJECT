import type { AgentVersion, LearningSnapshot, Policy, RunInspection } from "@/models";
import type { PersistenceMode } from "@/store";

export type DemoStepId =
  | "run"
  | "analyze"
  | "learn"
  | "validate"
  | "promote"
  | "rerun"
  | "done";

export interface DemoNextStep {
  id: DemoStepId;
  title: string;
  reason: string;
}

export interface PersistenceInfo {
  mode: PersistenceMode;
  label: string;
}

export interface ComparisonMetrics {
  score: number;
  toolCalls: number;
  latencyMs: number;
  cost: number;
  runs: number;
}

export interface PromotionBanner {
  title: string;
  policyText: string;
}

export interface DashboardStatus {
  version: AgentVersion;
  learningStatus: string;
  tasksExecuted: number;
  policiesLearned: number;
}

export interface StoredMetrics {
  taskSuccessRate: number;
  averageQuality: number;
  averageToolCalls: number;
  averageLatencyMs: number;
  estimatedCost: number;
  averageUnnecessaryToolCalls: number;
  learningCandidates: number;
  promotedPolicies: number;
  rejectedPolicies: number;
  failureRecurrence: Record<string, number>;
}

export interface DashboardView {
  product: "Evolyn";
  tagline: string;
  defaultTask: string;
  status: DashboardStatus;
  latest: RunInspection | null;
  inspections: RunInspection[];
  learning: LearningSnapshot;
  promotedPolicies: Policy[];
  promotionBanner: PromotionBanner | null;
  before: ComparisonMetrics | null;
  after: ComparisonMetrics | null;
  metrics: StoredMetrics;
  nextStep: DemoNextStep;
  persistence: PersistenceInfo;
}
