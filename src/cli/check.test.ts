import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { VERSION } from "../mcp/constants.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const checkEntry = path.join(repoRoot, "src/cli/check.ts");

function runCheck(...cliArgs: string[]) {
  return spawnSync(process.execPath, ["--import", "tsx", checkEntry, ...cliArgs], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
}

describe("check.ts CLI routing", () => {
  it("routes version to plain output", () => {
    const result = runCheck("version");
    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), VERSION);
  });

  it("routes version --json to JSON output", () => {
    const result = runCheck("version", "--json");
    assert.equal(result.status, 0);
    const payload = JSON.parse(result.stdout) as { version: string; client: string };
    assert.equal(payload.version, VERSION);
    assert.equal(payload.client, "driftguard");
  });

  it("routes diff with no breaking changes to exit 0", () => {
    const payload = JSON.stringify({ a: 1 });
    const result = runCheck("diff", payload, payload);
    assert.equal(result.status, 0);
    const diff = JSON.parse(result.stdout) as { breakingCount: number };
    assert.equal(diff.breakingCount, 0);
  });

  it("routes diff with breaking changes to exit 1", () => {
    const before = JSON.stringify({ a: 1, b: 2 });
    const after = JSON.stringify({ a: 1 });
    const result = runCheck("diff", before, after);
    assert.equal(result.status, 1);
    const diff = JSON.parse(result.stdout) as { breakingCount: number };
    assert.ok(diff.breakingCount >= 1);
  });

  it("prints usage when command is missing", () => {
    const result = runCheck();
    assert.equal(result.status, 0);
    assert.match(result.stdout, /DriftGuard/);
    assert.match(result.stdout, /driftguard diff/);
  });

  it("exits non-zero for an unknown command", () => {
    const result = runCheck("not-a-command");
    assert.equal(result.status, 2);
    assert.match(result.stderr, /unknown command/);
  });

  it("routes lint-agents on example manifest to exit 0", () => {
    const result = runCheck("lint-agents", "examples/a2a/agents.yaml");
    assert.equal(result.status, 0);
    assert.match(result.stdout, /OK\s+examples\/a2a\/agents.yaml/);
  });

  it("routes lint-harness on example bundle to exit 0", () => {
    const result = runCheck("lint-harness", "examples/harness/.driftguard");
    assert.equal(result.status, 0);
    assert.match(result.stdout, /OK\s+examples\/harness\/\.driftguard/);
  });

  it("routes assert-a2a-coverage without credentials to exit 1", () => {
    const result = spawnSync(process.execPath, ["--import", "tsx", checkEntry, "assert-a2a-coverage"], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        NO_COLOR: "1",
        DRIFTGUARD_API_KEY: "",
      },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /DRIFTGUARD_API_KEY/);
    assert.match(result.stderr, /\/start/);
    assert.match(result.stderr, /\/pricing/);
  });

  it("routes assert-coverage without credentials to exit 1", () => {
    const result = spawnSync(process.execPath, ["--import", "tsx", checkEntry, "assert-coverage"], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        NO_COLOR: "1",
        DRIFTGUARD_FILES_JSON: "[]",
        DRIFTGUARD_API_KEY: "",
        DRIFTGUARD_TRIAL_SESSION: "",
      },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /DRIFTGUARD_API_KEY/);
    assert.match(result.stderr, /\/start/);
    assert.match(result.stderr, /\/pricing/);
  });

  it("CLI-RT-001: driftguard lock --help", () => {
    const result = runCheck("lock", "--help");
    assert.equal(result.status, 0);
    assert.match(result.stdout, /driftguard lock/);
    assert.match(result.stdout, /--url/);
  });

  it("CLI-RT-002: lock unknown flag → exit 2", () => {
    const result = runCheck("lock", "--not-a-flag");
    assert.equal(result.status, 2);
  });

  it("prints help for --help and exits 0", () => {
    const result = runCheck("--help");
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Usage:/);
    assert.match(result.stdout, /driftguard diff/);
  });

  it("prints help for -h and exits 0", () => {
    const result = runCheck("-h");
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Usage:/);
  });

  it("prints help for help subcommand and exits 0", () => {
    const result = runCheck("help");
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Usage:/);
  });

  it("prints help with no args and exits 0", () => {
    const result = runCheck();
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Usage:/);
  });

  it("routes --version to version output", () => {
    const result = runCheck("--version");
    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), VERSION);
  });

  it("routes -v to version output", () => {
    const result = runCheck("-v");
    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), VERSION);
  });

  it("exits 2 with error on unknown command", () => {
    const result = runCheck("not-a-real-command");
    assert.equal(result.status, 2);
    assert.match(result.stderr, /unknown command 'not-a-real-command'/);
    assert.match(result.stderr, /--help/);
  });
});
