import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
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
import { EMPTY_DATABASE, type EvolynDatabase } from "./schema";
import { createSeedDatabase, V0_VERSION_ID } from "./seed";

export const DATA_DIR = path.join(process.cwd(), "data");
export const DATA_FILE = path.join(DATA_DIR, "evolyn.json");

export type CollectionName = Exclude<keyof EvolynDatabase, "currentVersionId">;

function readDatabase(): EvolynDatabase {
  try {
    const raw = readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as EvolynDatabase;
    return {
      ...EMPTY_DATABASE,
      ...parsed,
      learningEvents: parsed.learningEvents ?? [],
    };
  } catch {
    const seeded = createSeedDatabase();
    writeDatabase(seeded);
    return seeded;
  }
}

function writeDatabase(db: EvolynDatabase): void {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
}

export function loadDatabase(): EvolynDatabase {
  const db = readDatabase();
  if (!db.currentVersionId || db.versions.length === 0) {
    const seeded = createSeedDatabase();
    writeDatabase(seeded);
    return seeded;
  }
  return db;
}

export function saveDatabase(db: EvolynDatabase): EvolynDatabase {
  writeDatabase(db);
  return db;
}

export function resetToSeed(): EvolynDatabase {
  const seeded = createSeedDatabase();
  writeDatabase(seeded);
  return seeded;
}

export function ensureSeeded(): EvolynDatabase {
  try {
    readFileSync(DATA_FILE, "utf8");
    return loadDatabase();
  } catch {
    return resetToSeed();
  }
}

function listCollection<K extends CollectionName>(name: K): EvolynDatabase[K] {
  return loadDatabase()[name];
}

function upsert<T extends { id: string }>(name: CollectionName, record: T): T {
  const db = loadDatabase();
  const collection = db[name] as unknown as T[];
  const index = collection.findIndex((item) => item.id === record.id);
  if (index >= 0) {
    collection[index] = record;
  } else {
    collection.push(record);
  }
  saveDatabase(db);
  return record;
}

function getById<T extends { id: string }>(name: CollectionName, id: string): T | null {
  const collection = listCollection(name) as unknown as T[];
  return collection.find((item) => item.id === id) ?? null;
}

export const store = {
  tasks: {
    list: () => listCollection("tasks") as Task[],
    get: (id: string) => getById<Task>("tasks", id),
    save: (task: Task) => upsert("tasks", task),
  },
  traces: {
    list: () => listCollection("traces") as ExecutionTrace[],
    get: (id: string) => getById<ExecutionTrace>("traces", id),
    save: (trace: ExecutionTrace) => upsert("traces", trace),
  },
  evaluations: {
    list: () => listCollection("evaluations") as Evaluation[],
    get: (id: string) => getById<Evaluation>("evaluations", id),
    save: (evaluation: Evaluation) => upsert("evaluations", evaluation),
  },
  failures: {
    list: () => listCollection("failures") as Failure[],
    get: (id: string) => getById<Failure>("failures", id),
    save: (failure: Failure) => upsert("failures", failure),
  },
  memories: {
    list: () => listCollection("memories") as Memory[],
    get: (id: string) => getById<Memory>("memories", id),
    save: (memory: Memory) => upsert("memories", memory),
  },
  policies: {
    list: () => listCollection("policies") as Policy[],
    get: (id: string) => getById<Policy>("policies", id),
    save: (policy: Policy) => upsert("policies", policy),
  },
  candidates: {
    list: () => listCollection("candidates") as LearningCandidate[],
    get: (id: string) => getById<LearningCandidate>("candidates", id),
    save: (candidate: LearningCandidate) => upsert("candidates", candidate),
  },
  versions: {
    list: () => listCollection("versions") as AgentVersion[],
    get: (id: string) => getById<AgentVersion>("versions", id),
    save: (version: AgentVersion) => upsert("versions", version),
  },
  benchmarks: {
    list: () => listCollection("benchmarks") as BenchmarkResult[],
    get: (id: string) => getById<BenchmarkResult>("benchmarks", id),
    save: (result: BenchmarkResult) => upsert("benchmarks", result),
  },
  learningEvents: {
    list: () => listCollection("learningEvents") as LearningEvent[],
    get: (id: string) => getById<LearningEvent>("learningEvents", id),
    save: (event: LearningEvent) => upsert("learningEvents", event),
  },
  getCurrentVersion(): AgentVersion {
    const db = loadDatabase();
    const version =
      db.versions.find((item) => item.id === db.currentVersionId) ??
      db.versions.find((item) => item.id === V0_VERSION_ID) ??
      db.versions[0];
    if (!version) {
      throw new Error("No agent version is stored.");
    }
    return version;
  },
  setCurrentVersion(versionId: string): AgentVersion {
    const db = loadDatabase();
    const version = db.versions.find((item) => item.id === versionId);
    if (!version) {
      throw new Error(`Unknown agent version: ${versionId}`);
    }
    db.currentVersionId = versionId;
    saveDatabase(db);
    return version;
  },
};

export type EvolynStore = typeof store;
