# Changelog

All notable changes to `@tugudush/jira-mcp` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-28

🎉 **First stable release.** 36 MCP tools across 10 read categories plus one
opt-in scoped issue text update. Talks to Jira Cloud REST API v3 directly using
email + API token — no OAuth admin gating required.

### Added

- **Issues (8 tools)**
  - `jira_search_issues` — JQL search via the new `/rest/api/3/search/jql` endpoint (POST, paginated)
  - `jira_search_jql` — GET variant of search
  - `jira_get_issue` — fetch one issue by key (e.g. `PROJ-123`)
  - `jira_get_issue_transitions` — list allowed workflow transitions
  - `jira_get_issue_changelog` — full history of an issue
  - `jira_get_issue_comments` — list comments on an issue (ADF → plain text)
  - `jira_get_issue_worklogs` — list worklogs on an issue
  - `jira_get_issue_watchers` — list watchers of an issue
- **Projects (5 tools)** — `jira_list_projects`, `jira_get_project`, `jira_get_project_components`, `jira_get_project_versions`, `jira_get_project_statuses`
- **Agile — Boards & Sprints (7 tools)** — `jira_list_boards`, `jira_get_board`, `jira_get_board_issues`, `jira_get_board_sprints`, `jira_get_sprint`, `jira_get_sprint_issues`, `jira_get_backlog_issues`
- **Users (4 tools)** — `jira_get_current_user`, `jira_get_user`, `jira_search_users`, `jira_get_assignable_users`
- **Filters (3 tools)** — `jira_list_filters`, `jira_get_filter`, `jira_get_favorite_filters`
- **Fields & Issue Types (3 tools)** — `jira_list_fields`, `jira_list_issue_types`, `jira_get_create_meta`
- **Dashboards (2 tools)** — `jira_list_dashboards`, `jira_get_dashboard`
- **Workflows & Statuses (2 tools)** — `jira_list_statuses`, `jira_list_workflows`
- **Issue Links (1 tool)** — `jira_get_issue_links` (reads the `issuelinks` field on the issue)
- **Watchers (1 tool)** — `jira_get_issue_watchers`
- **Scoped Issue Text Update — opt-in (1 tool)** — `jira_update_issue_text`:
  PUT `/rest/api/3/issue/{key}` updating only `summary` (title) and/or plain-text `description`.
  Requires `JIRA_ALLOW_ISSUE_UPDATES=true` and authenticated user must be the issue reporter or assignee.
- **Cross-cutting features**
  - `output_format` param on every tool: `text` | `json` | `toon`
  - `filter` param on every tool: JMESPath expression
  - `JIRA_DEFAULT_FORMAT` env var for global default
  - `JIRA_DEBUG=true` for verbose stderr logging (URLs + status codes only)
  - Response truncation with raw file logging when payloads exceed ~10k tokens (aashari pattern, UX1)
  - Tool `description` strings teach usage — embed deprecation notes, parameter hints, and gotchas inline so the model doesn't have to retry (aashari pattern, UX3)
  - Project-level `AGENTS.md` defaults (atlassian/Rovo pattern, UX4) — see [`docs/agents-guide.md`](docs/agents-guide.md)

### Security

- **Read-only by default.** `makeIssueUpdateRequest()` is gated by `JIRA_ALLOW_ISSUE_UPDATES` and method-locked to `PUT` against `/rest/api/3/issue/{key}` only.
- **No broad write mode** — only the scoped issue text update tool exists in v1.0.
- **Reporter/assignee identity check** before every update.
- **No startup network calls** — the server is fully offline until a tool fires.
- **No secrets logged.** `JIRA_DEBUG=true` logs URLs + status codes only — no bodies, no headers.
- **Zod 4 input validation** on every tool.
- TypeScript strict mode + ESLint 10 flat config + Prettier 3.8.

### Notes

- Atlassian MCP (Rovo) requires `twg:*` OAuth scopes that need tenant-admin approval and the legacy SSE method is being deprecated on **June 30, 2026**. `jira-mcp` is a drop-in alternative: same MCP UX, none of the gating.
- For high-volume installs see [docs/plan.md §11 Security Posture](docs/plan.md) — Jira Cloud caps at ~10 req/s per tenant; we rely on retry + exponential backoff.
- See [docs/plan.md](docs/plan.md) for the full phased implementation plan and [competitors.md](competitors.md) for the research that informed it.

[1.0.0]: https://github.com/tugudush/jira-mcp/releases/tag/v1.0.0
