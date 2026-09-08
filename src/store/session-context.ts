import { AsyncLocalStorage } from "node:async_hooks";

export const LOCAL_SESSION_ID = "local";

interface StoreContext {
  sessionId: string;
}

const storage = new AsyncLocalStorage<StoreContext>();

export function getSessionId(): string {
  return storage.getStore()?.sessionId ?? LOCAL_SESSION_ID;
}

export function runWithStore<T>(sessionId: string, fn: () => T): T {
  return storage.run({ sessionId }, fn);
}

export async function runWithStoreAsync<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
  return storage.run({ sessionId }, fn);
}
