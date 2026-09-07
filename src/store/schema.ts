import type {
  AgentVersion,
  BenchmarkResult,
  Evaluation,
  ExecutionTrace,
  Failure,
  LearningCandidate,
  LearningEvent,
  Memory,
  Policy,
  Task,
} from "../models";

export interface EvolynDatabase {
  tasks: Task[];
  traces: ExecutionTrace[];
  evaluations: Evaluation[];
  failures: Failure[];
  memories: Memory[];
  policies: Policy[];
  candidates: LearningCandidate[];
  versions: AgentVersion[];
  benchmarks: BenchmarkResult[];
  learningEvents: LearningEvent[];
  currentVersionId: string;
}

export const EMPTY_DATABASE: EvolynDatabase = {
  tasks: [],
  traces: [],
  evaluations: [],
  failures: [],
  memories: [],
  policies: [],
  candidates: [],
  versions: [],
  benchmarks: [],
  learningEvents: [],
  currentVersionId: "",
};
