# Jira MCP Server

A focused, **Jira-only** Model Context Protocol (MCP) server with bitbucket-mcp-grade developer ergonomics. Talks to the **Jira Cloud REST API v3** directly using an Atlassian email + API token — no OAuth dance, no admin gating, works today.

🎯 **36 tools** (35 read + 1 scoped issue text update) · ✅ Read-only by default · 🏗️ Modern TS 6 + ESM · 📦 TOON / JSON / text output formats

[![npm version](https://img.shields.io/npm/v/@tugudush/jira-mcp.svg)](https://www.npmjs.com/package/@tugudush/jira-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node ≥ 20](https://img.shields.io/badge/node-%E2%89%A520-brightgreen)](.nvmrc)

> **Status:** ✅ **v1.0.0 released** — see [CHANGELOG.md](CHANGELOG.md) and [docs/plan.md](docs/plan.md) for the full roadmap and [competitors.md](competitors.md) for the research that informed it.

---

## Why?

The official [Atlassian MCP (Rovo)](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/setting-up-ides/) requires `twg:*` OAuth scopes that need tenant-admin approval — and the legacy SSE method is being deprecated on **June 30, 2026**. This server is a drop-in alternative: same MCP UX, none of the gating. Talk to Jira directly with email + API token.

---

## Requirements

- Node.js ≥ 20.0.0 (see `.nvmrc`)
- A Jira Cloud site (e.g. `https://your-domain.atlassian.net`)
- An API token is required. Create a classic (unscoped) API token at <https://id.atlassian.com/manage-profile/security/api-tokens>:
  - **Important:** Click **"Create API token"** (do NOT use "Create API token with scopes", as scoped tokens can fail to authorize various Jira platform endpoints correctly).
  - Make sure your Atlassian account has active read permissions for the target Jira project. The optional issue text update also requires Jira edit permission, and this server still refuses the update unless the authenticated account is the issue reporter or assignee.

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

| Variable                   | Required | Default | Description                                                                                                   |
| -------------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| `JIRA_BASE_URL`            | Yes      | —       | Your Jira Cloud site URL (no trailing slash)                                                                  |
| `JIRA_EMAIL`               | Yes      | —       | Atlassian account email                                                                                       |
| `JIRA_API_TOKEN`           | Yes      | —       | API token from <https://id.atlassian.com/manage-profile/security/api-tokens>                                  |
| `JIRA_ALLOW_ISSUE_UPDATES` | No       | `false` | Set to `true` to enable only `jira_update_issue_text`; updates still require reporter/assignee identity match |
| `JIRA_DEBUG`               | No       | `false` | Verbose stderr logging (URLs + status codes only — no bodies, no headers)                                     |
| `JIRA_DEFAULT_FORMAT`      | No       | `text`  | Default output format: `text` / `json` / `toon`                                                               |
| `JIRA_REQUEST_TIMEOUT_MS`  | No       | `30000` | Per-request timeout in milliseconds                                                                           |

No secrets are ever logged. `JIRA_DEBUG=true` only logs URLs and status codes.

---

## Usage Examples

Once `jira-mcp` is wired into your MCP client (Copilot, Cursor, Claude Desktop,
etc.), the model can call any of the 36 tools. A few typical invocations:

### Search issues by JQL

```text
Tool: jira_search_issues
Args:
  jql:          "project = ENG AND status != Done ORDER BY updated DESC"
  maxResults:   10
  output_format: toon
```

> Use the new `/rest/api/3/search/jql` endpoint (POST). The older
> `/rest/api/3/search` is deprecated and not exposed by this server.

### Fetch one issue

```text
Tool: jira_get_issue
Args:
  issueIdOrKey:  "ENG-1234"
  fields:        ["summary", "status", "assignee", "reporter", "priority", "updated"]
  output_format: text
```

### List agile boards and their sprints

```text
Tool: jira_list_boards
Args:
  projectKeyOrId: "ENG"
  output_format:  text
```

```text
Tool: jira_get_board_sprints
Args:
  boardId: 42
  state:   "active"
```

### Filter a response with JMESPath

Every tool accepts a `filter` parameter (JMESPath expression) to project the
response down to just the fields you need. Example:

```text
Tool: jira_search_issues
Args:
  jql:          "project = ENG ORDER BY updated DESC"
  maxResults:   20
  filter:       "issues[].{key: key, summary: fields.summary, status: fields.status.name}"
  output_format: json
```

See [jmespath.org](https://jmespath.org/) for the full expression syntax.

---

## Enabling Writes — `jira_update_issue_text`

> **Opt-in. Off by default.** The 35 read tools are always available. This
> single scoped write tool requires **two** safeguards:
>
> 1. `JIRA_ALLOW_ISSUE_UPDATES=true` in the MCP `env` block, **and**
> 2. The authenticated Atlassian account is the **reporter** or **assignee**
>    of the target issue.

### What it can change

Only an issue's **title** (`summary`) and/or plain-text **description**. It
**cannot** change status, assignee, priority, labels, comments, worklogs,
sprints, links, or any other field. The handler converts your plain text
description to Atlassian Document Format (ADF) and PUTs to
`/rest/api/3/issue/{key}`.

### Step 1 — set the env var

In `.vscode/mcp.json` (or the equivalent in your MCP client):

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
        "JIRA_ALLOW_ISSUE_UPDATES": "true",
      },
    },
  },
}
```

### Step 2 — confirm the identity match

Open the target Jira issue and check the **Reporter** and **Assignee** fields.
The email in `JIRA_EMAIL` must match one of them. The server reads
`/rest/api/3/myself` first and compares the account IDs.

### Step 3 — call the tool

```text
Tool: jira_update_issue_text
Args:
  issueIdOrKey:  "ENG-1234"
  title:         "Refactor onboarding wizard to async stepper"
  description:   "Step 1: profile, Step 2: workspace, Step 3: invite teammates."
  output_format: text
```

### What you see when it works

```text
Updated ENG-1234 successfully.
```

### What you see when it doesn't

| Condition                                      | Tool response                                                                                              |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `JIRA_ALLOW_ISSUE_UPDATES` not set / `"false"` | `IssueUpdateDisabledError: Issue text updates are disabled. To enable, set JIRA_ALLOW_ISSUE_UPDATES=true.` |
| Account is neither reporter nor assignee       | `IssueUpdatePermissionError: Only the issue reporter or assignee may update the title/description.`        |
| Both `title` and `description` are omitted     | Zod validation: `Either title or description must be provided.`                                            |
| Jira returns 401 / 403                         | `AuthenticationError` or `ForbiddenError` — check token + email                                            |
| Jira returns 429                               | `RateLimitError` — server retries with exponential backoff                                                 |

### Caveats

- **Token scope.** Use a classic (unscoped) API token. Scoped tokens created via
  "Create API token with scopes" can fail to authorize various Jira endpoints
  correctly — including the issue update endpoint.
- **Plain text only.** The `description` argument is plain text. Multi-line
  strings are accepted; markdown is not converted. If you need rich formatting,
  file an issue and we'll add an `adf_json` argument in v1.1.
- **No idempotency token.** A second call with the same args immediately after
  the first will succeed again and bump the `updated` timestamp. Jira Cloud
  does not support `If-Match` on this endpoint.

---

## Output Formats & Filtering

Every tool accepts two optional parameters:

| Parameter       | Values                   | Effect                                                                                                                   |
| --------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `output_format` | `text` / `json` / `toon` | Default `text` (human-readable markdown); `json` is pretty-printed; `toon` saves 30–60% of tokens for lists of > 5 items |
| `filter`        | JMESPath expression      | Projects the response down to just the fields you need                                                                   |

Set `JIRA_DEFAULT_FORMAT=toon` in `env` to make TOON the default for every
tool. The model can still override per-call with `output_format=...`.

---

## Project-level `AGENTS.md` defaults

Want the model to **stop rediscovering your project key on every session**? Drop
[`docs/AGENTS.md.example`](docs/AGENTS.md.example) into your repo's `AGENTS.md`
and edit the `YOURPROJ` placeholder. See
[docs/agents-guide.md](docs/agents-guide.md) for the full how-to. Pattern lifted
from the official [atlassian/atlassian-mcp-server](https://github.com/atlassian/atlassian-mcp-server) (UX4).

---

## Features

- **Issue search** with JQL via the new `/search/jql` endpoint (POST)
- **Issue detail** — transitions, changelog, comments, worklogs, watchers, links
- **Project** listing, components, versions, statuses
- **Agile** boards, sprints, backlog issues
- **Users** (current user, search, assignable)
- **Saved filters**, dashboards, workflows, fields + issue types
- **Opt-in scoped issue text update** behind `JIRA_ALLOW_ISSUE_UPDATES=true`:
  update only issue title (`summary`) and description, only as reporter or assignee
- **TOON** output format (30–60% token savings) with `text` / `json` fallback
- **JMESPath `filter` parameter** on every tool
- **Response truncation with raw file logging** when payloads exceed ~10k tokens
  (aashari pattern)
- **Project-level `AGENTS.md` defaults** so the model doesn't re-discover your
  project every session (atlassian/Rovo pattern)
- **Per-tool `description` strings teach usage** — embed deprecation notes,
  parameter hints, and gotchas inline (aashari pattern)
- **Retry with exponential backoff** on transient errors (`429` / `5xx` /
  network cuts)
- **Configurable per-request timeout** via `JIRA_REQUEST_TIMEOUT_MS`
  (default 30 s)

---

## Development

See [docs/plan.md](docs/plan.md) for the full phased implementation plan and
[CHANGELOG.md](CHANGELOG.md) for the release history.

```bash
git clone https://github.com/tugudush/jira-mcp.git
cd jira-mcp
npm install
npm run dev          # tsx watch src/index.ts
```

For workspace-level testing inside VS Code/GitHub Copilot, a local configuration is available at `.vscode/mcp.json` (gitignored). You can configure your credentials there to load either:

- `jira-mcp-dev` — Runs directly from TS source via `tsx` (convenient for active development).
- `jira-mcp-dist` — Runs the compiled production code from the `dist/` directory.

You can export the `jira-mcp-dist` server's `env` block to your shell with:

```bash
node scripts/dump-mcp-env.cjs > .mcp-env.sh && source .mcp-env.sh
```

### Scripts

| Script                  | What it does                                              |
| ----------------------- | --------------------------------------------------------- |
| `npm run dev`           | Watch mode via `tsx`                                      |
| `npm run build`         | `prebuild` (`scripts/sync-version.ts`) → `tsc` → `dist/`  |
| `npm run type-check`    | `tsc --noEmit`                                            |
| `npm run lint`          | ESLint (flat config + sonarjs), max-warnings 0            |
| `npm run format`        | Prettier write                                            |
| `npm run format:check`  | Prettier check (no modifications, exits non-zero on diff) |
| `npm test`              | Vitest (single run, 96+ tests)                            |
| `npm run test:watch`    | Vitest watch mode                                         |
| `npm run test:coverage` | Vitest with v8 coverage                                   |
| `npm run ltfb`          | lint → type-check → format → build                        |
| `npm run phase5:smoke`  | Run the stdio smoke driver against a sandbox tenant       |
| `npm start`             | Boot the built server (`node dist/index.js`)              |

> No automated CI is configured for this repo. The maintainer runs
> `npm run ltfb && npm test` locally on Node 20 and Node 22 before merging
> each PR. If you fork the repo and want CI, see the
> [GitHub Actions Node.js workflow template](https://docs.github.com/en/actions/guides/building-and-testing-nodejs).

---

## Troubleshooting

### "Authentication failed" / 401 errors

- Check that `JIRA_EMAIL` matches the email on the Atlassian account that
  created the API token.
- Check that `JIRA_API_TOKEN` is a **classic (unscoped)** token from
  <https://id.atlassian.com/manage-profile/security/api-tokens>. Scoped tokens
  created via the newer "Create API token with scopes" flow can fail
  authorization on various Jira platform endpoints.
- Make sure the token has not been revoked.

### "Forbidden" / 403 errors

- The Atlassian account must have read permission to the Jira project being
  queried. Ask your Jira admin to grant access, or use a different account.

### "Not Found" / 404 errors

- Verify `JIRA_BASE_URL` matches your Jira Cloud site URL **exactly** (no
  trailing slash, `https://`, not `http://`).
- Verify the issue key exists (`PROJ-1234` format — must be uppercase project
  key + dash + number).

### "Issue text updates are disabled"

- Set `JIRA_ALLOW_ISSUE_UPDATES=true` in the MCP `env` block and restart the
  MCP client. See [Enabling Writes](#enabling-writes-jira_update_issue_text).

### "Only the issue reporter or assignee may update the title/description"

- The Atlassian account you're authenticated as is neither the reporter nor
  the assignee on the target issue. Either:
  - have the reporter/assignee make the change, **or**
  - have a Jira admin change the issue's reporter/assignee to you, **or**
  - use a different Atlassian account whose email matches the reporter or
    assignee on the issue.

### Tool never returns / times out

- Default per-request timeout is 30 s (override with `JIRA_REQUEST_TIMEOUT_MS`).
- Set `JIRA_DEBUG=true` to see URL + status code lines on stderr.
- Jira Cloud's rate limit is ~10 req/s per tenant. The server retries with
  exponential backoff on 429/5xx. If you're seeing frequent timeouts, slow
  down the model's request rate.

### "Cannot find module '@modelcontextprotocol/sdk/...'" after install

- Run `npm ci` to do a clean install from `package-lock.json`. If the issue
  persists, ensure your Node version is ≥ 20 (`node --version`).

### Local development in this repo

- The `phase5:smoke` script runs an end-to-end round-trip
  (`jira_get_current_user` → `jira_get_issue` → `jira_update_issue_text` →
  `jira_get_issue`) against the **built** `dist/index.js`. It needs a Jira
  Cloud sandbox tenant. Set `JIRA_ALLOW_ISSUE_UPDATES=true` and a test issue
  key (default `KAN-1`) in your environment before running it. The script is
  manual — it is not part of any automated pipeline.

---

## Security

- **Read-only by default.** Only the scoped issue text update tool can mutate
  Jira, and only after `JIRA_ALLOW_ISSUE_UPDATES=true` and an identity check.
- **No broad write mode.** Method-locked to `PUT`; path-locked to
  `/rest/api/3/issue/{key}`. Even if a bug tried to call the write helper
  incorrectly, the API layer rejects it.
- **No secrets logged.** `JIRA_DEBUG=true` logs URLs + status codes only.
- **No startup network calls.** The server is fully offline until a tool fires.
- See [`docs/plan.md` §11 Security Posture](docs/plan.md) for the full
  threat model.

---

## License

MIT — see [LICENSE](LICENSE).
