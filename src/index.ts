#!/usr/bin/env node
/**
 * jira-mcp — Phase 0 stub.
 *
 * Phase 1 will replace this with the real `McpServer` bootstrap, env config,
 * and tool registration. This stub exists so the build pipeline and dev loop
 * are testable from day one of Phase 0.
 */

import { VERSION } from "./generated/version.js";

function main(): void {
  console.log(`[jira-mcp] boot — version ${VERSION}`);
  console.log("[jira-mcp] Phase 0 stub. Real server lands in Phase 1.");
  console.log(
    "[jira-mcp] Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN to use.",
  );
  console.log(
    "[jira-mcp] Run `npm run dev` to watch this file, or `npm run build && npm start` to run from dist/.",
  );
}

main();
