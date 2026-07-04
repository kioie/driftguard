# GitHub Marketplace listing copy (DIST-001)

Paste-ready text for **Releases → Publish Action to Marketplace** (or [github.com/marketplace/new](https://github.com/marketplace/new)). Each user-facing action gets its own listing; reuse the funnel paragraph and link to [docs/CI.md](../CI.md).

**Suggested category:** Code quality (primary) or Monitoring.

---

## Shared funnel paragraph (all three actions)

DriftGuard helps teams catch **MCP and API contract drift** before agents and CI break in production.

1. **Hook (free, offline)** — `drift-diff` fails the job on breaking JSON schema changes with no API key.
2. **Preview (free, hosted scan)** — `drift-coverage-preview` scans `mcp.json`, OpenAPI refs, and package manifests on every PR and prints unmonitored endpoints in the Step Summary.
3. **Pro gate (trial or API key)** — `drift-coverage` enforces coverage thresholds when you add `DRIFTGUARD_API_KEY`.

Copy [examples/workflows/driftguard-starter.yml](../../examples/workflows/driftguard-starter.yml) for a one-file starter workflow. Full guide: [docs/CI.md](../CI.md) · Pricing: [driftguard.org/pricing](https://driftguard.org/pricing)

---

## DriftGuard JSON Diff (`drift-diff`)

**Short description:** Fail CI on breaking JSON schema changes — offline, no API key.

**Detailed description:**

Compare two JSON payloads (fixtures, MCP tool catalogs, OpenAPI fragments) and exit non-zero when DriftGuard detects **breaking** structural changes. Runs entirely in your runner — no network, no account required.

Ideal for PR gates on MCP `tools/list` snapshots, config baselines, and API contract fixtures.

**Documentation:** https://github.com/Drift-Guard/driftguard/blob/main/docs/CI.md

---

## DriftGuard Coverage Preview (`drift-coverage-preview`)

**Short description:** Free PR scan — discover unmonitored MCP/API endpoints and print upgrade links.

**Detailed description:**

Scans repository paths (`mcp.json`, `.cursor/mcp.json`, `package.json`, OpenAPI URLs) and reports endpoints that are not yet covered by a DriftGuard watch. Non-blocking by default (hook mode); optional `fail-on-missing` for stricter teams.

Step Summary shows gaps plus a link to start a hosted trial when you are ready for continuous monitoring.

**Documentation:** https://github.com/Drift-Guard/driftguard/blob/main/docs/CI.md

---

## DriftGuard Coverage Assert (`drift-coverage`)

**Short description:** Enforce MCP/API contract coverage in CI — requires DriftGuard Pro or trial API key.

**Detailed description:**

Same scan as Coverage Preview, but **fails the job** when unmonitored endpoints remain. Add `DRIFTGUARD_API_KEY` as a repository secret (trial or Pro). Pairs with hosted watches for always-on MCP `tools/list` polling and drift alerts.

**Documentation:** https://github.com/Drift-Guard/driftguard/blob/main/docs/CI.md · **Pricing:** https://driftguard.org/pricing

---

## README badge (after publish)

Replace `{action}` with the Marketplace slug GitHub assigns (often matches the folder name):

```markdown
[![DriftGuard Coverage Preview](https://img.shields.io/badge/marketplace-DriftGuard%20Coverage%20Preview-007ec6?logo=github)](https://github.com/marketplace/actions/drift-coverage-preview)
```

Add near the CI section in [README.md](../../README.md) once the listing is live.

---

## Manual steps (cannot automate)

- [ ] Create listing from repo **Releases → Publish Action to Marketplace**
- [ ] Pick category **Code quality** or **Monitoring**
- [ ] Optional: verified creator / org transfer under company account

Track status in [GITHUB_MARKETPLACE.md](../GITHUB_MARKETPLACE.md).
