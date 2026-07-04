# GitHub Marketplace path

DriftGuard CI actions live in the public OSS repo under `.github/actions/`. This doc tracks readiness for listing on the [GitHub Marketplace](https://github.com/marketplace?type=actions).

---

## Actions to list

| Action | Marketplace name | Tier |
|--------|------------------|------|
| `drift-diff` | DriftGuard JSON Diff | Free (offline) |
| `drift-coverage-preview` | DriftGuard Coverage Preview | Free (hosted scan) |
| `drift-coverage` | DriftGuard Coverage Assert | Pro / trial gate |

Do **not** list `setup-driftguard` — internal dependency only.

**Consumer ref:**

```yaml
uses: Drift-Guard/driftguard/.github/actions/drift-coverage-preview@v0.3.3
```

---

## Readiness checklist

### Done

- [x] Public repo with composite actions and valid `action.yml` metadata
- [x] Semver tags via `.github/workflows/release.yml`
- [x] `branding` block on user-facing actions (icon + color)
- [x] Per-action README under `.github/actions/*/README.md`
- [x] One-file starter workflow: `examples/workflows/driftguard-starter.yml`
- [x] `scan-paths` input — no manual JSON build step required
- [x] Product docs: `docs/CI.md`, GitLab parity: `docs/GITLAB_CI.md`
- [x] npm + GitHub Release `.tgz` install fallback in `setup-driftguard`

### Before first Marketplace publish

- [x] **OSS-2:** Publish `@drift-guard/driftguard` — tag `v*` with `NPM_TOKEN` secret (see `.github/workflows/release.yml`) — **shipped** (`v0.3.4`)
- [ ] Create Marketplace listing from repo **Releases → Publish Action to Marketplace** (or github.com/marketplace/new)
- [ ] Listing description: hook → preview → Pro gate funnel; link to `docs/CI.md`
- [ ] Category: **Code quality** or **Monitoring**
- [x] Verify npm package `@drift-guard/driftguard` publishes on every tag (release workflow `publish-npm` job; requires `NPM_TOKEN`)
- [ ] Add Marketplace badge to README after publish
- [x] Pin all docs/examples to latest tag (`@v0.3.3`)
- [ ] Optional: verified creator / org transfer if listing under company account

### Post-launch

- [x] Action smoke in CI covers `drift-coverage-preview` with `scan-paths` (not only `drift-diff`)
- [x] Marketplace version sync with `driftguard version --json` → `ci.actionRef` — CI check in `ci.yml`

---

## Simplest add path (target UX)

**Goal:** user adds one workflow file, no custom Node scan step.

1. Copy `examples/workflows/driftguard-starter.yml` → `.github/workflows/driftguard.yml`
2. Preview runs on every PR; Step Summary shows gaps + trial secret
3. Add `DRIFTGUARD_API_KEY` secret → uncomment gate job

Marketplace listing should highlight this three-line preview step:

```yaml
- uses: actions/checkout@v4
- uses: Drift-Guard/driftguard/.github/actions/drift-coverage-preview@v0.3.3
  with:
    scan-paths: mcp.json,.cursor/mcp.json,package.json
```

---

## GitLab

Marketplace is GitHub-only. GitLab users use `npx @drift-guard/driftguard@X.Y.Z` — see [GITLAB_CI.md](./GITLAB_CI.md) and `examples/gitlab-ci.yml`.

---

## Support links for listing

- Documentation: https://github.com/Drift-Guard/driftguard/blob/main/docs/CI.md
- Pricing (Pro gate): https://driftguard.org/pricing
- Issues: https://github.com/Drift-Guard/driftguard/issues
