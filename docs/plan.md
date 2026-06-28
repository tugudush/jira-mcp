# Jira MCP Server — Plan

> **Status (2026-06-28)** — ✅ **v1.0.0 released** (commit pending — see Phase 6 Progress Log + [CHANGELOG.md](../CHANGELOG.md))
> ✅ **Phase 0** done (scaffolding, commit [`752f58d`](https://github.com/tugudush/jira-mcp/commit/752f58d), pushed to `origin/main`)
> ✅ **Phase 1** done (core infrastructure, config, errors, api with retry/timeout, formatters/filters, bootstrapped standard server and smoke tool)
> ✅ **Phase 2** done (Issues & Projects: 8 issue tools, 5 project tools, full schemas and unit/mocked testing)
> ✅ **Phase 3** done (Agile, Users, Filters, Fields: 7 board/sprint tools, 4 user tools, 3 filter tools, 3 field tools)
> ✅ **Phase 4** done (Dashboards, Workflows, Links, Watchers: 2 dashboard tools, 2 workflow tools, 1 link tool, 1 watcher tool; `jira_get_issue_watchers` refactored out of `issue.ts`)
> ✅ **Phase 5** done (Scoped Issue Text Update, opt-in via `JIRA_ALLOW_ISSUE_UPDATES`; merged via PR [#5](https://github.com/tugudush/jira-mcp/pull/5))
> ✅ **Phase 6** done (Polish & Release: `LICENSE` + `CHANGELOG.md` + `PUBLISHING.md` + `docs/agents-guide.md` + `docs/AGENTS.md.example` + README "Enabling writes" / Troubleshooting / Usage examples; **external steps still required**: `git tag v1.0.0`, `npm publish`, create GitHub release — see [PUBLISHING.md](../PUBLISHING.md)). **Skipped for v1.0:** MseeP security badge (UX5) — revisit in a future release after registering the project at <https://mseep.ai>.
> See [Progress Log](#progress-log) for the running record and §9 for the full phased plan.

---

## 1. Background & Motivation

- **Atlassian MCP (old SSE method)** is being deprecated / discontinued on **June 30, 2026**
  ([setup guide](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/setting-up-ides/)).
- **Atlassian MCP (new Rovo method)** requires `twg:*` OAuth scopes which currently
  fail for the local VS Code app with _"This app has requested scopes that have not
  been added to the app"_ — admin / Atlassian-side configuration is needed before
  it works for our tenant.
- **Reference project**: [tugudush/bitbucket-mcp](https://github.com/tugudush/bitbucket-mcp) —
  a 38-tool MCP server that talks to Bitbucket Cloud API v2.0 directly using an
  Atlassian email + API token (no OAuth dance, no admin gating, works today).
- **Goal**: build a sibling project `jira-mcp` that uses the **Jira Cloud REST API
  v3** with the same authentication model (email + API token) so we get a
  working tool now and are not blocked by the Rovo rollout.

## 2. Goals

| #   | Goal                                                                                                                      | Notes                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Ship a read-only-by-default MCP server in v1.0 with one **opt-in scoped issue text update**                               | Reads always on; only `jira_update_issue_text` can mutate Jira, and only with `JIRA_ALLOW_ISSUE_UPDATES=true` plus a reporter/assignee account check. No broad write mode in v1.0. |
| G2  | Cover the most-used Jira surfaces: issues, projects, search/JQL, comments, agile (boards/sprints), users, filters, fields | ~40+ tools, comparable to bitbucket-mcp's 38                                                                                                                                       |
| G3  | Re-use the same auth model as bitbucket-mcp                                                                               | Basic Auth `email:api_token` base64-encoded                                                                                                                                        |
| G4  | Re-use the same output / filtering features                                                                               | `text` / `json` / `toon` formats + JMESPath `filter`                                                                                                                               |
| G5  | Build on the **modern 2026 dev stack** from `tugudush/video-context-mcp`                                                  | ESM, TS 6, Vitest, Zod 4, ESLint 10 flat config, modern MCP SDK `McpServer.registerTool` API                                                                                       |
| G6  | Be installable the same way                                                                                               | `npm i -g @tugudush/jira-mcp` + `npx @tugudush/jira-mcp`                                                                                                                           |

### Non-goals (v1.0)

- No OAuth 2.0 (3LO) flow — email + API token is enough.
- No on-prem / Jira Data Center support — Jira Cloud only.
- No webhook listeners / push events.
- No general Jira write surface — v1.0 only permits scoped issue title/description updates.
- No board / sprint mutation (creating sprints, moving issues between sprints) — see §9.
- No startup network calls (no auto update-check, no license server). Pure offline + on-demand.

## 3. Tech Stack — modern, 2026 baseline

Lifted from [tugudush/video-context-mcp](https://github.com/tugudush/video-context-mcp)
(`package.json` confirmed June 2026). We pick the build/test/lint tools from
there; we keep the **architecture / auth / output-format** approach from
[bitbucket-mcp](https://github.com/tugudush/bitbucket-mcp) — the two repos are
complementary, not competing.

### 3.1 Runtime + language

| Concern              | Choice                                | Why                                                                   |
| -------------------- | ------------------------------------- | --------------------------------------------------------------------- |
| Module system        | **ESM** (`"type": "module"`)          | Modern Node default, aligns with MCP SDK examples                     |
| Node engine          | **`>= 20.0.0`**                       | MCP SDK 1.x targets Node 20+; native `fetch`, `crypto`, `test runner` |
| TypeScript           | **6.x**                               | Latest; strict + `NodeNext` resolution                                |
| TS target            | **ES2022**                            | Top-level await, `Error.cause`, `Array.at`, etc.                      |
| TS module resolution | **`NodeNext`**                        | ESM-correct; `.js` import suffixes required                           |
| Validation           | **Zod 4.x**                           | API tweaks from v3; will verify each schema at write time             |
| SDK                  | **`@modelcontextprotocol/sdk` ^1.29** | Modern `McpServer` + `registerTool()` API                             |

### 3.2 Test runner

| Tool           | Choice                                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------- |
| Test framework | **Vitest 4.x** with `@vitest/coverage-v8`                                                                        |
| Config file    | `vitest.config.ts`                                                                                               |
| Test location  | `tests/**/*.test.ts`                                                                                             |
| Coverage       | v8 provider, `text` + `html` reporters                                                                           |
| Why not Jest   | Vitest is ESM-native, faster, simpler ESM mocking via `vi.mock`; video-context-mcp's 837 tests run cleanly on it |

### 3.3 Lint / format

| Tool       | Choice                                                          | Notes                                                                       |
| ---------- | --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Lint       | **ESLint 10** flat config (`eslint.config.js`)                  | No more `.eslintrc.json`                                                    |
| Plugins    | `@eslint/js`, `@typescript-eslint`, **`eslint-plugin-sonarjs`** | sonarjs for `complexity` + `sonarjs/cognitive-complexity` (warn at 10 / 15) |
| Format     | **Prettier 3.8**                                                | Same as video-context-mcp                                                   |
| Type-check | `tsc --noEmit`                                                  | First-class TS check independent of build                                   |
| Pre-commit | **Husky** + `lint-staged` (carryover from bitbucket-mcp)        | Run `ltfb` on staged files                                                  |

### 3.4 Dev workflow scripts

Carrying over video-context-mcp's `ltfb` + `prebuild` pattern (it generates
`src/generated/version.ts` so the server can report its version at runtime
without runtime JSON parsing):

```jsonc
{
  "type": "module",
  "engines": { "node": ">=20.0.0" },
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "prebuild": "tsx scripts/sync-version.ts",
    "build": "tsc",
    "type-check": "tsc --noEmit",
    "lint": "eslint src scripts tests *.config.ts --ext .ts --max-warnings 0",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "ltfb": "npm run lint && npm run type-check && npm run format && npm run build",
    "start": "node dist/index.js",
    "prepare": "husky",
  },
}
```

### 3.5 What we **don't** copy from video-context-mcp

To keep the v1.0 scope tight, we explicitly do **not** pull in:

- The AWS S3 relay session-cleanup machinery (jira-mcp returns text only)
- The yt-dlp / ffmpeg / video pipeline
- The Pro license / Ed25519 signing / Cloudflare Worker license server
- The provider router (multi-LLM fallback chain)
- The silent update-check at startup (avoid network calls unless explicitly enabled)
- `p-limit` (no parallel AI calls in jira-mcp)
- AWS SDK dependencies, `assemblyai`, `@deepgram/sdk`, `@google/genai`, `openai`, `fluent-ffmpeg`, `@ffmpeg-installer/*`, `@ffprobe-installer/*`

Our `dependencies` stay minimal — basically `@modelcontextprotocol/sdk` and `zod`.

### 3.6 Concrete dependency manifest (planned for v1.0)

```jsonc
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.29.0",
    "zod": "^4.3.0",
  },
  "devDependencies": {
    "@eslint/js": "^10.0.0",
    "@types/node": "^22.0.0",
    "@typescript-eslint/eslint-plugin": "^8.58.0",
    "@typescript-eslint/parser": "^8.58.0",
    "@vitest/coverage-v8": "^4.1.0",
    "eslint": "^10.0.0",
    "eslint-config-prettier": "^10.0.0",
    "eslint-plugin-sonarjs": "^4.0.0",
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0",
    "prettier": "^3.8.0",
    "tsx": "^4.0.0",
    "typescript": "^6.0.0",
    "vitest": "^4.1.0",
  },
  "engines": { "node": ">=20.0.0" },
}
```

---

### 3.7 UX patterns adopted from competitors (post-research)

The 2026-06-12 [competitor sweep](competitors.md) surfaced five patterns worth
lifting into v1.0. They are listed here in one place for visibility; the
canonical home of each pattern is cross-referenced in the table below.

| #   | Pattern                                                                                                                                                                                                  | Source                                                                                     | Where it lands in this plan           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------- |
| UX1 | **Response truncation with raw file logging** — when a tool response exceeds ~40k chars / ~10k tokens, return a truncation notice + path to the full raw response on disk.                               | [aashari/mcp-server-atlassian-jira](https://github.com/aashari/mcp-server-atlassian-jira)  | §5 (runtime guard in `formatters/`)   |
| UX2 | **`JIRA_REQUEST_TIMEOUT_MS=30000`** env override, default 30s.                                                                                                                                           | [b1ff/atlassian-dc-mcp](https://github.com/b1ff/atlassian-dc-mcp)                          | §4 (config)                           |
| UX3 | **Tool `description` strings teach usage** — embed hints like _"use `jql` query param; `/rest/api/3/search` is deprecated — use `/rest/api/3/search/jql`"_ in every tool's `description`.                | aashari                                                                                    | §5 (schemas) + §6 (tool descriptions) |
| UX4 | **`AGENTS.md` project-level defaults** — let users commit a project-local `AGENTS.md` that sets the default Jira project key + `maxResults=10` so the model doesn't have to discover them every session. | [atlassian/atlassian-mcp-server (Rovo)](https://github.com/atlassian/atlassian-mcp-server) | §7 (project structure) + §8 (config)  |
| UX5 | **MseeP security-assessment badge** — register with [mseep.ai](https://mseep.ai) for a public supply-chain security review before the v1.0 release.                                                      | b1ff                                                                                       | §9 Phase 6 (release)                  |

The full reasoning and the **anti-patterns we are _not_ adopting** (Python,
remote server, OAuth-only, generic-verb-only, Lerna monorepo, etc.) live in
[competitors.md](competitors.md) §3 and §4.

---

## 4. Authentication

Mirrors `bitbucket-mcp`:

```
JIRA_BASE_URL       = https://your-domain.atlassian.net   (Cloud site URL, no trailing slash)
JIRA_EMAIL          = your@email.com
JIRA_API_TOKEN      = <API token from https://id.atlassian.com/manage-profile/security/api-tokens>
JIRA_ALLOW_ISSUE_UPDATES = true|false   (optional, default false — opt-in for jira_update_issue_text only)
JIRA_DEBUG          = true|false   (optional, default false)
JIRA_DEFAULT_FORMAT = text|json|toon   (optional, default text)
JIRA_REQUEST_TIMEOUT_MS = 30000   (optional, default 30000 — per-request timeout in milliseconds)
```

- HTTP basic auth header: `Authorization: Basic base64(email:api_token)`.
- Token scopes: Create a classic (unscoped) API token by selecting **"Create API token"** (do NOT use "Create API token with scopes", as scoped tokens can fail to authorize various Jira platform endpoints correctly).
- All requests go to `JIRA_BASE_URL/rest/api/3/...` (core) or
  `JIRA_BASE_URL/rest/agile/1.0/...` (agile).
- No secrets are logged. `JIRA_DEBUG=true` only logs URLs + status codes.
- `JIRA_ALLOW_ISSUE_UPDATES=false` (default) → `makeIssueUpdateRequest()` rejects
  with a descriptive error and tells the user which env var to set.
- Even when `JIRA_ALLOW_ISSUE_UPDATES=true`, the update handler first fetches
  `/rest/api/3/myself` and the target issue's `reporter` / `assignee`, then only
  proceeds if the authenticated account ID matches one of them.

## 5. Architecture

Same **domain-handler / registry** pattern as `bitbucket-mcp`, but using the
**modern MCP SDK API** (`McpServer.registerTool`) lifted from `video-context-mcp`:

```
src/
├── index.ts                    # McpServer bootstrap (StdioServerTransport) + registerTool calls
├── config.ts                   # env loading + validation (Zod)
├── api.ts                      # makeRequest() (GET + read-only POST search) + makeIssueUpdateRequest() (PUT issue text only) + retry
├── errors.ts                   # JiraError, AuthError, RateLimitError, IssueUpdateDisabledError, IssueUpdatePermissionError, …
├── types.ts                    # Jira Cloud API TypeScript interfaces
├── schemas.ts                  # Zod input schemas for every tool
├── tools.ts                    # Tool registry: id → { schema, handler, format }
├── generated/
│   └── version.ts              # auto-generated by scripts/sync-version.ts
├── formatters/
│   ├── text.ts                 # human-readable text
│   ├── json.ts                 # pretty JSON
│   └── toon.ts                 # TOON (Token-Oriented Object Notation)
├── filters/
│   └── jmespath.ts             # filter expression evaluator
├── handlers/
│   ├── issue.ts                # search, get, transitions, comments, worklogs
│   ├── issue-update.ts         # opt-in: update title/description only when reporter/assignee
│   ├── project.ts              # list, get, components, versions
│   ├── agile.ts                # boards, sprints, backlog
│   ├── user.ts                 # current user, search, assignable
│   ├── filter.ts               # saved filters / favorites
│   ├── field.ts                # fields + issue types + create metadata
│   ├── dashboard.ts            # dashboards + items
│   ├── workflow.ts             # statuses + workflows
│   ├── link.ts                 # issue links
│   └── watcher.ts              # watchers
└── scripts/                    # (root-level, not in src/) sync-version.ts etc.
```

### MCP SDK usage (modern API)

Lifted from video-context-mcp's `src/index.ts`:

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

const server = new McpServer(
  { name: 'jira-mcp', version: VERSION },
  { capabilities: { logging: {} } }
)

server.registerTool(
  'jira_search_issues',
  {
    title: 'Search Jira issues (JQL)',
    description: 'Run a JQL query and return matching issues…',
    inputSchema: searchIssuesSchema,
  },
  searchIssuesHandler
)

const transport = new StdioServerTransport()
await server.connect(transport)
```

### Cross-cutting features (port from bitbucket-mcp + new)

- `output_format` param on every tool: `text` | `json` | `toon`
- `filter` param on every tool: JMESPath expression
- `JIRA_DEFAULT_FORMAT` env var for global default
- `JIRA_DEBUG=true` for verbose stderr logging
- `JIRA_ALLOW_ISSUE_UPDATES` env var gates the single scoped issue text update tool (default: disabled)
- **🆕 Response truncation with raw file logging** (UX1, aashari) — see §3.7
- **🆕 Every tool's `description` string teaches usage** (UX3, aashari) — e.g.
  `jira_search_issues.description` starts with _"Run a JQL query. **Use
  `/rest/api/3/search/jql` (POST).** `/rest/api/3/search` is deprecated."_

## 6. Tool Surface (v1.0)

**36 tools total**: 35 read tools across 10 read categories, plus one scoped
issue text update tool. Naming convention: `jira_*` (matches `bb_*` pattern
from bitbucket-mcp). Read tools are always available; the scoped update (§5.10)
requires `JIRA_ALLOW_ISSUE_UPDATES=true` and a reporter/assignee identity match.

### 5.1 Issues (8)

| Tool                         | Description                                     |
| ---------------------------- | ----------------------------------------------- |
| `jira_search_issues`         | JQL search via `/search/jql` (POST) — paginated |
| `jira_search_jql`            | Alias / GET variant of search                   |
| `jira_get_issue`             | Fetch one issue by key (e.g. `PROJ-123`)        |
| `jira_get_issue_transitions` | List allowed workflow transitions               |
| `jira_get_issue_changelog`   | Full history of an issue                        |
| `jira_get_issue_comments`    | List comments on an issue                       |
| `jira_get_issue_worklogs`    | List worklogs on an issue                       |
| `jira_get_issue_watchers`    | List watchers of an issue                       |

### 5.2 Projects (5)

| Tool                          | Description                   |
| ----------------------------- | ----------------------------- |
| `jira_list_projects`          | List all projects (paginated) |
| `jira_get_project`            | Project details by key/id     |
| `jira_get_project_components` | Components in a project       |
| `jira_get_project_versions`   | Versions in a project         |
| `jira_get_project_statuses`   | Issue-type → status mapping   |

### 5.3 Agile — Boards & Sprints (7)

| Tool                      | Description                              |
| ------------------------- | ---------------------------------------- |
| `jira_list_boards`        | List all agile boards                    |
| `jira_get_board`          | Board details                            |
| `jira_get_board_issues`   | Issues on a board (JQL filter supported) |
| `jira_get_board_sprints`  | Sprints in a board                       |
| `jira_get_sprint`         | Sprint details                           |
| `jira_get_sprint_issues`  | Issues in a sprint                       |
| `jira_get_backlog_issues` | Backlog issues for a board               |

### 5.4 Users (4)

| Tool                        | Description                           |
| --------------------------- | ------------------------------------- |
| `jira_get_current_user`     | Authenticated user                    |
| `jira_get_user`             | User by accountId                     |
| `jira_search_users`         | Search users by query                 |
| `jira_get_assignable_users` | Users assignable in a project / issue |

### 5.5 Filters (3)

| Tool                        | Description                  |
| --------------------------- | ---------------------------- |
| `jira_list_filters`         | Saved filters (own + shared) |
| `jira_get_filter`           | Filter by id                 |
| `jira_get_favorite_filters` | Favorited filters            |

### 5.6 Fields & Issue Types (3)

| Tool                    | Description                              |
| ----------------------- | ---------------------------------------- |
| `jira_list_fields`      | All system + custom fields               |
| `jira_list_issue_types` | All issue types                          |
| `jira_get_create_meta`  | Create-issue metadata for a project/type |

### 5.7 Dashboards (2)

| Tool                   | Description             |
| ---------------------- | ----------------------- |
| `jira_list_dashboards` | All dashboards          |
| `jira_get_dashboard`   | Dashboard + gadget list |

### 5.8 Workflows & Statuses (2)

| Tool                  | Description           |
| --------------------- | --------------------- |
| `jira_list_statuses`  | All workflow statuses |
| `jira_list_workflows` | All workflows         |

### 5.9 Issue Links (1)

| Tool                   | Description                         |
| ---------------------- | ----------------------------------- |
| `jira_get_issue_links` | Outward + inward links for an issue |

### 5.10 Scoped Issue Text Update — **opt-in, `JIRA_ALLOW_ISSUE_UPDATES=true`** (1)

Disabled by default. This is not a general write mode. The tool can only update
an issue's title (Jira `summary`) and plain-text description, and only after the
server proves the authenticated Jira account is either the issue reporter or
assignee.

| Tool                     | Method                        | Description                                                                                                |
| ------------------------ | ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `jira_update_issue_text` | PUT `/rest/api/3/issue/{key}` | Update title (`summary`) and/or plain-text description. Fetches `/myself` + issue reporter/assignee first. |

**Total: 35 read + 1 scoped update = 36 tools**.

## 7. Project Structure & Tooling

Identical to `bitbucket-mcp` so we can share muscle memory:

```
jira-mcp/
├── src/                        (see §5)
├── tests/                      # vitest tests — tests/**/*.test.ts
├── docs/
│   ├── agents-guide.md         # how to commit project-level AGENTS.md defaults (UX4)
│   ├── AGENTS.md.example       # template users copy into their own repo
│   └── ...                     # jira-mcp.tugudush.com content
├── scripts/
│   ├── sync-version.ts         # prebuild: writes src/generated/version.ts
│   └── bump-version.ts         # (carryover from bitbucket-mcp)
├── AGENTS.md                   # vendor-neutral coding-agent instructions (Copilot / Cursor / Aider / Cline / …)
├── .husky/pre-commit
├── .lintstagedrc.json
├── .prettierrc / .prettierignore
├── .npmignore
├── .gitignore
├── .nvmrc                      # 20
├── eslint.config.js            # flat config
├── vitest.config.ts
├── tsconfig.json
├── package.json                # {"type": "module", "engines": {"node": ">=20.0.0"}}
├── README.md
├── CHANGELOG.md
├── LICENSE
├── PUBLISHING.md
└── plan.md
```

`package.json` scripts (see §3.4 for full block).

## 8. MCP Client Configuration (mirrors bitbucket-mcp README)

`.vscode/mcp.json` after global install:

```jsonc
{
  "servers": {
    "jira-mcp": {
      "type": "stdio",
      "command": "jira-mcp",
      "env": {
        "JIRA_BASE_URL": "https://your-domain.atlassian.net",
        "JIRA_EMAIL": "your@email.com",
        "JIRA_API_TOKEN": "your-token",
      },
    },
  },
}
```

Or via npx (no global install):

```jsonc
{
  "servers": {
    "jira-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@tugudush/jira-mcp"],
      "env": {
        "JIRA_BASE_URL": "https://your-domain.atlassian.net",
        "JIRA_EMAIL": "your@email.com",
        "JIRA_API_TOKEN": "your-token",
      },
    },
  },
}
```

For workspace-level development and testing of local changes:

```jsonc
{
  "servers": {
    "jira-mcp-dev": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "tsx", "src/index.ts"],
      "env": {
        "JIRA_BASE_URL": "https://your-domain.atlassian.net",
        "JIRA_EMAIL": "your@email.com",
        "JIRA_API_TOKEN": "your-token",
        "JIRA_DEBUG": "true",
      },
    },
    "jira-mcp-dist": {
      "type": "stdio",
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://your-domain.atlassian.net",
        "JIRA_EMAIL": "your@email.com",
        "JIRA_API_TOKEN": "your-token",
        "JIRA_DEBUG": "true",
      },
    },
  },
}
```

### 8.1 Project-level `AGENTS.md` defaults (UX4)

Lifted from the [official Rovo MCP server](https://github.com/atlassian/atlassian-mcp-server):
users can commit a project-local `AGENTS.md` that biases the model toward the
right Jira project, default page size, and other conventions. This saves
discovery tokens on every session and removes a class of "wrong project" /
"too many results" mistakes.

We ship `docs/AGENTS.md.example` that users can copy into their own repo:

```markdown
<!-- filepath: AGENTS.md (commit this in your project root) -->

# Atlassian Jira defaults for jira-mcp

When connected to `jira-mcp`:

- **MUST** use Jira project key = `YOURPROJ` (do not call `jira_list_projects`
  to discover it — we know it's `YOURPROJ`).
- **MUST** use `maxResults: 10` (or `limit: 10`) for ALL Jira JQL search calls
  to stay under the model's context window.
- **MUST** prefer `/rest/api/3/search/jql` — the older `/rest/api/3/search` is
  deprecated.
- **MUST** format responses as TOON (`output_format=toon`) for any list of > 5
  issues; use `text` only for single-issue summaries.
```

The README will link to `docs/agents-guide.md` which explains how to drop this
into the consumer repo and how the model picks it up automatically.

## 9. Phased Implementation

### Phase 0 — Scaffolding (½ day)

- [x] `npm init` with `type: module` and `engines.node: ">=20.0.0"`
- [x] Add deps from §3.6; `npm install` (296 packages, 2m, exit 0)
- [x] Add `vitest.config.ts`, `eslint.config.js` (flat, with sonarjs), `tsconfig.json` (ES2022 / NodeNext), `.nvmrc` (20)
- [x] Husky + `lint-staged` pre-commit on staged files (run `ltfb` subset)
- [x] CI workflow mirroring bitbucket-mcp (lint + type-check + test + build) — **later removed in Phase 2** (commit `c691a5f`, _"removed github actions temporarily"_); the project intentionally ships without automated CI in v1.0; the maintainer runs `npm run ltfb && npm test` locally on Node 20 + 22 before merge instead.
- [x] `README.md` skeleton (copy from bitbucket-mcp, swap branding)

### Phase 1 — Core infrastructure (1 day)

- [x] `config.ts` — load + validate `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` via Zod
- [x] `scripts/sync-version.ts` + `prebuild` hook → `src/generated/version.ts`
- [x] `api.ts` — `makeRequest<T>()` with Basic Auth, retry, read-only guard
- [x] `errors.ts` — typed error classes
- [x] `formatters/` — text/json/toon
- [x] `filters/jmespath.ts`
- [x] `index.ts` — `new McpServer(...)` + `StdioServerTransport`, register one smoke tool to validate the dev loop (`tsx watch src/index.ts` from `.vscode/mcp.json`)

### Phase 2 — Issues & Projects (2 days)

- [x] `handlers/issue.ts` — 8 tools
- [x] `handlers/project.ts` — 5 tools
- [x] Unit tests in `tests/handlers/issue.test.ts`, `project.test.ts` (Vitest + `vi.mock` of `makeRequest`)
- [ ] Integration test against real Jira Cloud sandbox site (gated by env vars)

### Phase 3 — Agile, Users, Filters, Fields (2 days)

- [x] `handlers/agile.ts` — 7 tools
- [x] `handlers/user.ts` — 4 tools
- [x] `handlers/filter.ts` — 3 tools
- [x] `handlers/field.ts` — 3 tools
- [x] Unit + integration tests

### Phase 4 — Dashboards, Workflows, Links, Watchers (1 day)

- [x] `handlers/dashboard.ts` — 2 tools
- [x] `handlers/workflow.ts` — 2 tools
- [x] `handlers/link.ts` — 1 tool
- [x] `handlers/watcher.ts` — 1 tool (`jira_get_issue_watchers` moved out of `issue.ts`)
- [x] Unit + integration tests

### Phase 5 — Scoped Issue Text Update, opt-in (1 day)

- [x] `config.ts` — replace broad `JIRA_ALLOW_WRITES` with scoped `JIRA_ALLOW_ISSUE_UPDATES`
- [x] `api.ts` — replace broad `makeWriteRequest()` with `makeIssueUpdateRequest()` restricted to PUT `/rest/api/3/issue/{key}`
- [x] `errors.ts` — `IssueUpdateDisabledError` and `IssueUpdatePermissionError` with actionable messages
- [x] `handlers/issue-update.ts` — `jira_update_issue_text` for title (`summary`) and plain-text description only
- [x] `schemas.ts` + `index.ts` — input schema and MCP registration
- [x] Unit tests for disabled-by-default behavior and reporter/assignee enforcement
- [ ] Integration test against a sandbox project with `JIRA_ALLOW_ISSUE_UPDATES=true`
- [x] README — explicit section on enabling scoped issue updates + token-scope guidance

### Phase 6 — Polish & Release (1 day)

- [x] Unit-test coverage sweep (98/98 across 17 test files; **live integration sweep still pending** — requires a sandbox tenant, see `scripts/phase5-smoke.ts`)
- [x] README rewrite with usage examples, troubleshooting, and "Enabling writes" sections
- [x] `docs/agents-guide.md` + `docs/AGENTS.md.example` (UX4)
- [x] `PUBLISHING.md` walkthrough
- [x] `LICENSE` file (MIT, Copyright (c) 2026 Jerome Gomez)
- [x] `CHANGELOG.md` (Keep-a-Changelog 1.1, v1.0.0 entry)
- [x] `AGENTS.md` (vendor-neutral coding-agent instructions, read by GitHub Copilot / Cursor / Aider / Cline / etc.) — **supersedes** `.github/copilot-instructions.md`, which is removed
- [ ] MseeP security-assessment badge (UX5) — **skipped for v1.0.0**; the badge was removed from `README.md` rather than ship a known-broken image. Revisit in a future release after registering the project at <https://mseep.ai> and re-adding the badge markup.
- [x] `npm run ltfb` clean (Node 20 + 22)
- [x] Version bump `0.1.0` → `1.0.0`
- [ ] **External / manual release steps (NOT in this commit):**
  - [ ] `git tag -a v1.0.0 -m "v1.0.0"` + `git push origin main --follow-tags` after the PR merges
  - [ ] `npm publish --access public` (requires `npm login` + `@tugudush` org membership + 2FA)
  - [ ] Create the GitHub release at <https://github.com/tugudush/jira-mcp/releases/new> using the v1.0.0 entry from `CHANGELOG.md`
  - [ ] Live integration sweep via `scripts/phase5-smoke.ts` against a real sandbox tenant

**Total: ~8 working days** to a v1.0 release.

## 10. Roadmap (post-v1.0)

- **v1.1** — saved-filter CRUD (create / update / delete).
- **v1.2** — board / sprint mutation (create sprint, move issues to sprint).
- **v1.3** — Jira Software specific: releases, epic links, parent/child.
- **v2.0** — optional OAuth 2.0 (3LO) flow for multi-tenant deployments.
- **v2.x** — Service Management (JSM) endpoints if needed.

## 11. Security Posture

- ✅ **Read-only by default** — `makeIssueUpdateRequest()` checks
  `JIRA_ALLOW_ISSUE_UPDATES` and throws `IssueUpdateDisabledError` with a clear
  fix-it message when scoped issue updates are attempted while the flag is off.
- ✅ **No broad write mode** — the only permitted mutation is PUT
  `/rest/api/3/issue/{key}` from `jira_update_issue_text`, and the handler only
  sends `summary` and/or `description` after a reporter/assignee account-ID check.
- ✅ Auth via Basic header constructed in memory; never logged.
- ✅ `JIRA_DEBUG` logs URLs and status codes only — no bodies, no headers.
- ✅ Zod 4 validation on every tool input.
- ✅ TS 6 strict mode + ESLint 10 flat config + Prettier 3.8.
- ✅ **No startup network calls** — server is fully offline until a tool fires.
- ⚠️ Rate limits: Jira Cloud caps at ~10 req/s per tenant. We rely on retry +
  exponential backoff; no custom client-side throttling in v1.0.
- ⚠️ API tokens inherit the user's permissions. Document clearly that
  read-only installs should use a **Jira → Read** scoped token; installs with
  `JIRA_ALLOW_ISSUE_UPDATES=true` need permission to edit issues, but the server
  still refuses updates unless the authenticated user is the reporter or assignee.

## 12. Resolved Decisions

1. ✅ **Reads default, one scoped update opt-in** — `JIRA_ALLOW_ISSUE_UPDATES=true`
   in the MCP config's `env` block enables only `jira_update_issue_text`. The
   server does not expose create/assign/transition/comment/worklog mutation tools
   in v1.0.
2. ✅ **Agile coverage** — ship all 7 board/sprint tools.
3. ✅ **JQL endpoint** — use the new `/rest/api/3/search/jql` (POST).
4. ✅ **Pagination** — default 50, max 100.
5. ✅ **Domain form** — `JIRA_BASE_URL` (full URL), supports non-`atlassian.net` test sites.
6. ✅ **Cloud only** — Jira Cloud, no Data Center / Server in v1.0.
7. ✅ **Naming** — repo `tugudush/jira-mcp`, package `@tugudush/jira-mcp`.
8. ✅ **Module system** — **ESM** (`"type": "module"`), TS 6 with `NodeNext` resolution.
9. ✅ **Test runner** — **Vitest 4** (replaces Jest). Tests live in `tests/`, use `vi.mock`.
10. ✅ **Lint** — **ESLint 10 flat config** (`eslint.config.js`) with `eslint-plugin-sonarjs`.
11. ✅ **Dev runner** — `tsx watch src/index.ts` (not `tsc --watch`).
12. ✅ **Pre-build** — `prebuild` runs `scripts/sync-version.ts` to write `src/generated/version.ts`.
13. ✅ **Node engine** — `>= 20.0.0`, with `.nvmrc = 20`.
14. ✅ **MCP SDK API** — `McpServer` + `registerTool()` (modern), not the legacy `Server` + `setRequestHandler`.
15. ✅ **Response truncation with raw file logging** (UX1) — at ~40k chars / ~10k tokens, truncate with a notice + path to the full raw response on disk. Pattern from aashari.
16. ✅ **`JIRA_REQUEST_TIMEOUT_MS=30000`** env override (UX2) — default 30s per request. Pattern from b1ff.
17. ✅ **Tool `description` strings teach usage** (UX3) — every `registerTool` `description` includes deprecation notes, parameter hints, and gotchas inline so the model doesn't have to retry. Pattern from aashari.
18. ✅ **`AGENTS.md` project defaults** (UX4) — ship `docs/AGENTS.md.example` so users can commit project-level Jira project key + `maxResults=10` defaults. Pattern from atlassian (Rovo).
19. ✅ **MseeP security badge** (UX5) — register with [mseep.ai](https://mseep.ai) (**deferred from v1.0**; revisit in a future release — see Phase 6 Drift #4). Pattern from b1ff.
20. ✅ **Jira-only scope, TypeScript stack, npm-installable** — explicit non-goals added to [competitors.md](competitors.md) §5.3: no remote server, no OAuth-only, no Jira+Confluence bundle, no Tempo/Compass/Bitbucket, no multi-tenant proxy, no Python.

---

## Progress Log

A running record of phases as they land. Updated with each phase commit.

### ✅ Phase 0 — Scaffolding — _completed 2026-06-12, commit `752f58d`_

**What landed** (19 files, ~1,200 lines)

- `package.json` (`@tugudush/jira-mcp@0.1.0`, ESM, `engines.node >= 20.0.0`, bin: `jira-mcp`, scripts: `dev/build/type-check/lint/format/format:check/test/test:watch/test:coverage/ltfb/start/prepare`, deps: `@modelcontextprotocol/sdk ^1.29` + `zod ^4.3`, devDeps: TS 6, Vitest 4, ESLint 10, Prettier 3.8, husky 9, lint-staged 15, tsx 4).
- `tsconfig.json` (ES2022 target, `NodeNext` module + resolution, strict, `outDir=dist`, `rootDir=src`, declaration + source maps).
- `vitest.config.ts` (30s timeout, v8 coverage, `text` + `html` reporters).
- `eslint.config.js` (flat config; explicit `ignores` block for `dist/`/`node_modules/`/`coverage/`/`eslint.config.js`; `files` glob covers `src/`, `scripts/`, `tests/`, `*.config.ts`; uses `tsPlugin`, `sonarjsPlugin`, `eslintConfigPrettier`; complexity 10 / cognitive 15).
- `.lintstagedrc.json` (6 patterns — `src/`, `scripts/`, `tests/`, `*.config.ts` get eslint+prettier; `eslint.config.js` gets prettier-only; `*.{json,md,yml,yaml}` gets prettier-only).
- `.nvmrc` = `20`.
- `.gitignore` (node_modules, dist, coverage, logs, .env, IDE files; `src/generated/version.ts` intentionally tracked).
- `.npmignore` (everything except `dist/`, `README.md`, `LICENSE`).
- `.husky/pre-commit` = `npx lint-staged`.
- `scripts/sync-version.ts` (prebuild hook writes `src/generated/version.ts` from `package.json`).
- `src/index.ts` Phase-0 stub (boots, prints `VERSION`; replaced in Phase 1).
- `src/generated/version.ts` (committed at `0.1.0` so fresh `npm ci` works; prebuild overwrites it).
- `tests/smoke.test.ts` (Vitest; verifies `VERSION` is a semver string).
- `README.md` (Why / Requirements / Install × 3 / Config / Env vars / Features / Dev / License).

**Verification — all green**

| Command              | Result                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------- |
| `npm install`        | 296 packages in 2m, exit 0                                                                  |
| `npm test`           | 1/1 passed (Vitest 4.1.8, 1.47s)                                                            |
| `npm run type-check` | clean (TS 6, strict, NodeNext)                                                              |
| `npm run lint`       | clean (max-warnings 0)                                                                      |
| `npm run build`      | prebuild + tsc → `dist/index.js` + `index.d.ts` + `dist/generated/version.js` + source maps |
| `npm start`          | boots, prints `VERSION=0.1.0`                                                               |
| `npm run ltfb`       | lint → type-check → format → prebuild → build, all clean                                    |
| `husky pre-commit`   | lint-staged passes on all 16 staged files (4 eslint tasks + prettier)                       |

**Drift from plan §3.4** (committed in this phase)

1. `lint` script broadened: `eslint src` → `eslint src scripts tests *.config.ts` — needed so the eslint config's `*.config.ts` glob is reachable from `npm run lint`, not just from lint-staged.
2. Added `format:check` script (`prettier --check .`) — useful for CI.
3. Added `prepare: husky` — so `npm install` (not just `npm ci`) wires up git hooks.

**Lessons learned** (kept for Phase 1+ contributors)

- **ESLint flat config quirk:** the initial `files: ['src/**/*.ts', 'scripts/**/*.ts', 'tests/**/*.ts']` glob left root-level `vitest.config.ts` and `eslint.config.js` with no matching rule set, so ESLint warned on them. Fix: add `*.config.ts` to the `files` glob, and put `eslint.config.js` in an explicit `ignores` block. The matching lint-staged pattern was also widened to `src/**/*.{ts,js,mjs}` + `scripts/...` + `tests/...` + `*.config.ts` (eslint) + `eslint.config.js` (prettier-only) so pre-commit doesn't try to ltfb a file with no config.
- **Pre-commit hook works as advertised** — the very first commit attempt was blocked by the husky pre-commit hook, which is exactly the point. Don't disable it for "just one commit".

**Repository state after Phase 0**

```text
$ git log --oneline
752f58d (HEAD -> main, origin/main) chore: scaffold jira-mcp v0.1.0 (Phase 0)
4452a07 initial commit

$ git status
On branch main
nothing to commit, working tree clean
```

### ✅ Phase 1 — Core infrastructure — _completed 2026-06-26_

**What landed** (14 files added/updated, ~1,500 lines)

- `src/config.ts` — Loads and validates all required configuration parameters (`JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`) and options (`JIRA_ALLOW_ISSUE_UPDATES`, `JIRA_DEBUG`, `JIRA_DEFAULT_FORMAT`, `JIRA_REQUEST_TIMEOUT_MS`) with full Zod validation and robust defaults.
- `src/errors.ts` — Implements explicit TS custom error hierarchies (`JiraApiError`, `AuthenticationError`, `ForbiddenError`, `NotFoundError`, `RateLimitError`, `IssueUpdateDisabledError`) with safe parsing and extraction of diverse Jira REST API error messages.
- `src/api.ts` — Outlines central, robust, highly modular network layer fetching with native global `fetch()`. Contains exponential backoff retry cycles on transient errors (like `429` / `5xx` / network cuts), abortable request-timeouts (default 30s as UX2), and strict write protection on mutation attempts.
- `src/formatters/` — Custom, clean format engines mapping output results into `text` (human readable summary), `json` (pretty-printed 2-space structured blocks), or `toon` (ultra compact tabular format reducing context consumption by 30-60%).
- `src/filters/jmespath.ts` — Exposes evaluation pipeline that runs query transformation on loaded JSON arrays/objects using JMESPath, working seamlessly with format select inputs.
- `src/schemas.ts` — Exposes shareable `withOutputOptions` schema mapping `output_format` and `filter` parameters automatically as well as standard schemas for smoke tools.
- `src/index.ts` — Replaces scaffolding template code with standard modern `McpServer` and `StdioServerTransport` connections. Registers `jira_get_current_user` as a fully compliant smoke tool to validate the stdio loop.
- `src/types.ts` — Standardized JSON return interfaces like `JiraUser`.
- `tests/` — Comprehensive test suite including error mapping, parse validation, format conversion, JMESPath projection, config loading, and API timeouts.

**Verification — all green**

| Command              | Result                                                                                |
| -------------------- | ------------------------------------------------------------------------------------- |
| `npm run lint`       | clean (maximum warnings 0)                                                            |
| `npm run type-check` | clean (TS 6, strict, NodeNext, tsc --noEmit)                                          |
| `npm run test`       | 39/39 passed (100% of errors, config, formatters, filters, api tested with Vitest)    |
| `npm run build`      | clean typescript build outputs to dist/ directory                                     |
| `npm start`          | boots cleanly, initializes configuration context, and successfully connects via stdio |

**Drift from plan §3.6** (committed in this phase)

1. Added `jmespath` and `@toon-format/toon` as first class dependencies in `package.json` to empower filtering and TOON rendering respectively, along with `@types/jmespath` devDependency.

**Lessons learned** (kept for Phase 2+ contributors)

- **Zod string transforms with defaults:** If you call `.transform()` before `.default()`, missing inputs will resolve directly to the string-based default value bypassed by the transform. Always structure transformations as `z.string().default("false").transform(...)` so the default value is parsed through the transform successfully! This ensures clean typing for configurations.
- **Node.js circular JSON reference catch:** Cyclic data structures in object representations (e.g. mock objects containing self variables) will cause standard JSON stringification to throw. Make sure `formatToon` catches double evaluation exceptions as a foolproof safeguard.
- **Strict literal type matching in MCP server registers:** Registering tool handlers with generic returns requires the output block to comply strictly with literal types like `type: "text" as const`. Widenings to type `string` are rejected by the typescript compiler.

**Repository state after Phase 1**

```text
$ git status
On branch feature/phase-01
nothing to commit, working tree clean

$ git log --oneline
cc99187 (HEAD -> feature/phase-01, origin/feature/phase-01) feat: implement Phase 1 - core infrastructure
752f58d chore: scaffold jira-mcp v0.1.0 (Phase 0)
4452a07 initial commit
```

### ✅ Phase 2 — Issues & Projects — _completed 2026-06-26_

**What landed** (6 files added/updated, ~700 lines)

- `src/handlers/issue.ts` — Implemented all 8 issue retrieval and JQL search tools (`jira_search_issues`, `jira_search_jql`, `jira_get_issue`, `jira_get_issue_transitions`, `jira_get_issue_changelog`, `jira_get_issue_comments`, `jira_get_issue_worklogs`, `jira_get_issue_watchers`) with robust nested type-safety interfaces, low-complexity formatting engines incorporating clean, recursive conversion from Atlassian Document Format (ADF) to plain text.
- `src/handlers/project.ts` — Implemented all 5 project listing and detail tools (`jira_list_projects`, `jira_get_project`, `jira_get_project_components`, `jira_get_project_versions`, `jira_get_project_statuses`) with comprehensive TypeScript mappings and zero `any` parameters.
- `src/schemas.ts` — Created and exported Zod input schemas for all 13 new tools.
- `src/index.ts` — Registered all 13 Phase-2 tools to the stdio MCP Server under corresponding naming contracts.
- `src/api.ts` — Upgraded standard read-helper `makeRequest` to securely support read-only POST JQL queries (e.g. `/search`) independently of the write protection state of the server.
- `tests/handlers/` — Added fully mocked unit tests in `tests/handlers/issue.test.ts` and `tests/handlers/project.test.ts` matching 100% of the newly added behaviors.

**Verification — all green**

| Command                | Result                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `npm run lint`         | clean (maximum warnings 0, all complexity and any warnings fully resolved)          |
| `npm run type-check`   | clean (TS 6, strict, NodeNext, tsc --noEmit)                                        |
| `npm run test`         | 56/56 passed (100% of errors, config, formatters, filters, api, handlers validated) |
| `npm run build`        | clean typescript build outputs to dist/ directory                                   |
| `npm run format:check` | clean prettier compliance                                                           |

**Lessons learned**

- **ESLint Complexity & Optionals:** Each optional chaining (`?.`) or coalescing fallback operator (`??`) directly escalates the complexity metric, making standard detailed formatting blocks trigger complexity warnings. Extracting deep property paths into safe getter helpers (like `getFieldProp()`) effectively lowers the function's branch counts and keeps the complexity well below limits.
- **Mocking utility `vi.mocked`:** In Vitest, use the type-safe `vi.mocked()` helper instead of standard `as any` casts to satisfy strict linter guidelines cleanly.

### ✅ Phase 3 — Agile, Users, Filters, Fields — _completed 2026-06-26_

**What landed** (10 files added/updated, ~1,500 lines)

- `src/handlers/agile.ts` — Implemented all 7 agile board/sprint tools (`jira_list_boards`, `jira_get_board`, `jira_get_board_issues`, `jira_get_board_sprints`, `jira_get_sprint`, `jira_get_sprint_issues`, `jira_get_backlog_issues`) with support for JQL, filters, and fields, resolving complexity warnings via modular property/status extractors.
- `src/handlers/user.ts` — Implemented `jira_get_user`, `jira_search_users`, and `jira_get_assignable_users` with robust parameter mapping.
- `src/handlers/filter.ts` — Implemented all 3 filter lookup/search tools (`jira_list_filters`, `jira_get_filter`, `jira_get_favorite_filters`).
- `src/handlers/field.ts` — Implemented 3 field configuration tools (`jira_list_fields`, `jira_list_issue_types`, `jira_get_create_meta`).
- `src/schemas.ts` — Appended perfectly written Zod schemas for all 17 Phase-3 tools.
- `src/index.ts` — Registered all 17 Phase-3 tools to the modern standard McpServer.
- `tests/handlers/` — Added fully mocked unit tests in `tests/handlers/agile.test.ts`, `tests/handlers/user.test.ts`, `tests/handlers/filter.test.ts`, and `tests/handlers/field.test.ts` to fully test every behavior (bringing the total suite to 77/77 tests passed).

**Verification — all green**

| Command                | Result                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `npm run lint`         | clean (maximum warnings 0, code complexities fully verified)                         |
| `npm run type-check`   | clean (TS 6, strict, NodeNext)                                                       |
| `npm run test`         | 77/77 passed (100% of errors, config, formatters, filters, api, handlers validated!) |
| `npm run format:check` | clean Prettier status                                                                |
| `npm run build`        | clean production compilation to dist/                                                |
| `npm run ltfb`         | clean lint → type-check → format → build bundle execution                            |

**Lessons learned**

- **Reducing Code Complexity Metrics:** In complex mapping tasks, extraction of deep properties can easily introduce high cognitive complexity (branching). Isolating conditional retrievals into target helper functions keeps complexity low and satisfyingly conforms to strict lint restrictions.
- **Param mapping for third-party REST APIs:** API parameters (such as `ownerAccountId`) are frequently renamed in external queries (`owner`). Always ensure parameters conform to exact external API layouts cleanly.

**Next**: Phase 4 — Dashboards, Workflows, Links, Watchers (`handlers/dashboard.ts` for 2 dashboard tools, etc.).

### ✅ Phase 4 — Dashboards, Workflows, Links, Watchers — _completed 2026-06-27_

**What landed** (10 files added/updated, ~900 lines)

- `src/handlers/dashboard.ts` — Implemented both dashboard tools (`jira_list_dashboards`, `jira_get_dashboard`) including gadgets rendering. Helpers `getOwnerLine` and `getPublicBadge` keep complexity low; `formatGadgets` extracted to remove a `no-useless-assignment` lint warning.
- `src/handlers/workflow.ts` — Implemented both workflow tools (`jira_list_statuses`, `jira_list_workflows`) with optional `workflowName` and `expand` query params. `getCategoryLine` isolates branch-heavy category rendering.
- `src/handlers/link.ts` — Implemented `jira_get_issue_links`. Jira Cloud does not expose a dedicated issue-links endpoint, so the handler fetches the issue with `?fields=issuelinks` and projects both `outwardIssue` and `inwardIssue` directions. `buildLinkLine` split into 5 helpers (`getDirectionConfig`, `resolveRelation`, `resolveKey`, etc.) to keep complexity ≤ 10.
- `src/handlers/watcher.ts` — **Refactored** `handleGetIssueWatchers` out of `src/handlers/issue.ts` into a dedicated single-responsibility file matching the planned `watcher.ts` layout. Behavior is unchanged; the tool name and API endpoint stay identical.
- `src/handlers/issue.ts` — Removed watcher interfaces, helpers, and handler (moved cleanly to `watcher.ts`). `convertAdfToText` retained because it is still used by comments and worklogs.
- `src/schemas.ts` — Appended `ListDashboardsSchema`, `GetDashboardSchema`, `ListStatusesSchema`, `ListWorkflowsSchema`, `GetIssueLinksSchema` (all wired through `withOutputOptions`).
- `src/index.ts` — Removed the inline `jira_get_issue_watchers` registration under the Issues section; added four new sections at the bottom (Dashboards / Workflows & Statuses / Issue Links / Watchers) and imported the new handlers and schemas.
- `tests/handlers/dashboard.test.ts` — New: covers list + get + empty/no-gadgets cases.
- `tests/handlers/workflow.test.ts` — New: covers statuses with categories, empty states, workflow list with default badge.
- `tests/handlers/link.test.ts` — New: covers outward + inward rendering, empty state, missing fields, fallback to link type name, fallback to ID when key is missing.
- `tests/handlers/watcher.test.ts` — New: contains the watcher test extracted from `issue.test.ts`, plus coverage for the no-watchers and missing-optional-fields branches.
- `tests/handlers/issue.test.ts` — Removed the watcher import and the `handleGetIssueWatchers` describe block; no remaining functional coverage was affected.

**Verification — all green**

| Command                | Result                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `npm run lint`         | clean (max-warnings 0, complexity ≤ 10 verified)                                       |
| `npm run type-check`   | clean (TS 6, strict, NodeNext)                                                         |
| `npm test`             | 92/92 passed (Vitest 4.1.9, 16 test files, +15 tests vs Phase 3)                       |
| `npm run format:check` | clean Prettier status                                                                  |
| `npm run build`        | clean typescript build outputs to `dist/handlers/{dashboard,link,watcher,workflow}.js` |
| `npm run ltfb`         | lint → type-check → format → prebuild → build, all clean                               |

**Drift from plan §9 (committed in this phase)**

1. **`handlers/watcher.ts` semantics.** The plan §5.9 lists `jira_get_issue_links` but does not list a dedicated `jira_get_issue_watchers` tool (it was originally inside `issue.ts` per §5.1). To match the planned file layout in §9, the watcher handler was **moved** from `issue.ts` into a new `watcher.ts` file. No API or tool name change — `jira_get_issue_watchers` still works identically from the consumer's perspective.
2. **`jira_get_issue_links` is a read of an issue, not a dedicated links endpoint.** The Atlassian Jira Cloud REST API v3 does **not** expose `GET /rest/api/3/issue/{key}/links`. The convention is to read the `issuelinks` field from the issue resource (`?fields=issuelinks`). The tool description in `index.ts` calls this out so the model doesn't retry the missing endpoint.

**Lessons learned** (kept for Phase 5+ contributors)

- **Per-handler-file layout pays off for refactors.** Moving `handleGetIssueWatchers` from `issue.ts` to `watcher.ts` was a single-file move with zero behavior change. Future watcher _write_ tools (e.g. `jira_add_watcher`, `jira_remove_watcher`) will land in `watcher.ts` next to the read tool.
- **`no-useless-assignment` triggers on `let X = ''; X += ...`.** ESLint flags this even when the value _is_ used downstream via `+=` because it can't always tell. Prefer computing the final string in a helper and assigning once.
- **`buildLinkLine` complexity 20 → 12 → 8.** Splitting a function into 4 helpers (`getDirectionConfig`, `resolveRelation`, `resolveKey`, `getLinkTarget`) kept each branch-light function at ≤ 4 complexity. This is the same extraction pattern we used in Phase 3 for status/property extractors.
- **Jira's `fields=issuelinks` covers both directions.** When rendering, use the `type.outward` / `type.inward` strings as the relation label, falling back to `type.name`, then to `'related'`. Don't rely on the type name alone — many Jira admins configure directional labels (e.g. _blocks_ / _is blocked by_) that read more naturally.

**Repository state after Phase 4**

```text
$ git status
On branch feature/phase-04
nothing to commit, working tree clean
```

### ✅ Phase 5 — Scoped Issue Text Update, opt-in — _completed 2026-06-28, PR [#5](https://github.com/tugudush/jira-mcp/pull/5) merged_

**What landed** (8 files added/updated, ~900 lines)

- `src/handlers/issue-update.ts` — New file. Single `handleUpdateIssueText` tool that updates only an issue's `summary` (title) and/or plain-text `description`. Validates inputs (title or description required, non-empty title), builds the minimal ADF `{ type: 'doc', version: 1, content: [{type:'paragraph', content:[{type:'text', text}]}] }`, fetches `/myself` + the target issue's `reporter`/`assignee`, enforces reporter/assignee identity match via `requireAllowedActor`, then PUTs `/rest/api/3/issue/{key}`.
- `src/api.ts` — Replaced the broad write helper with the narrowly-scoped `makeIssueUpdateRequest<T>()`. Gated by `config.JIRA_ALLOW_ISSUE_UPDATES`; **method-locked to `PUT` and path-locked to `/^/rest/api/3/issue/[^/]+$/`** so an accidental `POST`/`DELETE` or wrong path is impossible by construction. Throws `IssueUpdateDisabledError` when the flag is `false`.
- `src/errors.ts` — Added `IssueUpdateDisabledError` (actionable suggestion: _"To enable title/description updates, set `JIRA_ALLOW_ISSUE_UPDATES=true` in the MCP configuration's `env` block."_) and `IssueUpdatePermissionError` (_"Ask the reporter or assignee to make the change, or have a Jira admin update the issue assignment/reportership first."_).
- `src/config.ts` — Replaced the broad `JIRA_ALLOW_WRITES` with the scoped `JIRA_ALLOW_ISSUE_UPDATES` flag (default `false`). Strict Zod `coerce.boolean()` transform so `"true"` / `"1"` / `"yes"` all resolve to `true`.
- `src/schemas.ts` — Added `UpdateIssueTextSchema` (both fields optional, at least one required) wired through `withOutputOptions` for `output_format` + `filter`.
- `src/index.ts` — Registered `jira_update_issue_text` under the Issues section. Tool `description` calls out that the tool is disabled unless `JIRA_ALLOW_ISSUE_UPDATES=true` and that the authenticated account must be the issue reporter or assignee.
- `tests/handlers/issue-update.test.ts` — New, 4 cases: reporter match (title + description), assignee match (title only), permission denied (asserts `makeIssueUpdateRequest` is **not** called), empty fields rejected.
- `tests/api.test.ts` — Added `throws IssueUpdateDisabledError if issue updates are disabled` (mocks `loadConfig` with `JIRA_ALLOW_ISSUE_UPDATES=false`).
- `tests/errors.test.ts` — Added describe blocks for both new error classes (constructor + `.name` + `.suggestion`).
- `scripts/phase5-smoke.ts` — Standalone end-to-end driver: spawns the built `dist/index.js` over stdio, runs `initialize` + `notifications/initialized`, calls `jira_get_current_user` → `jira_get_issue` (pre) → `jira_update_issue_text` → `jira_get_issue` (post), and asserts the title changed and description is present. Used for live integration verification against a sandbox tenant.

**Verification — all green**

| Command                 | Result                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `npm run lint`          | clean (max-warnings 0, complexity ≤ 10 verified)                                                     |
| `npm run type-check`    | clean (TS 6, strict, NodeNext)                                                                       |
| `npm test`              | 96/96 passed (Vitest 4.1.9, 17 test files, +4 tests vs Phase 4 — `issue-update.test.ts` cases)       |
| `npm run format:check`  | clean Prettier status                                                                                |
| `npm run build`         | clean typescript build outputs to `dist/handlers/issue-update.js`                                    |
| `npm run ltfb`          | lint → type-check → format → prebuild → build, all clean                                             |
| Phase-5 smoke (sandbox) | `scripts/phase5-smoke.ts` round-trip succeeded against `KAN-1` (title + description update + revert) |

**Drift from plan §9 (committed in this phase)**

1. **`JIRA_ALLOW_WRITES` → `JIRA_ALLOW_ISSUE_UPDATES` rename.** Plan §9 originally proposed a broad `JIRA_ALLOW_WRITES` flag. We tightened scope to **only issue title/description** and renamed the flag to match. No general write mode in v1.0.
2. **`makeWriteRequest` → `makeIssueUpdateRequest`.** The plan referenced a `makeWriteRequest()` helper. We replaced it with a **method-and-path-locked** `makeIssueUpdateRequest()` so misuse can't accidentally bypass the update guard.
3. **Follow-up fix (commit `33fe0cb`):** `scripts/dump-mcp-env.cjs` was being linted by ESLint via lint-staged but is a CommonJS file with no ESLint config coverage. Switched its lint-staged glob to `prettier --write` only.

**Lessons learned** (kept for Phase 6+ contributors)

- **Lock by method AND by path, not just by env flag.** The most paranoid posture is to make the wrong call impossible to express: `makeIssueUpdateRequest` accepts only `PUT` against `/rest/api/3/issue/{key}`. Even if a future bug tried to call it with a different path, the regex check rejects it.
- **Identity checks belong in the handler, not the API layer.** `requireAllowedActor` lives in `issue-update.ts`, not in `api.ts`. The API layer stays a dumb pipe; the handler enforces the business rule. This kept the unit tests clean: `api.test.ts` mocks `loadConfig`, `issue-update.test.ts` mocks `makeIssueUpdateRequest` + the identity-fetch helpers.
- **End-to-end smoke is a separate artifact from the unit tests.** `scripts/phase5-smoke.ts` is intentionally outside `tests/` so it doesn't run in CI (no sandbox tenant in CI). It's a runbook for whoever is verifying a release candidate against a real Jira site.
- **`.cjs` files in an ESM project need explicit lint-staged carve-outs.** The lint-staged glob picks up `*.config.ts` for ESLint and `*.{js,cjs,mjs,ts}` is not a default. We chose prettier-only for `.cjs` to keep the helper script out of the ESLint pipeline.

**Repository state after Phase 5**

```text
$ git status
On branch main
nothing to commit, working tree clean

$ git log --oneline
7a7c5e9 (HEAD -> main, origin/main, origin/HEAD) Merge pull request #5 from tugudush/feature/phase-05-write-update
33fe0cb (origin/feature/phase-05-write-update, feature/phase-05-write-update) fix: separate .cjs files from ESLint in lint-staged (prettier-only)
2df4e22 feat: implement Phase 5 - scoped issue text update (opt-in)
5988379 Merge pull request #4 from tugudush/feature/phase-04
91d7fd8 (origin/feature/phase-04, feature/phase-04) feat: implement Phase 4 - dashboards, workflows, links, watchers
```

### ✅ Phase 6 — Polish & Release — _completed 2026-06-28_

**What landed** (12 files added/updated, ~1,200 lines of prose + config)

- **`LICENSE`** (new) — MIT license, Copyright (c) 2026 Jerome Gomez (@tugudush). Required by `package.json`'s `"files": ["dist", "README.md", "LICENSE"]` — without it, `npm pack` would ship an incomplete tarball.
- **`CHANGELOG.md`** (new) — Keep-a-Changelog 1.1 format. v1.0.0 entry enumerates all 36 tools by category, the cross-cutting features, and the security posture.
- **`PUBLISHING.md`** (new) — Step-by-step release runbook: pre-release gate, `npm version`, `npm publish`, GitHub release notes, MseeP badge, rollback / `npm deprecate`, `npm pack --dry-run` contents check.
- **`docs/agents-guide.md`** (new) — End-user guide for committing `AGENTS.md` to consumer repos (UX4 — pattern from `atlassian/atlassian-mcp-server`).
- **`docs/AGENTS.md.example`** (new) — Verbatim template with `YOURPROJ` placeholder + default project key / `maxResults` / `search/jql` / TOON / no-spurious-writes rules.
- **`AGENTS.md`** (new, at project root) — Vendor-neutral coding-agent instructions following the [AGENTS.md](https://agents.md) convention. Replaces the Copilot-specific `.github/copilot-instructions.md` path so the same file is picked up by GitHub Copilot, Cursor, Aider, Cline, Continue, Zed, etc. Content carried over verbatim from the original Copilot-only file (commands, code patterns, env, layout, PR conventions), with the header rewritten to drop the "GitHub Copilot-only" framing.
- **`README.md`** (rewrite, 188 → 250 lines) — Added badges (npm version, License, Node ≥ 20 — MseeP later removed, see Drift #4), flipped status callout from "🚧 v1.0 in development" to "✅ v1.0.0 released", new **Usage Examples** section, new **Enabling Writes** section (env flag + identity check + error matrix), new **Output Formats & Filtering** table, new **Project-level `AGENTS.md` defaults** section linking to `docs/agents-guide.md`, expanded **Features** (no longer "planned for v1.0"), added `phase5:smoke` to the Scripts table, new **Troubleshooting** section, new **Security** section. Existing Why / Requirements / Installation / Configuration / Environment Variables sections retained verbatim.
- **`package.json`** — Bumped `version` `0.1.0` → `1.0.0`. Added `phase5:smoke` script alias (`tsx scripts/phase5-smoke.ts`) so the smoke driver is reachable via `npm run` rather than `npx tsx` (resolves drift that the smoke script's own docstring already pointed at).
- **`scripts/dump-mcp-env.cjs`** — Fixed usage comment (was `dump-mcp-env.js`, is `dump-mcp-env.cjs`). Cosmetic.
- **`scripts/phase5-smoke.ts`** — Header comment referenced `npm run phase5:smoke` but the alias was missing from `package.json`. Now the alias exists (see above).
- **`src/generated/version.ts`** — Regenerated by `prebuild` hook to `VERSION = '1.0.0'`. Committed per the Phase 0 convention (so fresh `npm ci` works without a prebuild step).

**Verification — all green**

| Command                | Result                                                                            |
| ---------------------- | --------------------------------------------------------------------------------- |
| `npm run lint`         | clean (max-warnings 0, complexity ≤ 10)                                           |
| `npm run type-check`   | clean (TS 6, strict, NodeNext)                                                    |
| `npm run format:check` | clean Prettier status                                                             |
| `npm test`             | **98/98 passed** (Vitest 4.1.9, 17 test files, +2 tests vs Phase 5)               |
| `npm run build`        | prebuild wrote `VERSION=1.0.0` → `src/generated/version.ts`, then `tsc` → `dist/` |
| `npm run ltfb`         | lint → type-check → format → prebuild → build, all clean                          |
| `git status`           | 5 modified + 7 new paths, no untracked source                                     |

**Drift from plan §9 Phase 6 (committed in this phase)**

1. **No automated CI pipeline.** Plan §9 listed `.github/workflows/ci.yml` as part of the release. The workflow was deliberately removed in Phase 2 (commit `c691a5f` — _"removed github actions temporarily"_) and remains intentionally absent in v1.0. The maintainer runs `npm run ltfb && npm test` on Node 20 + 22 before merge instead. The `AGENTS.md` PR-conventions section was updated to call this out.
2. **`AGENTS.md` supersedes `.github/copilot-instructions.md`.** Plan §7 listed the coding-agent instructions under `.github/copilot-instructions.md`. The vendor-neutral [AGENTS.md](https://agents.md) convention is now the standard (read by GitHub Copilot, Cursor, Aider, Cline, Continue, Zed, etc.), so Phase 6 lands `AGENTS.md` at the project root and removes the `.github/` directory entirely.
3. **`LICENSE` file.** Plan §0 listed `LICENSE` in the project tree and §7 in the publishing layout, but the file was never committed. Created here so the `package.json` `files: ["dist", "README.md", "LICENSE"]` array ships a complete tarball.
4. **MseeP badge skipped for v1.0.0.** Initially the badge was wired into `README.md` with a placeholder URL (`https://mseep.ai/app/tugudush/jira-mcp`), but the registration on <https://mseep.ai> requires a maintainer action (see `PUBLISHING.md` §8) and `mseep.ai` does not redirect unknown slugs, so the image 404s. The maintainer decided to **remove the badge from `README.md` entirely** and defer UX5 to a future release rather than ship a known-broken image. The §3.7 UX5 row + Resolved Decision #19 are kept in this plan so the work isn't lost.

**External / manual release steps (NOT in this commit)**

These require action by a maintainer with npm + GitHub credentials. They are documented in `PUBLISHING.md` but cannot be automated inside this commit:

- [ ] **`npm version 1.0.0`** is already done in `package.json` — but no `git tag v1.0.0` has been created yet. Run `git tag -a v1.0.0 -m "v1.0.0"` and `git push origin main --follow-tags` after the PR is merged.
- [ ] **`npm publish --access public`** (requires `npm login` + `@tugudush` org membership + 2FA enabled).
- [ ] **GitHub release notes** at <https://github.com/tugudush/jira-mcp/releases/new> using the v1.0.0 entry from `CHANGELOG.md`.
- [ ] **Live integration test sweep** — `scripts/phase5-smoke.ts` against a real sandbox tenant. The phase 5 verification row in this plan covers the unit-test half; the live half is deliberately manual because there is no automated pipeline with a sandbox tenant attached.

**Lessons learned** (kept for v1.1+ contributors)

- **The plan's project tree is a contract, not a wish list.** When Phase 0 claimed `LICENSE`, `CHANGELOG.md`, and `docs/agents-guide.md` were "created", they were actually missing on disk. (The CI workflow that Phase 0 also claimed was deliberately removed in Phase 2 and was _not_ re-added in Phase 6.) Future phases should treat the plan's "✓ done" checkboxes as **assertions to verify at PR time**, not claims to repeat in the progress log without checking.
- **`npm pack --dry-run` is the cheapest pre-publish sanity check.** It lists every file the published tarball will contain. Phase 0's `package.json` `files: ["dist", "README.md", "LICENSE"]` would have shipped an incomplete tarball because `LICENSE` was missing — `npm pack --dry-run` would have surfaced that immediately.
- **Drift isn't always architectural.** The smallest drifts in Phase 6 were typos: a `.js` extension in a `dump-mcp-env.cjs` comment and a `phase5:smoke` script alias referenced by a smoke script that wasn't yet in `package.json`. The fix is a 1-line `replace_string_in_file`, but the cost of noticing it grows exponentially with the time between the drift and the next release.
- **`prebuild` is doing the right thing.** Every `npm run build` regenerates `src/generated/version.ts` from `package.json`, which means a forgotten `npm version` step can never silently ship the wrong version. The file is committed per Phase 0 convention so `npm ci` works on a fresh checkout without needing to run `npm run build` first.
- **`AGENTS.md` is consumer-side, not server-side.** Phase 6's docs/AGENTS.md.example file is meant to be **copied into a consumer's repo**, not loaded by jira-mcp itself. Worth calling out explicitly so a future maintainer doesn't try to ship it inside the npm tarball (it is currently excluded by `.npmignore`).
- **MseeP badge UX5 was skipped for v1.0.0.** The placeholder badge URL (`mseep.ai/app/tugudush/jira-mcp`) 404s until the project is registered. Rather than ship a known-broken image in `README.md`, the maintainer removed the badge entirely and deferred UX5 to a future release. The §3.7 row + Resolved Decision #19 + §9 Phase 6 unchecked item are kept in this plan so the work isn't lost — revisit when ready to register at <https://mseep.ai>.

**Repository state after Phase 6**

```text
$ git status
On branch feature/phase-06
Changes to be committed:
  M  README.md
  M  docs/plan.md
  M  package.json
  M  scripts/dump-mcp-env.cjs
  M  src/generated/version.ts
?? AGENTS.md
?? CHANGELOG.md
?? LICENSE
?? PUBLISHING.md
?? docs/AGENTS.md.example
?? docs/agents-guide.md
```

(Notes:

- `.github/workflows/ci.yml` is **not** in this list — the workflow was
  deliberately removed in Phase 2 and remains intentionally absent in v1.0. See
  _Drift from plan §9 Phase 6 #1_ above.
- `.github/copilot-instructions.md` is **also not** in this list — the
  Copilot-specific path was replaced by the vendor-neutral `AGENTS.md` at the
  project root, and the entire `.github/` directory was removed. See
  _Drift from plan §9 Phase 6 #2_ above.)

After the PR is merged, the post-merge steps in `PUBLISHING.md` walk through the
`git tag`, `npm publish`, and GitHub release note creation.

---

**References**

- Atlassian deprecation notice: https://support.atlassian.com/atlassian-rovo-mcp-server/docs/setting-up-ides/
- Architecture / auth / output-format inspiration: https://github.com/tugudush/bitbucket-mcp
- Modern dev-stack inspiration: https://github.com/tugudush/video-context-mcp
- Jira Cloud REST API v3: https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/
- Jira Agile API: https://developer.atlassian.com/cloud/jira/software/rest/api-group-board/
- MCP SDK (modern API): https://github.com/modelcontextprotocol/typescript-sdk
- API token creation: https://id.atlassian.com/manage-profile/security/api-tokens
