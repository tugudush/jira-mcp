/**
 * Default human-readable text formatter.
 */
export function formatText(data: unknown): string {
  if (data === null || data === undefined) return ''
  if (typeof data === 'string') return data
  return JSON.stringify(data, null, 2)
}
