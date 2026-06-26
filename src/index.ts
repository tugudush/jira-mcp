#!/usr/bin/env node

/**
 * Jira MCP Server core entry point.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fileURLToPath } from "url";
import path from "path";

import { initializeConfig, loadConfig } from "./config.js";
import { handleGetCurrentUser } from "./handlers/user.js";
import { GetCurrentUserSchema } from "./schemas.js";
import { VERSION } from "./generated/version.js";
import { evaluateFilter } from "./filters/jmespath.js";
import { formatText } from "./formatters/text.js";
import { formatJson } from "./formatters/json.js";
import { formatToon } from "./formatters/toon.js";

function getOutputFormat(argFormat?: string): "text" | "json" | "toon" {
  if (argFormat === "text" || argFormat === "json" || argFormat === "toon") {
    return argFormat;
  }
  try {
    const config = loadConfig();
    return config.JIRA_DEFAULT_FORMAT;
  } catch {
    return "text";
  }
}

/**
 * Format structured data according to the format type.
 */
function formatResponseData(
  data: unknown,
  format: "text" | "json" | "toon",
  filter?: string,
): string {
  let processedData = data;
  if (filter) {
    processedData = evaluateFilter(processedData, filter);
  }

  switch (format) {
    case "json":
      return formatJson(processedData);
    case "toon":
      return formatToon(processedData);
    default:
      return formatText(processedData);
  }
}

/**
 * Formats data and constructs the finalized MCP tool content response.
 */
function processResponse(
  result: { text: string; data?: unknown },
  format: "text" | "json" | "toon",
  filter?: string,
): { content: Array<{ type: "text"; text: string }> } {
  const defaultText = result.text;

  if (format === "text" && !filter) {
    return {
      content: [{ type: "text", text: defaultText }],
    };
  }

  if (result.data !== undefined && result.data !== null) {
    const formattedText = formatResponseData(result.data, format, filter);
    return {
      content: [{ type: "text", text: formattedText }],
    };
  }

  if (filter || format !== "text") {
    const warning =
      `[Note: output_format="${format}" or filter requested, ` +
      `but no structured data is available for this tool response. ` +
      `Returning default text output.]\n\n`;
    return {
      content: [{ type: "text", text: warning + defaultText }],
    };
  }

  return {
    content: [{ type: "text", text: defaultText }],
  };
}

/**
 * Helper wrapper for all tool handlers.
 * Standardizes output format (text / JSON / TOON) and evaluates JMESPath filter expression.
 */
export function executeHandler<TArgs extends Record<string, unknown>>(
  handler: (args: TArgs) => Promise<{ text: string; data?: unknown }>,
) {
  return async (args: unknown) => {
    try {
      const argsObj = (args || {}) as Record<string, unknown>;
      const { output_format: argFormat, filter, ...cleanArgs } = argsObj;
      const format = getOutputFormat(
        typeof argFormat === "string" ? argFormat : undefined,
      );

      const result = await handler(cleanArgs as TArgs);
      return processResponse(
        result,
        format,
        typeof filter === "string" ? filter : undefined,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${message}`,
          },
        ],
        isError: true,
      };
    }
  };
}

async function runServer() {
  // Validate env vars on startup
  initializeConfig();

  const server = new McpServer(
    { name: "jira-mcp", version: VERSION },
    { capabilities: { logging: {} } },
  );

  // Register Smoke / Verification Tool
  server.registerTool(
    "jira_get_current_user",
    {
      title: "Get current user profile (myself)",
      description:
        "Get detailed information about the currently authenticated Jira user. Use GET `/rest/api/3/myself`",
      inputSchema: GetCurrentUserSchema,
    },
    executeHandler(handleGetCurrentUser),
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[jira-mcp] Server successfully connected via stdio`);
}

// Start server if run directly (not loaded as module)
const currentFilePath = fileURLToPath(import.meta.url);
const isMain =
  process.argv[1] &&
  (path.resolve(currentFilePath) === path.resolve(process.argv[1]) ||
    process.argv[1].endsWith("dist/index.js") ||
    process.argv[1].endsWith("src/index.ts"));

if (isMain) {
  runServer().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
  });
}

export { runServer };
export { executeHandler as wrapHandler };
