# Competitor Landscape — Jira / Atlassian MCP Servers

Researched **June 12, 2026** via GitHub search (`tugudush/` MCP access) and npm registry search. Goal: pick the best strengths from each and bake them into `jira-mcp`.

---

## 1. Executive Summary

The Jira-MCP space is **fragmented and noisy** — there is no dominant Jira-only MCP server, only a small number of clear category leaders. Distribution by what we found:

| Category                           | Count | Notes                                                                            |
| ---------------------------------- | ----: | -------------------------------------------------------------------------------- |
| Jira + Confluence bundles          |   ~14 | Most common pattern; dominated by `mcp-atlassian` (sooperset)                    |
| **Jira-only**                      |    ~5 | Smaller niche; this is where we want to be                                       |
| Atlassian Data Center (Cloud + DC) |    ~3 | Including the official Rovo                                                      |
| Tempo worklogs (specialized)       |     1 | `tempo-mcp-server`                                                               |
| Atlassian proxy / multi-tenant     |    ~3 | `mcp-multi-jira`, `@jourlez/atlassian-mcp-server`, `@alfe.ai/openclaw-atlassian` |
| Token-compressor (orthogonal)      |     1 | `@atlassian/mcp-compressor`                                                      |

**Key market gap**: nobody has shipped a focused, **Jira-only**, **TypeScript**, **modern MCP SDK** server with the same polish as the user's `bitbucket-mcp` (TOON output, JMESPath filtering, env-driven config, npm-installable). The closest analogs either:

- Bundle Confluence (sooperset, parthav46)
- Use Python (sooperset, atlassian-dc-mcp, official Rovo proxy)
- Use 5 generic HTTP verbs (aashari) instead of named Jira tools
- Are too narrow (Tempo only) or too broad (DC + Cloud + Bitbucket + Confluence in one)

**Differentiation thesis for `jira-mcp`**: _Jira-only · TypeScript · modern SDK · npm-installable · bitbucket-mcp-grade developer ergonomics_.

---

## 2. Top Competitors (ranked by relevance)

### 2.1 Market leader

#### 1. [sooperset/mcp-atlassian](https://github.com/sooperset/mcp-atlassian) → npm: [`mcp-atlassian`](https://www.npmjs.com/package/mcp-atlassian)

|                          |                                                  |
| ------------------------ | ------------------------------------------------ |
| **Language**             | Python (99.3%)                                   |
| **Stars / Forks**        | **5,390** / 1,225                                |
| **Weekly npm downloads** | ~18,846                                          |
| **Releases**             | 70                                               |
| **Contributors**         | 118                                              |
| **License**              | MIT                                              |
| **Tool count**           | 72 (Jira + Confluence)                           |
| **Auth**                 | API token, PAT, **OAuth 2.0 (3LO)**              |
| **Transports**           | stdio, **SSE**, **streamable-http** (multi-user) |
| **Deployment**           | `uvx`, Docker, pip, source; Helm chart; Smithery |

**Strengths**

- The undisputed category leader. 70 releases, 118 contributors, dedicated docs site (`mcp-atlassian.soomiles.com`), `llms.txt` for LLM consumption.
- Covers **Cloud + Server/Data Center** in one server.
- Multi-transport, multi-user (the `streamable-http` mode is rare in the ecosystem and critical for shared deployments).
- OAuth 2.0 (3LO) flow for multi-tenant.
- Helm chart + Docker image on `ghcr.io` for production deploys.
- Very active issue tracker (and 336 open issues — see weaknesses).
- Helm chart + RBAC templates, supply-chain hardening (`fakeredis` pin, etc.).

**Weaknesses**

- **Python**, not TypeScript — doesn't match the user's `tugudush/*` ecosystem.
- Jira and Confluence are intertwined; no "Jira only" install option.
- 336 open issues is a lot — there is real accumulated surface area to maintain.
- Heavy dep tree (uv + many Python packages).
- Migrations between versions have been a pain point historically (Cloud-only → add DC → add Confluence tools).

**What we should steal**

- The `llms.txt` / `llms-full.txt` doc export — the entire docs site is consumable by an LLM in one fetch. Cheap, high-leverage.
- Documentation-site pattern (`jira-mcp.tugudush.com`?) — auto-generated tool reference, per-page markdown.
- Smithery registration for one-click installs in the Smithery registry.
- Issue triage cadence — even with 336 open, they respond.

**What we should avoid**

- Mixing Jira + Confluence in one binary — keep our tool surface tight to Jira.
- Python.
- Building a Helm chart / multi-user proxy in v1.0 — out of scope for a read-mostly local MCP.

---

### 2.2 The official Atlassian answer

#### 2. [atlassian/atlassian-mcp-server](https://github.com/atlassian/atlassian-mcp-server) — "Rovo MCP"

|                        |                                                                       |
| ---------------------- | --------------------------------------------------------------------- |
| **Language**           | JavaScript 65.8% / Python 34.2%                                       |
| **Stars / Forks**      | 776 / 92                                                              |
| **License**            | Apache-2.0                                                            |
| **Server type**        | **Remote**, hosted by Atlassian (`https://mcp.atlassian.com/v1/mcp`)  |
| **Auth**               | **OAuth 2.1 (3LO)** or scoped API token                               |
| **Connected products** | Jira, Confluence, **Compass**                                         |
| **Admin gating**       | **Yes** — site admin must complete 3LO first; IP allowlisting honored |

**Strengths**

- Official Atlassian. Maintained by Atlassian staff (14 contributors including `@lsosa1`, `@pnguyen-atlassian`).
- Covers Jira + Confluence + Compass in one go.
- Audit logging for compliance.
- IP allowlisting respected.
- Default-cloudId, default-Jira-project, default-Confluence-space can be encoded into `AGENTS.md` to save tokens.
- "Skills" pattern — pre-bundled reusable prompts.

**Weaknesses** _(and the reason this whole project exists)_

- **This is the server failing for the user today** — _"This app has requested scopes that have not been added to the app"_. Requires Atlassian tenant admin to add the requested `twg:*` scopes before it works. Many tenants don't have that turned on.
- It's a **remote, hosted** server. You don't run it locally; you connect to it. That means:
  - Every tool call leaves your network and goes to Atlassian's infrastructure.
  - Latency, data-residency, and audit concerns.
  - No way to ship a fixed or extended version upstream.
- OAuth 2.1 dance every time you change IDEs / accounts.
- No support for Jira Server / Data Center.
- "Not a Marketplace App" — confusing install story.

**What we should steal**

- The **skills** pattern — bundle a few common reusable prompts (e.g. "sprint summary", "triage my open issues", "weekly standup prep") in our `docs/` or `examples/`.
- The `AGENTS.md` defaults pattern — let users commit a project-level `AGENTS.md` that sets the default Jira project key and `maxResults=10` to save discovery tokens. Simple text file, no code needed.
- Built-in compliance / audit-friendly posture (don't log payloads, respect allowlists — even if we don't have an allowlist to respect, document the principle).

**What we should avoid**

- Being a remote server.
- OAuth 2.1 (3LO) as the **only** auth path — it's why this server is hard to roll out.
- Bundling Compass / Confluence.

---

### 2.3 Closest technical analogues (TypeScript, MCP SDK)

#### 3. [aashari/mcp-server-atlassian-jira](https://github.com/aashari/mcp-server-atlassian-jira) → npm: `@aashari/mcp-server-atlassian-jira`

|                    |                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------- |
| **Language**       | TypeScript 89.4%                                                                      |
| **Stars / Forks**  | 71 / 28                                                                               |
| **Releases**       | **107**                                                                               |
| **License**        | MIT                                                                                   |
| **Tool count**     | **5 generic HTTP tools** (jira_get / jira_post / jira_put / jira_patch / jira_delete) |
| **Auth**           | API token + email + `ATLASSIAN_SITE_NAME` (subdomain)                                 |
| **Output formats** | **TOON (default)**, JSON, raw                                                         |
| **Filtering**      | **JMESPath** (`--jq`)                                                                 |
| **Latest release** | v3.3.0 (Dec 2025) — possible slowdown                                                 |

**Strengths**

- Modern MCP SDK (v1.23+) using the `registerTool` API — same modern API we picked from `video-context-mcp`.
- Zod v4 in use.
- 5 generic verbs expose **any** Jira REST endpoint without code changes — full coverage by default.
- **TOON by default** — confirms 30–60% token savings is the right move.
- **JMESPath filtering** via `--jq` / `jq` param.
- **Response truncation** with raw file logging to `/tmp/mcp/.../<timestamp>-<random>.txt` — clever. When a response would blow the context window, it gets truncated and the full raw response is dumped to disk for follow-up.
- CLI interface using Commander.js (so you can `npx -y @aashari/mcp-server-atlassian-jira get --path /rest/api/3/issue/PROJ-123`).
- 5-layer architecture: CLI → Tools → Controllers → Services → Utils.
- Zod validation on every input.
- Last touched Dec 2025 — recent.

**Weaknesses**

- **Generic verbs are a double-edged sword**: the model has to know API paths like `/rest/api/3/search/jql` and JQL syntax. Compare to a server with `jira_search_issues(jql: "...")` where the model just types the JQL. For power users this is great; for "I just want to find a bug" it's friction.
- Splits the request across 2-3 tool calls (e.g. `jira_get` path → `jira_get` issue) more often than named-tool servers.
- 107 releases in 1.5 years is great velocity but signals some API churn.
- Latest release 6 months ago — could indicate a maintenance slowdown.
- Bundles "natural language" marketing in README but the server is a generic REST proxy, not LLM-aware.

**What we should steal**

- ✅ **TOON by default** with a `text` fallback — already in our plan, validated by adoption.
- ✅ **JMESPath `filter` parameter** on every tool — already in our plan.
- ✅ **Response truncation with raw file logging** — _not yet in our plan, but worth adding_. When a response exceeds ~40k chars / ~10k tokens, truncate with a notice + path to the full raw file.
- ✅ **Generic verb tool as a power-user escape hatch** — _worth considering_. We could ship 43 named tools + 1 `jira_raw(method, path, body, jq, output_format)` that maps to any endpoint. The named tools cover the 95% case; `jira_raw` covers the long tail. This is a v1.1 enhancement.
- ✅ **5-layer architecture** is clean; ours is 3-layer (handlers / formatters / api) which is also fine for a smaller surface.
- ✅ **TOON-format README examples** are a nice teaching aid for users.

**What we should avoid**

- Generic-only tools as the primary interface — discoverability is worse than named tools.

---

#### 4. [b1ff/atlassian-dc-mcp](https://github.com/b1ff/atlassian-dc-mcp) → npm: `@atlassian-dc-mcp/{jira,confluence,bitbucket}`

|                   |                                                     |
| ----------------- | --------------------------------------------------- |
| **Language**      | TypeScript 99.5%                                    |
| **Stars / Forks** | 77 / 32                                             |
| **Releases**      | 45 (latest 4 days ago)                              |
| **License**       | MIT                                                 |
| **Tool count**    | "Search, view, create" per product (small, focused) |
| **Auth**          | API token or PAT (DC uses PAT)                      |
| **Deployment**    | Lerna monorepo, npm workspaces                      |
| **Specialty**     | **Data Center**                                     |

**Strengths**

- **Interactive `setup` CLI** per product (`npx @atlassian-dc-mcp/jira setup`) that:
  - Prompts for host, API base path, default page size, API token.
  - Validates inputs before saving.
  - Performs a timed authenticated request to confirm a working token.
  - Prefers the most secure storage available per OS:
    - **macOS** → Keychain (`/usr/bin/security`).
    - **Linux** → `~/.atlassian-dc-mcp/<product>.env` with `chmod 0600`.
    - **Windows** → `%USERPROFILE%\.atlassian-dc-mcp\<product>.env` (inherits user-profile ACL).
  - Honors `--non-interactive` mode for CI.
- **Multi-source config precedence**: `process.env` → `ATLASSIAN_DC_MCP_CONFIG_FILE` → `~/.atlassian-dc-mcp/<product>.env` → macOS Keychain. Process env always wins — perfect for one-shot overrides.
- **Lerna monorepo** with separate packages per Atlassian product — clean separation, each can be `npm i -g`'d independently.
- **30-second default request timeout** with `ATLASSIAN_DC_MCP_REQUEST_TIMEOUT_MS` env override.
- MseeP security badge — supply-chain transparency.

**Weaknesses**

- **Data Center only** — won't help for our Cloud-only target.
- Monorepo + Lerna adds setup complexity.
- Setup CLI is awesome for desktop installs but heavy if the user just wants to paste a token into `.vscode/mcp.json` (the common case).

**What we should steal**

- ✅ **Interactive `setup` CLI for credentials** — _not for v1.0, but a great v1.1 add-on_. The win is: validate the token against a real `/myself` call before saving, so misconfiguration is caught at setup time, not on the first tool call.
- ✅ **Multi-source config precedence** (`env > .env > home file`) — already in our plan as a single env, but documenting the precedence chain is good practice.
- ✅ **Request timeout env var** (`JIRA_REQUEST_TIMEOUT_MS=30000`) — _add to our plan_. Default 30s, override via env.
- ✅ **macOS Keychain / cross-platform secure storage** — _v1.2 stretch_. Today env var is fine.
- ✅ **`--non-interactive` mode** for the setup CLI — same.
- ✅ **Validating a real authenticated call at setup time** is brilliant UX.
- ✅ **MseeP / supply-chain security badge** — register with a security-assessment service before v1.0.

**What we should avoid**

- Lerna / monorepo for v1.0 — overkill for one product.
- DC-first config.

---

#### 5. [George5562/Jira-MCP-Server](https://github.com/George5562/Jira-MCP-Server)

|                   |                                |
| ----------------- | ------------------------------ |
| **Language**      | JavaScript                     |
| **Stars / Forks** | 62 / 25                        |
| **License**       | (not specified)                |
| **Tool count**    | "natural language" — small set |
| **Last push**     | Sep 2025                       |

**Strengths**

- Simple, focused README.
- Easy to read for newcomers learning how an MCP server is wired.

**Weaknesses**

- Low maintenance velocity (last commit Sep 2025).
- JavaScript, not TypeScript.
- "Natural language" claim is marketing; it's a thin REST wrapper like the rest.
- Tiny surface area, no clear differentiation.

**What we should steal**

- A clean, simple "what does each tool do" README — ours should be similarly approachable.

**What we should avoid**

- Under-investing in test coverage and CI — small servers tend to rot fast.

---

#### 6. [ivelin-web/tempo-mcp-server](https://github.com/ivelin-web/tempo-mcp-server)

|                   |                     |
| ----------------- | ------------------- |
| **Language**      | TypeScript          |
| **Stars / Forks** | 39 / 30             |
| **License**       | MIT                 |
| **Tool count**    | Tempo worklogs only |
| **Last push**     | Apr 2026            |

**Strengths**

- **Vertical specialization** — does one thing (Tempo time tracking) very well.
- Active, recently updated.
- Shows there's a real market for focused Atlassian-adjacent tools beyond the surface.

**Weaknesses**

- Out of scope for our project (we're Jira-core), but worth noting: a _family_ of focused Atlassian MCPs may be a stronger long-term positioning than one big monolithic server.

**What we should steal**

- The idea that a _focused_ MCP wins. Our `jira-mcp` should not balloon into "Jira + Tempo + Confluence + Bitbucket + Compass + ..." in v1.0. Stay tight on Jira core.

---

### 2.4 npm-only packages (no public source we could fully review)

These are npm-listed but their GitHub repos weren't in the top of GitHub search. Many are forks or small personal projects. We list the most-downloaded.

#### 7. `@atlassian-mcp-server/jira` (yasoza) — npm only

- **~9.3k weekly downloads** (highest weekly after sooperset).
- Monorepo: also publishes `@atlassian-mcp-server/bitbucket`, `@atlassian-mcp-server/confluence`.
- Likely just a naming namespace, not a strong differentiator.

#### 8. `@iflow-mcp/jira-mcp-server` (chatflowdev) — npm only

- **~8.8k weekly downloads**.
- Multi-package publisher (`@iflow-mcp/*`).
- Bun-based? Keywords mention "bun".

#### 9. `@rambou/jira-mcp` (rambou) — npm only

- **~4.5k weekly downloads**.
- `0.2.1-alpha` — pre-1.0, active iteration.

#### 10. `@stubbedev/atlassian-mcp` (stubbedev) — npm only

- **~3.1k weekly downloads**.
- **Self-hosted Jira and Bitbucket** — niche but real audience.
- Last release "a day ago" — very active.

#### 11. `@atlassian/mcp-compressor` (**official Atlassian**) — npm

- **~2.8k weekly downloads**.
- **TypeScript MCP server wrapper for reducing tokens consumed by MCP tools.**
- This is _orthogonal_ to Jira — it's a generic proxy that sits in front of _any_ MCP server (presumably including ours) and compresses payloads.
- **Strategic signal**: Atlassian themselves see token cost as the #1 UX problem in MCP, and have shipped a dedicated mitigation. Validate our TOON + JMESPath approach.

#### 12. `jira-mcp` (camdenclark2022) — npm

- **~2.8k weekly downloads**.
- Has a Smithery badge — registered in the Smithery registry for one-click install.

#### 13. `@rokealvo/jira-mcp` — npm

- **~2.8k weekly downloads**, v1.4.0, 5 months old.

#### 14. `@ecubelabs/atlassian-mcp` — npm

- **~2.0k weekly downloads**, v1.14.1, 1 month old — actively maintained.

#### 15. `@aot-tech/jira-mcp-server` — npm

- **~1.2k weekly downloads**, v1.0.9, 9 months old.

#### 16. `@esdantunes/atlassian-mcp` — npm

- **~1.0k weekly downloads**, v1.1.1, 25 days old.
- Has Gemini-CLI keyword — ties into the `gemini-cli` MCP ecosystem.

#### 17. `jira-mcp` (parthav46) — npm

- **~993 weekly downloads**, v0.1.5, 1 year old.
- Bundles Jira + Confluence.

#### 18. `@jourlez/atlassian-mcp-server` — npm

- **~993 weekly downloads**, v1.0.9, 2 months old.
- **Multi-tenant Atlassian MCP proxy** — seamlessly routes Jira, Confluence, Compass across multiple Cloud accounts.
- Niche but real (consultants, agencies with multiple clients).

#### 19. `@caobing122/jira-mcp-server` — npm

- **~797 weekly downloads**, v1.1.5, 5 months old.

#### 20. `@answerai/jira-mcp` — npm

- **~541 weekly downloads**, v1.1.0, 8 months old.

#### Honorable mentions (smaller but distinct)

| Package                                | Weekly dl | Distinctive trait                                                |
| -------------------------------------- | --------: | ---------------------------------------------------------------- |
| `@jagadeesh52423/atlassian-mcp-server` |       322 | Atlassian bundle (Jira + Confluence + Bitbucket) in one          |
| `@alfe.ai/openclaw-atlassian`          |       277 | OAuth-bridged Atlassian proxy (multi-site)                       |
| `@iflow-mcp/jira-mcp`                  |       350 | Bun + TypeScript, Chatflow publisher                             |
| `geely-jira-mcp`                       |       158 | Geely internal; 14-day-old updates                               |
| `@atlassian-dc-mcp/jira`               |       101 | The npm mirror of `b1ff/atlassian-dc-mcp`                        |
| `mcp-multi-jira`                       |        61 | Multi-account router / proxy / CLI (by iipanda)                  |
| `@undefined0_0/jira-mcp`               |        44 | Niche                                                            |
| `likejarvis-jira-mcp-server`           |        38 | Niche                                                            |
| `@iflow-mcp/camdenclark-jira-mcp`      |        35 | Re-publish of `jira-mcp` (camdenclark2022) under iflow namespace |
| `@neosamon/jira-mcp-server`            |        53 | Niche                                                            |
| `@orengrinker/jira-mcp-server`         |        61 | Claims "comprehensive" — time tracking, boards, PM all in        |
| `@mcp-devtools/jira` (dxheroes)        |       250 | Part of `@mcp-devtools/*` multi-server family                    |
| `@xuandev/atlassian-mcp`               |       239 | Atlassian bundle                                                 |
| `@nexus2520/jira-mcp-server`           |        60 | Niche                                                            |

---

## 3. Strengths to Adopt (summary table)

Ranked by **impact × ease** for our v1.0.

| #   | Strength                                                                                                                                      | From                       | Adopt for jira-mcp v1.0?                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------ |
| S1  | **TOON output format** with `text` / `json` fallback                                                                                          | aashari, bitbucket-mcp     | ✅ **Already in plan**                                                                           |
| S2  | **JMESPath `filter` parameter** on every tool                                                                                                 | aashari, bitbucket-mcp     | ✅ **Already in plan**                                                                           |
| S3  | **`McpServer.registerTool()` modern SDK API**                                                                                                 | aashari, video-context-mcp | ✅ **Already in plan**                                                                           |
| S4  | **Zod 4 + TypeScript 6 + Vitest 4 + ESM + ESLint 10 flat**                                                                                    | video-context-mcp, aashari | ✅ **Already in plan**                                                                           |
| S5  | **`text` / `json` / `toon` global default via env**                                                                                           | bitbucket-mcp              | ✅ **Already in plan**                                                                           |
| S6  | **Two README install paths** — `npm i -g` _and_ `npx -y`                                                                                      | aashari, sooperset, b1ff   | ✅ **Already in plan**                                                                           |
| S7  | **VS Code `.vscode/mcp.json` config block** in README                                                                                         | all competitors            | ✅ **Already in plan**                                                                           |
| S8  | **Response truncation + raw file logging** when payload > ~10k tokens                                                                         | aashari                    | 🟡 **Add to v1.0** — high value, small cost                                                      |
| S9  | **`JIRA_REQUEST_TIMEOUT_MS` env override** with 30s default                                                                                   | b1ff                       | 🟡 **Add to v1.0** — small change                                                                |
| S10 | **`JIRA_DEBUG` env var** for verbose stderr logging                                                                                           | bitbucket-mcp              | ✅ **Already in plan**                                                                           |
| S11 | **Tool description teaches usage** in the `description` string (e.g. "use `jql` query param. IMPORTANT: `/rest/api/3/search` is deprecated!") | aashari                    | 🟡 **Adopt for our tools** — copy aashari's "use `/search/jql`, not `/search`" hint              |
| S12 | **`AGENTS.md` / project-level defaults** for project key, default page size                                                                   | atlassian (Rovo)           | 🟡 **Add to docs/** — show users how to commit a project-level `AGENTS.md` that biases the model |
| S13 | **`llms.txt` / `llms-full.txt`** for the docs site                                                                                            | sooperset                  | 🟡 **v1.1** — once we have `jira-mcp.tugudush.com` set up                                        |
| S14 | **Smithery registration** for one-click install                                                                                               | sooperset, camdenclark     | 🟡 **v1.1** — submit a `smithery.yaml`                                                           |
| S15 | **Interactive `setup` CLI** with live token validation                                                                                        | b1ff                       | ⚪ **v1.2** — deferred                                                                           |
| S16 | **macOS Keychain / cross-platform secure credential storage**                                                                                 | b1ff                       | ⚪ **v1.2** — deferred                                                                           |
| S17 | **Skills / reusable prompt bundles**                                                                                                          | atlassian (Rovo)           | ⚪ **v1.2** — bundle 3-5 sprint / triage / standup recipes in `docs/skills/`                     |
| S18 | **Generic-verb escape hatch** (`jira_raw(method, path, body, jq)`)                                                                            | aashari                    | ⚪ **v1.1** — defer, do not block v1.0                                                           |
| S19 | **MseeP / supply-chain security badge**                                                                                                       | b1ff                       | 🟡 **v1.0** — register, it's free                                                                |
| S20 | **OAuth 2.0 (3LO) flow for multi-tenant**                                                                                                     | sooperset                  | ⚪ **v2.0** — explicitly out of scope for v1.0                                                   |

Legend: ✅ already in plan · 🟡 adopt now (small/easy) · ⚪ defer

---

## 4. Anti-Patterns to Avoid

| #   | Anti-pattern                                         | From                                         | Why avoid                                                                                                                                    |
| --- | ---------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | **Bundling Jira + Confluence in one binary**         | sooperset, parthav46, jagadeesh52423         | Splits the install/config/test story; harder to evolve independently. We chose Jira-only and should keep that discipline.                    |
| A2  | **Python instead of TypeScript**                     | sooperset (Python), atlassian-dc-mcp (mixed) | Our `tugudush/*` ecosystem + `bitbucket-mcp` + `video-context-mcp` are all TypeScript. Sharing lint, test, and CI patterns wins.             |
| A3  | **Remote hosted server**                             | atlassian (Rovo)                             | The user can't ship fixes, latency is higher, data-residency concerns. Local stdio MCP is the right model.                                   |
| A4  | **OAuth 2.1 / 3LO as the only auth path**            | atlassian (Rovo)                             | This is why the Rovo server fails for the user today. Email + API token is the correct default.                                              |
| A5  | **Generic HTTP verbs as the primary interface**      | aashari                                      | Discoverability is worse; model has to memorize REST paths. Use named tools, save `jira_raw` for v1.1 as an escape hatch.                    |
| A6  | **336 open issues / 1225 forks / sprawling surface** | sooperset                                    | A 72-tool server across 2 products, 2 deploy targets, 4 transports, with OAuth + IP allowlisting + Helm is a maintenance burden. Stay small. |
| A7  | **Lerna monorepo for a single product**              | b1ff                                         | Overkill for one product. We can split later if we ship sibling MCPs (Tempo, Compass, etc.).                                                 |
| A8  | **No test coverage target**                          | George5562, most small servers               | Our plan is 189+ tests like bitbucket-mcp; don't regress.                                                                                    |
| A9  | **Confusing / missing auth documentation**           | many small packages                          | b1ff's "Generating API Tokens" section is the gold standard. Adopt.                                                                          |
| A10 | **No `engines.node` field**                          | many                                         | Causes cryptic install failures. We pin `>=20.0.0` and ship `.nvmrc`.                                                                        |

---

## 5. Strategic Positioning for `jira-mcp`

### 5.1 One-line positioning

> A focused, **Jira-only**, **TypeScript**, npm-installable MCP server with bitbucket-mcp-grade developer ergonomics — the alternative to Atlassian's Rovo MCP that works without tenant admin OAuth gating.

### 5.2 Persona-level differentiation

| Persona                             | Pain                                                    | How `jira-mcp` solves it                                                        |
| ----------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Solo developer                      | Wants `npx jira-mcp` and three env vars and to be done. | `npx -y @tugudush/jira-mcp`, three env vars, no OAuth dance, no admin.          |
| AI agent in a corporate tenant      | Rovo MCP returns _"scopes not added"_                   | We use email + API token; works today without admin action.                     |
| Cost-conscious team                 | MCP tool calls burn tokens fast on big JQL results      | TOON by default + JMESPath filter — 30–60% token savings.                       |
| Power user                          | Hit a wall because a tool doesn't exist                 | `jira_raw(method, path, body, jq)` escape hatch in v1.1 maps to _any_ endpoint. |
| VS Code / Cursor / Claude Code user | Different config per IDE                                | One `.vscode/mcp.json` block; works in all three plus the global `~/.mcp.json`. |
| Open-source maintainer              | Doesn't want to depend on Atlassian's roadmap           | MIT, npm-installable, vendored builds available.                                |

### 5.3 What we explicitly will NOT do (and why)

- **No remote server** — local stdio MCP is the right model for our users.
- **No OAuth 2.1 (3LO) gating** — direct API token is the path of least resistance.
- **No Jira + Confluence bundle** — the user's question is specifically about Jira.
- **No Tempo / Compass / Bitbucket** — tight scope wins. (Sister projects can come later.)
- **No multi-tenant proxy** — that's a v2.0 ask for consultants.
- **No Python** — our `tugudush/*` family is TypeScript.

---

## 6. Sources

- GitHub search: `jira mcp server`, `atlassian mcp server`, `jira cloud api mcp`, `mcp-atlassian sooperset`
- npm search: [`jira-mcp`](https://www.npmjs.com/search?q=jira-mcp), [`atlassian-mcp`](https://www.npmjs.com/search?q=atlassian-mcp)
- READMEs reviewed: sooperset, atlassian, aashari, b1ff, George5562, ivelin-web
- Repos examined: `tugudush/bitbucket-mcp` (own reference), `tugudush/video-context-mcp` (own, private)

Research cutoff: 2026-06-12. Numbers will drift; revisit before any public claim of "most popular" or "leading".
