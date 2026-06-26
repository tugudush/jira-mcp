/**
 * Pretty-printed JSON formatter.
 */
export function formatJson(data: unknown): string {
  if (data === undefined) return "";
  return JSON.stringify(data, null, 2);
}
