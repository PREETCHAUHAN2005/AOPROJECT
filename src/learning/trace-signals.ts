import type { ExecutionTrace, ToolCall } from "@/models";

export function observationRecord(call: ToolCall): Record<string, unknown> | null {
  if (call.observation && typeof call.observation === "object") {
    return call.observation as Record<string, unknown>;
  }
  return null;
}

export function isAuthoritative(call: ToolCall): boolean {
  return observationRecord(call)?.authoritative === true;
}

export function isNonAuthoritative(call: ToolCall): boolean {
  return observationRecord(call)?.authoritative === false;
}

export function toolOrder(trace: ExecutionTrace): string[] {
  return trace.toolCalls.map((call) => call.tool);
}

export function toolIndex(trace: ExecutionTrace, name: string): number {
  return toolOrder(trace).indexOf(name);
}

export function usedSlackBeforeOrderApi(trace: ExecutionTrace): boolean {
  const slack = toolIndex(trace, "slack");
  const orderApi = toolIndex(trace, "order_api");
  return slack >= 0 && orderApi >= 0 && slack < orderApi;
}

export function countUnnecessaryTools(trace: ExecutionTrace): number {
  const hasAuthoritative = trace.toolCalls.some(isAuthoritative);
  if (!hasAuthoritative) {
    return 0;
  }
  return trace.toolCalls.filter((call) => {
    if (!isNonAuthoritative(call)) {
      return false;
    }
    return usedSlackBeforeOrderApi(trace) || toolIndex(trace, call.tool) < firstAuthoritativeIndex(trace);
  }).length;
}

export function firstAuthoritativeIndex(trace: ExecutionTrace): number {
  return trace.toolCalls.findIndex(isAuthoritative);
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function roundScore(value: number): number {
  return Number(clamp01(value).toFixed(2));
}
