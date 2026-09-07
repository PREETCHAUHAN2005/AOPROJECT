export function extractOrderId(text: string): string | null {
  const match = text.match(/#(\d+)/) ?? text.match(/\border\s+(\d+)/i);
  return match?.[1] ?? null;
}
