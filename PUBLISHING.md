# Publishing `@tugudush/jira-mcp` to npm

A step-by-step release runbook for maintainers. Designed so a single
release-capable contributor can ship v1.x.y in ~30 minutes with no surprises.

---

## 0. One-time setup (per maintainer)

1. **npm account** — create at <https://www.npmjs.com/signup>.
2. **npm login** — `npm login` (interactive, prompts for username + password +
   email + 2FA OTP if enabled).
3. **2FA enabled** — `npm profile enable-2fa auth-and-writes` is **required** for
   publish. Without it, `npm publish` will refuse.
4. **Membership in `@tugudush`** — request access from the org owner. The package
   lives under the `@tugudush` scope; you must be a maintainer of that scope to
   publish `@tugudush/jira-mcp`.
5. **GitHub PAT with `repo` + `workflow`** — needed for `git push` and for
   triggering the publish workflow (if using one). Not needed for the manual
   flow described below.

---

## 1. Pre-release gate

Before tagging a release, the local tree must pass the **full local gate**:

```bash
npm run ltfb   # lint → type-check → format → build
npm test       # 96+ tests passing on Node 20 + 22
```

If either fails, **do not tag**. Fix and re-run.

Optional but recommended:

```bash
npm run test:coverage   # confirm v8 coverage is reasonable
```

## 2. Verify the build artifacts

```bash
ls -la dist/                  # should be current, with .js + .d.ts + .map
node dist/index.js --help 2>&1 | head -20   # should boot without error
```

Or use the stdio smoke driver against a sandbox tenant (see
[`scripts/phase5-smoke.ts`](scripts/phase5-smoke.ts)).

## 3. Update the version

Use `npm version` — this updates `package.json`, creates a git tag, and
respects any pre-commit hooks you have set up:

```bash
npm version patch   # 1.0.0 → 1.0.1
npm version minor   # 1.0.0 → 1.1.0
npm version major   # 1.0.0 → 2.0.0
```

Or explicit:

```bash
npm version 1.1.0
```

The commit message `chore(release): v1.x.y` is created automatically.

## 4. Push the tag

```bash
git push origin main --follow-tags
```

## 5. Publish to npm

```bash
npm publish --access public
```

For a `@scope/package` with `access: 'public'` configured in `package.json`,
`--access public` is implicit but harmless.

If you have a **local-registry smoke test** to do first:

```bash
npm pack                       # creates tugudush-jira-mcp-1.0.0.tgz
npm install ./tugudush-jira-mcp-1.0.0.tgz -g   # global smoke test
jira-mcp                       # should boot, read env, wait for stdio
```

Then uninstall and publish:

```bash
npm uninstall -g @tugudush/jira-mcp
npm publish --access public
```

## 6. Verify the published package

```bash
npm view @tugudush/jira-mcp
npm view @tugudush/jira-mcp versions --json
```

Then in a clean shell:

```bash
npx -y @tugudush/jira-mcp
# or
npm install -g @tugudush/jira-mcp && jira-mcp
```

Both should boot cleanly and present the 36 tools via MCP's `tools/list`.

## 7. GitHub release notes

After the npm publish succeeds, create a GitHub release:

1. Open <https://github.com/tugudush/jira-mcp/releases/new>
2. Choose the tag you just pushed (`v1.x.y`).
3. **Release title:** `v1.x.y — <one-line summary>`
4. **Body:** use the [Keep a Changelog](https://keepachangelog.com/) format. The
   easy path is to copy the new top section from [`CHANGELOG.md`](CHANGELOG.md)
   and paste it verbatim. Add any upgrade notes, security notes, or known
   issues.
5. Tick **"Set as the latest release"**.
6. Publish.

## 8. Post-release housekeeping

- [ ] Confirm the npm package page renders README correctly:
      `https://www.npmjs.com/package/@tugudush/jira-mcp`
- [ ] Confirm the README badge (if added — see [UX5 below]) resolves to a 200
- [ ] Check the **MseeP security assessment badge** (UX5 — planned but optional
      for v1.0.0). Register at <https://mseep.ai> if not done yet, then add the
      badge to `README.md`:

  ```markdown
  [![MseeP.ai Security Assessment](https://mseep.ai/badge.svg)](https://mseep.ai/app/tugudush/jira-mcp)
  ```

- [ ] Update the v1.0.0 entry in [`docs/plan.md`](docs/plan.md) — flip the
      top-of-file **Status** banner from "🚧 In development" to "✅ Released" and
      append a Phase 6 Progress Log entry summarising the release commit hash.

---

## Rollback / yanking a bad release

npm does not let you delete a version < 24h old silently. If you ship a broken
release:

```bash
npm unpublish @tugudush/jira-mcp@1.0.1 --force   # within 72h, npm allows this
# or, for any version:
npm deprecate @tugudush/jira-mcp@1.0.1 "broken, use 1.0.2 instead"
```

**Prefer deprecate over unpublish** — unpublishing breaks every consumer on that
version and is heavily discouraged. Always deprecate + publish a fixed version.

---

## Dry-run reference (no actual publish)

If you want to verify the package contents without publishing:

```bash
npm pack --dry-run   # lists what would be in the tarball
npm pack             # creates tugudush-jira-mcp-1.0.0.tgz
tar -tzf tugudush-jira-mcp-1.0.0.tgz | head -30   # inspect contents
```

You should see:

- `package/dist/index.js`
- `package/dist/index.d.ts`
- `package/dist/**/*.js` + matching `.d.ts` + source maps
- `package/package.json`
- `package/README.md`
- `package/LICENSE`

…and **nothing else** (no `src/`, `tests/`, `scripts/`, `.github/`, `docs/`,
`.husky/`, configs, `.env*`, IDE files — per [`.npmignore`](.npmignore)).
