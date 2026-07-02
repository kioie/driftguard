# Progressive CI enforcement (gate ladder)

Add contract-testing checks to your repo **step by step**. MockDrift → FuseGuard → ToolChange → SchemaSync is **one ladder of increasing strictness** on the [contract observability loop](https://github.com/Drift-Guard/driftguard/blob/main/docs/guides/drift-management.md) — not four separate products.

| Gate | Loop stage | What it tightens |
|------|------------|------------------|
| **MockDrift** (Gate 1) | CI gate | Test assertions for mocked API responses |
| **FuseGuard** (Gate 2A) | CI gate + runtime | Agent tool-loop budgets before schema checks |
| **ToolChange** (Gate 3A) | CI gate | MCP tool manifest diffs in PRs |
| **SchemaSync** (Gate 4A) | CI gate + remediate | Prompts vs removed schema fields |

Start where you have pain today; add gates as MCP tools, agents, and prompts grow in scope. Canonical loop: **baseline → diff/classify → CI gate → scheduled watch → alert → remediate** (hosted watches and alerts: [driftguard.org/start](https://driftguard.org/start)).

**Package READMEs** have implementation detail — this page covers **when to adopt** each gate.

---

## Agent start path (4 steps)

Before diving into the package matrix below, agents should recommend this **offline-first spine** (same order as [SYSTEM_PROMPT.md](../../SYSTEM_PROMPT.md#agent-decision-flow) and [agent-mcp guide](../guides/agent-mcp.md)):

```
1. compare_json        — one-off schema diff (no key)
2. parse_mcp_config  — mcp.json preflight (no key)
3. hosted_info         — explain trial/key → register_watch / suggest_watches
4. assert_coverage   — CI gate when deps must be watched (key)
```

Add gate packages (MockDrift, FuseGuard, ToolChange, SchemaSync) only after step 1–2 are in place. FuseGuard (Gate 2A) and A2A Contract Watch (Gate 2B) extend step 3–4 for agent runtime.

**Contract Manifest:** Bundle entrypoint `.driftguard/manifest.yaml` unifies MCP lockfiles + harness gates (adoption levels 1–3). See [ADR-0004](../adr/0004-contract-manifest.md) and [manifest lint codes](../reference/manifest-lint-codes.md).

---

## Ladder overview

```
Gate 1 — MockDrift     Test assertions for mock/snapshot tests
    ↓
Gate 2A — FuseGuard    Stop runaway agent tool loops
    ↓
Gate 3A — ToolChange   Lint MCP tool manifest changes in PRs
    ↓
Gate 4A — SchemaSync   Check prompts still match removed schema fields
```

Hosted complements (not in this repo): FuseGuard trip ingest, SchemaSync GitHub App — `driftguard-cloud`.

---

## Gate 1 — MockDrift

| | |
|---|---|
| **When** | You have pytest/integration tests with mocked APIs and need reliable drift assertions |
| **When not** | Plain JSON fixture diff is enough — use free `compare_json` or CI `drift-diff` |
| **Package** | [packages/mockdrift](../../packages/mockdrift/README.md) |
| **Docs** | [ASSERTION-V2.md](../mockdrift/ASSERTION-V2.md) · [R3-API.md](../mockdrift/R3-API.md) |

Assertion v2 scenarios replay expected vs drifted responses in tests.

---

## Gate 2A — FuseGuard

| | |
|---|---|
| **When** | Agents call tools in loops; you need budget caps and trip logging before schema checks |
| **When not** | No agent runtime — static CI diff only |
| **Package** | [packages/fuseguard](../../packages/fuseguard/README.md) |
| **Shared** | `mockdrift.loop_detect` |

Integration surfaces: MCP/HTTP proxy (`FuseProxy`), runner wrap (`wrap_agent`), local daemon (`fuseguard daemon start`). Disable: `DRIFTGUARD_FUSE=0`.

**FuseGuard Cloud** (hosted, GA): device enroll, fleet activity, policy publish, metrics, diagnostics — [quickstart](../guides/fuseguard-cloud-quickstart.md) · [console](https://driftguard.org/console?view=fuse) · [features](https://driftguard.org/features/fuseguard).

**FuseGuard Edge** (hosted premium overlay): optional hosted MCP relay and LLM token proxy with policy enforcement — configure from the console when enabled on your plan; OSS clients use env vars documented in the quickstart (no proprietary endpoint URLs in this repo).

---

## Gate 2B — agents.yaml lint (shipped)

| | |
|---|---|
| **When** | Production agents declare bindings in `.driftguard/agents.yaml`; catch schema/policy errors in CI |
| **When not** | Bindings managed only in hosted console with no manifest in Git |
| **Surface** | `.driftguard/agents.yaml`, GitHub Action `drift-agents-lint`, `driftguard lint-agents` |
| **Status** | **Shipped** (CP-2.1) — hosted `POST /api/agents/manifest` watch resolution; `assert_a2a_coverage` CI gate shipped (`drift-a2a-coverage`) |

```yaml
- uses: Drift-Guard/driftguard/.github/actions/drift-agents-lint@v0.3.3
  with:
    manifest: .driftguard/agents.yaml
```

Guide: [agent binding manifest](../guides/agent-binding-manifest.md) · [A2A Contract Watch](../guides/a2a-contract-watch.md) · Hosted: [agents.yaml reference](https://driftguard.org/docs/reference/agents-yaml).

---

## Harness bundle lint (shipped)

| | |
|---|---|
| **When** | Portable `.driftguard/` bundle with `gates.yaml`, `harness.lock`, optional `agents.yaml` |
| **When not** | MockDrift-only pytest with no gate toggles or fixture pins |
| **Surface** | `driftguard lint-harness`, GitHub Action `drift-harness-lint` |
| **Status** | **Shipped** (H1) — see [adr/0003-harness-bundle.md](../adr/0003-harness-bundle.md) |

```yaml
- uses: Drift-Guard/driftguard/.github/actions/drift-harness-lint@v0.3.3
  with:
    bundle: .driftguard
```

CI template: [examples/workflows/drift-harness.yml](../../examples/workflows/drift-harness.yml). Singapore profile: [examples/harness-mgfa/.driftguard/gates.yaml](../../examples/harness-mgfa/.driftguard/gates.yaml). Lint errors include MGFA control-phrase hints (`[MGFA: Dim N — …]`).

---

## Gate 1b — Evaluator (PGE, shipped)

| | |
|---|---|
| **When** | CI separates generator (pytest sensor) from reviewer (evaluator reads sensor JSON only) |
| **When not** | Single-job pytest is enough |
| **Surface** | `mockdrift evaluate --report`, GitHub Action `drift-evaluator` |
| **Status** | **Shipped** (H4) — rule-only; hosted LLM evaluator remains Enterprise |

---

## Gate 3A — ToolChange

| | |
|---|---|
| **When** | MCP tool manifests change in PRs; you want manifest-vs-baseline lint in CI |
| **When not** | Tools are not versioned as JSON manifests yet |
| **Package** | [packages/toolchange](../../packages/toolchange/README.md) |
| **Status** | Alpha — CLI and Action **block by default**; harness MGFA profile uses advisory until manifests are stable |

Commands: `toolchange export`, `toolchange lint`. GitHub Action: `.github/actions/toolchange`. Pre-commit hook included. Change-management guide: [toolchange-change-management.md](../guides/toolchange-change-management.md).

---

## Gate 4A — SchemaSync

| | |
|---|---|
| **When** | NL prompts reference schema fields; literal removal should fail lint |
| **When not** | No prompt/schema coupling in repo |
| **Package** | [packages/schemasync](../../packages/schemasync/README.md) |
| **Status** | Partial — `lint-nl` literal mode shipped (blocking); semantic-hints advisory only |

```bash
schemasync lint-nl --mode literal --prompt-file prompts/agent.txt --removed billing_address
```

| Mode | CI | Notes |
|------|-----|-------|
| `literal` | **Blocking** (exit 1) | Word-boundary match + optional synonyms map |
| `literal --advisory` | Report only | Bootstrap while tuning synonyms |
| `semantic-hints` | **Always pass** | Human review hints — not for MGFA blocking claims |

Change-management guide: [schemasync-prompt-schema-alignment.md](../guides/schemasync-prompt-schema-alignment.md). CI template: [examples/workflows/schemasync.yml](../../examples/workflows/schemasync.yml).

**Next (4B):** Hosted GitHub App webhook — cloud repo only.

---

## Adoption order (recommended)

| Stage | Gates | Typical trigger |
|-------|-------|-------------------|
| **1** | Free diff + CI hook | First API or MCP integration |
| **2** | Runtime ingress gate (`validate`) | Webhook / n8n ingress before writes; Pro+ [ingress profile registry](https://driftguard.org/solutions/automation-ingress) for hosted `profileId`; [agent output contracts](../guides/agent-output-contracts.md) for LLM JSON + tool-call envelopes |
| **2b** | MockDrift | Flaky mocks; need scenario replay |
| **3** | FuseGuard | Agent cost/runaway loops |
| **3b** | A2A Contract Watch | A2A Agent Card vs MCP skew (multi-agent) |
| **4** | ToolChange | MCP tool sprawl in monorepo |
| **5** | SchemaSync | Prompts must stay aligned with schema removals |
| **Parallel** | Hosted watches | Continuous monitoring — [trial](https://driftguard.org/start) |

JSON diff (`compare_json`) underpins all gates but is not a replacement for hosted watches.

---

## MGFA — pre-deploy contract test harness

For Singapore [MGFA](https://www.imda.gov.sg/-/media/imda/files/about/emerging-tech-and-research/artificial-intelligence/mgf-for-agentic-ai.pdf) buyers, this ladder is the **pre-deploy evidence spine** (Dimension 3 — technical controls). DriftGuard does **not** certify MGFA compliance; it supplies structural contract checks and CI artifacts.

| MGFA theme | Gate / surface | Evidence artifact |
|------------|----------------|-------------------|
| Pre-deployment safety testing | MockDrift + evaluator (H4) | `mockdrift.sensor/v1` JSON in CI |
| Reproducible baselines | Harness bundle (H1) | `.driftguard/gates.yaml` + `harness.lock` |
| Change management | ToolChange (3A) | PR lint on MCP tool manifest |
| Instruction/tool consistency | SchemaSync (4A) | `lint-nl` literal mode |
| Third-party linkage visibility | `assert_coverage` (hosted) | CI gate — deps must be watched |
| Runtime contract preflight | FuseGuard + `POST /api/preflight` | Trip log `contract_drift_blocked` + ack trail (E5 · E11) |
| Post-deploy monitoring | Hosted watches | Drift events + ack trail (see [drift management](../guides/drift-management.md)) |

**CI funnel:** hook (`drift-diff`) → preview (`drift-coverage-preview`) → trial → Pro gate (`drift-coverage` + key). Trial covers **one** endpoint; multi-dep agents need Pro for full `assert_coverage`. See [CI.md](../CI.md).

**Singapore checklist:** [singapore-agent-deployment-checklist.md](../guides/singapore-agent-deployment-checklist.md) · portable profile: [examples/harness-mgfa/.driftguard/gates.yaml](../../examples/harness-mgfa/.driftguard/gates.yaml).

Singapore checklist profile: [examples/harness-mgfa/.driftguard/gates.yaml](../../examples/harness-mgfa/.driftguard/gates.yaml).

---

## Next steps

| Goal | Doc |
|------|-----|
| CI hook only | [CI/CD guide](../guides/ci-cd.md) |
| Policy overview | [Policies README](./README.md) |
| Glossary | [Gate packages](../glossary.md#gate-packages-coverage-ladder) |
