import { encode } from "@toon-format/toon";

/**
 * Token-Oriented Object Notation (TOON) formatter.
 * Generates an extremely compact tabular format that reduces LLM token consumption by 30-60%.
 */
export function formatToon(data: unknown): string {
  if (data === null || data === undefined) return "";
  try {
    return encode(data);
  } catch {
    try {
      // Fallback to JSON if TOON encoding fails (e.g., Map, Set, circular relationships)
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }
}
