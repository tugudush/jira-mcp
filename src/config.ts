/**
 * Configuration management with validation and type safety
 */

import { z } from "zod";

// Configuration schema with validation
const ConfigSchema = z.object({
  // Authentication
  JIRA_BASE_URL: z
    .string()
    .url()
    .transform((val) => {
      // Strip trailing slash if present
      return val.endsWith("/") ? val.slice(0, -1) : val;
    }),
  JIRA_EMAIL: z.string().email(),
  JIRA_API_TOKEN: z.string().min(1),

  // Operational Settings
  JIRA_ALLOW_WRITES: z
    .string()
    .default("false")
    .transform((val) => val === "true"),
  JIRA_DEBUG: z
    .string()
    .default("false")
    .transform((val) => val === "true"),
  JIRA_DEFAULT_FORMAT: z.enum(["text", "json", "toon"]).default("text"),
  JIRA_REQUEST_TIMEOUT_MS: z.string().default("30000").transform(Number),
});

export type Config = z.infer<typeof ConfigSchema>;

let cachedConfig: Config | null = null;

/**
 * Load and validate configuration from process.env
 */
export function loadConfig(): Config {
  if (cachedConfig) return cachedConfig;

  try {
    cachedConfig = ConfigSchema.parse(process.env);
    return cachedConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues || [];
      const missingFields = issues
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join("\n");

      throw new Error(`Configuration validation failed:\n${missingFields}`, {
        cause: error,
      });
    }
    throw error;
  }
}

/**
 * Initialize and validate configuration, logging status to stderr
 */
export function initializeConfig(): Config {
  const config = loadConfig();

  // Log configuration status on stderr (never stdout)
  console.error(
    `[jira-mcp] Mode: ${config.JIRA_ALLOW_WRITES ? "READ-WRITE (opt-in)" : "READ-ONLY (default)"}`,
  );
  console.error(`[jira-mcp] Base URL: ${config.JIRA_BASE_URL}`);
  console.error(`[jira-mcp] Auth Email: ${config.JIRA_EMAIL}`);
  if (config.JIRA_DEBUG) {
    console.error("[jira-mcp] Debug mode enabled");
  }

  return config;
}

/**
 * Reset cached config (primarily used for testing)
 */
export function resetConfig(): void {
  cachedConfig = null;
}
