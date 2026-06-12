# Jira MCP Server

A focused, **Jira-only** Model Context Protocol (MCP) server with bitbucket-mcp-grade developer ergonomics. Talks to the **Jira Cloud REST API v3** directly using an Atlassian email + API token — no OAuth dance, no admin gating, works today.

🎯 **43 tools** across **10 categories** (35 read + 8 opt-in write) · ✅ Read-only by default · 🏗️ Modern TS 6 + ESM · 📦 TOON / JSON / text output formats

> **Status**: 🚧 v1.0 in development — see [docs/plan.md](docs/plan.md) for the full roadmap and [competitors.md](competitors.md) for the research that informed it.

---

## Why?

The official [Atlassian MCP (Rovo)](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/setting-up-ides/) requires `twg:*` OAuth scopes that need tenant-admin approval — and the legacy SSE method is being deprecated on **June 30, 2026**. This server is a drop-in alternative: same MCP UX, none of the gating. Talk to Jira directly with email + API token.

---

## Requirements

- Node.js ≥ 20.0.0 (see `.nvmrc`)
- A Jira Cloud site (e.g. `https://your-domain.atlassian.net`)
- An API token — create one at <https://id.atlassian.com/manage-profile/security/api-tokens>:
  - For read-only installs, select **Jira → Read**.
  - For installs with `JIRA_ALLOW_WRITES=true`, select **Jira → Read & Write**.

---

## Installation

### Option 1 — npm global install (recommended)

```bash
npm install -g @tugudush/jira-mcp
```

Update:

```bash
npm update -g @tugudush/jira-mcp
```

### Option 2 — npx (no global install)

```bash
npx -y @tugudush/jira-mcp
```

### Option 3 — build from source

```bash
git clone https://github.com/tugudush/jira-mcp.git
cd jira-mcp
npm install
npm run build
node dist/index.js
```

---

## Configuration

### VS Code / GitHub Copilot — `.vscode/mcp.json`

After global install:

```jsonc
{
  "servers": {
    "jira-mcp": {
      "type": "stdio",
      "command": "jira-mcp",
      "env": {
        "JIRA_BASE_URL": "https://your-domain.atlassian.net",
        "JIRA_EMAIL": "your@email.com",
        "JIRA_API_TOKEN": "your-api-token",
      },
    },
  },
}
```

Or via npx (no global install):

```jsonc
{
  "mcpServers": {
    "jira-mcp": {
      "command": "npx",
      "args": ["-y", "@tugudush/jira-mcp"],
      "env": {
        "JIRA_BASE_URL": "https://your-domain.atlassian.net",
        "JIRA_EMAIL": "your@email.com",
        "JIRA_API_TOKEN": "your-api-token",
      },
    },
  },
}
```

> Tip: paste the actual values in the `env` block. If you don't want to commit secrets, keep `.vscode/mcp.json` in your global gitignore.

---

## Environment Variables

| Variable                  | Required | Default | Description                                                                     |
| ------------------------- | -------- | ------- | ------------------------------------------------------------------------------- |
| `JIRA_BASE_URL`           | Yes      | —       | Your Jira Cloud site URL (no trailing slash)                                    |
| `JIRA_EMAIL`              | Yes      | —       | Atlassian account email                                                         |
| `JIRA_API_TOKEN`          | Yes      | —       | API token from <https://id.atlassian.com/manage-profile/security/api-tokens>    |
| `JIRA_ALLOW_WRITES`       | No       | `false` | Set to `true` to enable the 8 write tools (create/update/assign/transition/...) |
| `JIRA_DEBUG`              | No       | `false` | Verbose stderr logging (URLs + status codes only — no bodies, no headers)       |
| `JIRA_DEFAULT_FORMAT`     | No       | `text`  | Default output format: `text` / `json` / `toon`                                 |
| `JIRA_REQUEST_TIMEOUT_MS` | No       | `30000` | Per-request timeout in milliseconds                                             |

No secrets are ever logged. `JIRA_DEBUG=true` only logs URLs and status codes.

---

## Features (planned for v1.0 — see [docs/plan.md](docs/plan.md) §6 for the full list)

- **Issue search** with JQL via the new `/search/jql` endpoint (POST)
- **Project** listing, components, versions, statuses
- **Agile** boards, sprints, backlog issues
- **Users** (current user, search, assignable)
- **Saved filters**, dashboards, workflows, issue links
- **Opt-in writes** behind `JIRA_ALLOW_WRITES=true`: create, update, assign, transition, comment, worklog
- **TOON** output format (30–60% token savings) with `text` / `json` fallback
- **JMESPath `filter` parameter** on every tool
- **Response truncation with raw file logging** when payloads exceed ~10k tokens (aashari pattern)
- **Project-level `AGENTS.md` defaults** so the model doesn't re-discover your project every session (atlassian/Rovo pattern)

---

## Development

See [docs/plan.md](docs/plan.md) for the full phased implementation plan.

```bash
git clone https://github.com/tugudush/jira-mcp.git
cd jira-mcp
npm install
npm run dev          # tsx watch src/index.ts
```

### Scripts

| Script                  | What it does                                             |
| ----------------------- | -------------------------------------------------------- |
| `npm run dev`           | Watch mode via `tsx`                                     |
| `npm run build`         | `prebuild` (`scripts/sync-version.ts`) → `tsc` → `dist/` |
| `npm run type-check`    | `tsc --noEmit`                                           |
| `npm run lint`          | ESLint (flat config + sonarjs), max-warnings 0           |
| `npm run format`        | Prettier write                                           |
| `npm test`              | Vitest (single run)                                      |
| `npm run test:watch`    | Vitest watch mode                                        |
| `npm run test:coverage` | Vitest with v8 coverage                                  |
| `npm run ltfb`          | lint → type-check → format → build                       |

---

## License

MIT — see [LICENSE](LICENSE).
