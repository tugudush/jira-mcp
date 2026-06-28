// Tiny helper: reads .vscode/mcp.json and writes a shell-exportable env file
// Usage: node scripts/dump-mcp-env.cjs > .mcp-env.sh
const fs = require('fs')
const path = require('path')
const cfg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '.vscode', 'mcp.json'), 'utf8')
)
const server = cfg.servers['jira-mcp-dist']
if (!server || !server.env) {
  console.error('no jira-mcp-dist server or env in .vscode/mcp.json')
  process.exit(1)
}
for (const [k, v] of Object.entries(server.env)) {
  // single-quote value, escape any embedded single quotes
  const safe = String(v).replace(/'/g, "'\\''")
  process.stdout.write(`export ${k}='${safe}'\n`)
}
