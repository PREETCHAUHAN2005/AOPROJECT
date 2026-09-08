export const MAX_PROMPT_LENGTH = 4000;

export function parseOptionalId(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 120) {
    return undefined;
  }
  if (!/^[\w.-]+$/.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

export function parsePrompt(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.length > MAX_PROMPT_LENGTH) {
    throw new Error(`Prompt must be ${MAX_PROMPT_LENGTH} characters or fewer.`);
  }
  return trimmed;
}
