#!/usr/bin/env node
import { HOSTED_PRICING, HOSTED_TRIAL } from "../mcp/constants.js";
import { readHostedApiKey } from "../mcp/env-secrets.js";
import { parseJsonString } from "../mcp/tool-input.js";

const [,, command, ...args] = process.argv;

async function readFilesJson(): Promise<string> {
  const { readFilesJsonForCi } = await import("./ci-files.js");
  return readFilesJsonForCi(args[0]);
}

const KNOWN_COMMANDS = new Set([
  "diff", "coverage-preview", "assert-coverage", "assert-a2a-coverage",
  "validate", "openapi-diff", "openapi-changelog", "login", "init",
  "lint-agents", "lint-harness", "doctor", "adopt", "manifest", "lock",
  "check", "version", "mcp",
]);

function printHelp(): void {
  console.log(`DriftGuard — open-source local schema diff + MCP client

Usage:
  driftguard diff '<before-json>' '<after-json>'          Free — JSON schema diff
  driftguard openapi-diff base.yaml target.yaml [--remote]   Remote save + local diff
  driftguard openapi-changelog base.yaml target.yaml       Release notes from OpenAPI diff
  driftguard login --api-key dg_…                          Verify hosted API key
  driftguard init [--yes]                                  Write .driftguard.yml
  driftguard adopt [--level 1|2|3] [--dry-run]               Bootstrap Contract Manifest (.driftguard/)
  driftguard doctor [bundleDir] [--json] [--check-hosted]    Manifest health scorecard
  driftguard manifest lockfile-path                          Print lockfile path from manifest
  driftguard manifest export --format lockfile-patch         Apply webhook lockfile patch (CM6)
  driftguard coverage-preview                              Free — scan repo + console links
  driftguard assert-coverage                               Gate — Pro key or trial (1 endpoint)
  driftguard assert-a2a-coverage [path]                    Gate — manifest watches registered (Pro key)
  driftguard lint-agents [path]                            Validate .driftguard/agents.yaml (offline)
  driftguard lock [--url URL | --config mcp.json]          Snapshot MCP tools/list to driftguard-lock.json
  driftguard check [--lock driftguard-lock.json]           Diff live MCP catalog vs lockfile (offline)
  driftguard validate --profile p.json --payload e.json   Free — ingress payload gate
  driftguard version [--json]
  driftguard mcp

Global flags:
  -h, --help       Show this help
  -v, --version    Print version and exit

CI funnel: https://github.com/Drift-Guard/driftguard/blob/main/docs/CI.md
Trial: ${HOSTED_TRIAL}
Pricing: ${HOSTED_PRICING}
`);
}

async function main(): Promise<void> {
  if (command === undefined || command === "--help" || command === "-h" || command === "help") {
    printHelp();
    return;
  }

  if (command === "--version" || command === "-v") {
    const { printVersionPlain } = await import("./version.js");
    printVersionPlain();
    return;
  }

  if (command === "diff") {
    const { diffSchemas, inferSchema } = await import("../core/diff.js");
    const beforeResult = parseJsonString(args[0], "before JSON");
    const afterResult = parseJsonString(args[1], "after JSON");
    if (!beforeResult.ok) {
      console.error(beforeResult.error);
      process.exit(1);
    }
    if (!afterResult.ok) {
      console.error(afterResult.error);
      process.exit(1);
    }
    const result = diffSchemas(inferSchema(beforeResult.value), inferSchema(afterResult.value));
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.breakingCount > 0 ? 1 : 0);
  }

  if (command === "coverage-preview") {
    let raw: string;
    try {
      raw = await readFilesJson();
    } catch (err) {
      console.error(String(err));
      console.error("Usage: driftguard coverage-preview  (set DRIFTGUARD_FILES_JSON or DRIFTGUARD_SCAN_PATHS)");
      process.exit(1);
    }
    const { runCoveragePreview } = await import("./coverage-run.js");
    const code = await runCoveragePreview({
      filesJson: raw,
      failOnMissing: process.env.DRIFTGUARD_FAIL_ON_MISSING === "1",
    });
    process.exit(code);
  }

  if (command === "assert-coverage") {
    let raw: string;
    try {
      raw = await readFilesJson();
    } catch (err) {
      console.error(String(err));
      process.exit(1);
    }
    const apiKey = readHostedApiKey();
    const trialSession = process.env.DRIFTGUARD_TRIAL_SESSION;
    if (!apiKey && !trialSession) {
      console.error(`CI gate requires DRIFTGUARD_API_KEY (Pro) or DRIFTGUARD_TRIAL_SESSION (1 endpoint trial).`);
      console.error(`Free hook: driftguard coverage-preview — Start a trial: ${HOSTED_TRIAL} · Pricing: ${HOSTED_PRICING}`);
      process.exit(1);
    }
    const { runAssertCoverage } = await import("./coverage-run.js");
    const code = await runAssertCoverage({ filesJson: raw, apiKey, trialSession });
    process.exit(code);
  }

  if (command === "assert-a2a-coverage") {
    const apiKey = readHostedApiKey();
    if (!apiKey) {
      console.error(`A2A coverage gate requires DRIFTGUARD_API_KEY (Pro/Team).`);
      console.error(`Offline first: driftguard lint-agents — Start a trial: ${HOSTED_TRIAL} · Pricing: ${HOSTED_PRICING}`);
      process.exit(1);
    }
    const { runAssertA2aCoverage } = await import("./a2a-coverage-run.js");
    const code = await runAssertA2aCoverage({ manifestPath: args[0], apiKey });
    process.exit(code);
  }

  if (command === "validate") {
    const { runValidate } = await import("./validate-run.js");
    process.exit(await runValidate(args));
  }

  if (command === "openapi-diff") {
    const { runOpenApiDiff } = await import("./openapi-diff-run.js");
    process.exit(await runOpenApiDiff(args));
  }

  if (command === "login") {
    const { runLogin } = await import("./login-run.js");
    process.exit(await runLogin(args));
  }

  if (command === "init") {
    const { runInit } = await import("./init-run.js");
    process.exit(runInit(args));
  }

  if (command === "openapi-changelog") {
    const { runOpenApiChangelog } = await import("./openapi-changelog-run.js");
    process.exit(runOpenApiChangelog(args));
  }

  if (command === "lint-agents") {
    const { runAgentsLint } = await import("./agents-lint-run.js");
    process.exit(runAgentsLint(args));
  }

  if (command === "lint-harness") {
    const { runHarnessLint } = await import("./harness-lint-run.js");
    process.exit(runHarnessLint(args));
  }

  if (command === "doctor") {
    const { runDoctor } = await import("./doctor-run.js");
    process.exit(await runDoctor(args));
  }

  if (command === "adopt") {
    const { runAdopt } = await import("./adopt-run.js");
    process.exit(await runAdopt(args));
  }

  if (command === "manifest") {
    const sub = args[0];
    if (sub === "lockfile-path") {
      const { runManifestLockfilePath } = await import("./manifest-lockfile-path-run.js");
      process.exit(runManifestLockfilePath(args.slice(1)));
    }
    if (sub === "export") {
      const { runManifestExport } = await import("./manifest-export-run.js");
      process.exit(runManifestExport(args.slice(1)));
    }
    console.error("Usage: driftguard manifest lockfile-path | manifest export --format lockfile-patch");
    process.exit(2);
  }

  if (command === "lock") {
    const { runLock } = await import("./lock-run.js");
    process.exit(await runLock(args));
  }

  if (command === "check") {
    const { runCheckLock } = await import("./check-lock-run.js");
    process.exit(await runCheckLock(args));
  }

  if (command === "version") {
    const { printVersionJson, printVersionPlain } = await import("./version.js");
    if (args[0] === "--json") printVersionJson();
    else printVersionPlain();
    return;
  }

  if (command === "mcp") {
    const { startMcpServer } = await import("../mcp/server.js");
    await startMcpServer();
    return;
  }

  if (!KNOWN_COMMANDS.has(command)) {
    console.error(`driftguard: unknown command '${command}'`);
    console.error(`Run 'driftguard --help' for usage.`);
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// trigger codeql
