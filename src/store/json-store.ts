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
import { getSessionId, LOCAL_SESSION_ID } from "./session-context";

export const DATA_DIR = path.join(process.cwd(), "data");
export const DATA_FILE = path.join(DATA_DIR, "evolyn.json");

export type CollectionName = Exclude<keyof EvolynDatabase, "currentVersionId">;
export type PersistenceMode = "file" | "tmp" | "memory";

export interface PersistenceState {
  mode: PersistenceMode;
  label: string;
}

const memory = new Map<string, EvolynDatabase>();
const writeMode = new Map<string, PersistenceMode>();

function isVercel(): boolean {
  return Boolean(process.env.VERCEL);
}

function sessionKey(): string {
  return getSessionId() || LOCAL_SESSION_ID;
}

export function resolveDataFile(sessionId = sessionKey()): string {
  if (isVercel()) {
    return path.join("/tmp", `evolyn-${sessionId}.json`);
  }
  return DATA_FILE;
}

function persistenceLabel(mode: PersistenceMode): string {
  if (mode === "file") {
    return "Local file";
  }
  if (mode === "tmp") {
    return "Serverless session";
  }
  return "In-memory (ephemeral)";
}

export function getPersistenceState(): PersistenceState {
  const mode = writeMode.get(sessionKey()) ?? (isVercel() ? "memory" : "file");
  return { mode, label: persistenceLabel(mode) };
}

function normalize(parsed: EvolynDatabase): EvolynDatabase {
  return {
    ...EMPTY_DATABASE,
    ...parsed,
    learningEvents: parsed.learningEvents ?? [],
  };
}

function isNonWritable(error: unknown): boolean {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as NodeJS.ErrnoException).code)
      : "";
  return code === "EROFS" || code === "EACCES" || code === "EPERM";
}

function tryReadFile(file: string): EvolynDatabase | null {
  try {
    const raw = readFileSync(file, "utf8");
    return normalize(JSON.parse(raw) as EvolynDatabase);
  } catch {
    return null;
  }
}

function writeDatabase(db: EvolynDatabase): void {
  const key = sessionKey();
  memory.set(key, db);
  const file = resolveDataFile(key);
  const dir = path.dirname(file);
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, JSON.stringify(db, null, 2), "utf8");
    writeMode.set(key, isVercel() ? "tmp" : "file");
  } catch (error) {
    if (isNonWritable(error) || isVercel()) {
      writeMode.set(key, "memory");
      return;
    }
    throw error;
  }
}

function readDatabase(): EvolynDatabase {
  const key = sessionKey();
  const cached = memory.get(key);
  if (cached) {
    return cached;
  }

  const fromDisk = tryReadFile(resolveDataFile(key));
  if (fromDisk && fromDisk.currentVersionId && fromDisk.versions.length > 0) {
    memory.set(key, fromDisk);
    writeMode.set(key, isVercel() ? "tmp" : "file");
    return fromDisk;
  }

  const seeded = createSeedDatabase();
  memory.set(key, seeded);
  if (!writeMode.has(key)) {
    writeMode.set(key, isVercel() ? "memory" : "file");
  }
  return seeded;
}

export function hydrateDatabase(db: EvolynDatabase): EvolynDatabase {
  const normalized = normalize(db);
  if (!normalized.currentVersionId || normalized.versions.length === 0) {
    const seeded = createSeedDatabase();
    memory.set(sessionKey(), seeded);
    return seeded;
  }
  writeDatabase(normalized);
  return normalized;
}

export function loadDatabase(): EvolynDatabase {
  const db = readDatabase();
  if (!db.currentVersionId || db.versions.length === 0) {
    const seeded = createSeedDatabase();
    memory.set(sessionKey(), seeded);
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
  return loadDatabase();
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
