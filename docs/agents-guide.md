# Project-level `AGENTS.md` defaults for `jira-mcp`

> **Status:** ✅ Adopted (UX4 — pattern from [atlassian/atlassian-mcp-server (Rovo)](https://github.com/atlassian/atlassian-mcp-server))

When the model uses `jira-mcp` inside your project, you can commit a top-level
`AGENTS.md` file that biases it toward the **right Jira project, the right
default page size, the right output format, and the right JQL endpoint** for that
project — so it doesn't re-discover those on every session, doesn't drift to the
wrong project, and doesn't accidentally hammer the deprecated `/search`
endpoint.

This guide explains:

1. Why a project-level `AGENTS.md` is useful with `jira-mcp`
2. How to drop the template into your own repo
3. What each line in [the example](AGENTS.md.example) does
4. How the model picks it up automatically
5. How to verify it's working

---

## 1. Why

Without project-level defaults, every fresh model session has to:

1. Call `jira_list_projects` to figure out which project key is "the right one"
2. Guess a reasonable `maxResults` (often 100, blowing past your context window)
3. Maybe try the **deprecated** `/rest/api/3/search` endpoint first because the
   older `McpServer` examples use it

A committed `AGENTS.md` lets the model skip all three of those round-trips.

## 2. How to add it to your project

```bash
# From your project root:
curl -o AGENTS.md \
  https://raw.githubusercontent.com/tugudush/jira-mcp/main/docs/AGENTS.md.example
```

Then edit `AGENTS.md` and replace:

- `YOURPROJ` → your actual Jira project key (e.g. `ENG`, `MKT`, `KNOX`)
- `https://your-domain.atlassian.net` → your Jira Cloud base URL
- the email address (or remove it; not strictly required)

Commit it. The model picks it up the next time it loads your workspace.

## 3. What each line does

| Line                                                           | Effect                                                                                                                               |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **"MUST use Jira project key = `YOURPROJ`"**                   | Tells the model not to call `jira_list_projects` to discover the key. Saves 1 round-trip + ~1k tokens per session.                   |
| **"MUST use `maxResults: 10`"**                                | Keeps JQL responses under the typical model context window. Prevents accidental 100-result dumps that truncate awkwardly.            |
| **"MUST prefer `/rest/api/3/search/jql`"**                     | The legacy `/rest/api/3/search` endpoint is deprecated. The model needs to be told explicitly — many older MCP examples point at it. |
| **"MUST format responses as TOON for any list of > 5 issues"** | TOON (Token-Oriented Object Notation) saves 30–60% of tokens vs. JSON. Lists larger than 5 items benefit most.                       |

## 4. How the model picks it up automatically

GitHub Copilot and Cursor both load `AGENTS.md` from the workspace root when they
boot up. The model reads it as **soft guidance**, not enforced rules — if a user
explicitly asks for `maxResults: 50`, the model will override. But for the
default case, the file's "MUST"s are followed.

The file is **not** loaded into the Jira MCP server itself — it lives in the
**consumer's repo** and is read by the model at the other end.

## 5. Verifying it's working

After committing `AGENTS.md`, ask the model:

> "List the 5 most recent issues in our project."

Expected behavior:

1. The model calls `jira_search_issues` with `jql = 'project = YOURPROJ ORDER BY created DESC'`
   and `maxResults: 10` — **without** first calling `jira_list_projects`.
2. If the result list is longer than 5 issues, the response is rendered as
   TOON, not raw JSON.
3. The model never tries the `/search` endpoint directly.

If any of those don't happen, double-check:

- `AGENTS.md` is in the **workspace root**, not a subdirectory.
- `AGENTS.md` is **committed** (not just local).
- The file uses **uppercase `MUST`** for the rules — soft "should" language
  tends to be ignored by default.

---

## See also

- [`AGENTS.md.example`](AGENTS.md.example) — the template you can copy verbatim.
- [Atlassian Rovo MCP server](https://github.com/atlassian/atlassian-mcp-server) — the source of the UX4 pattern.
- [`competitors.md`](competitors.md) §3.7 — where the UX4 adoption is recorded.
