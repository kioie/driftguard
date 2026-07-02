import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLockServer,
  buildLockfile,
  listMcpJsonHttpServers,
  LockfileError,
  normalizeLockTools,
  parseLockfile,
  serializeLockfile,
} from "../dist/lockfile.js";

describe("lockfile normalizer", () => {
  it("MCP-LOCK-002: tools sorted by name", () => {
    const server = buildLockServer({
      name: "stripe",
      url: "https://mcp.example.com/mcp",
      tools: [
        { name: "z_tool", inputSchema: { type: "object" } },
        { name: "a_tool", inputSchema: { type: "object" } },
      ],
    });
    assert.deepEqual(server.tools.map((t) => t.name), ["a_tool", "z_tool"]);
  });

  it("MCP-LOCK-003: multi-server mcp.json merge", () => {
    const servers = listMcpJsonHttpServers({
      mcpServers: {
        stripe: { url: "https://mcp.stripe.com/mcp" },
        github: { url: "https://api.githubcopilot.com/mcp/" },
        local: { command: "node", args: ["server.js"] },
      },
    });
    assert.equal(servers.length, 2);
    assert.deepEqual(
      servers.map((s) => s.name),
      ["github", "stripe"],
    );
  });

  it("MCP-LOCK-004: rejects malformed tool entries", () => {
    assert.throws(() => normalizeLockTools([{ description: "no name" }]), LockfileError);
    assert.throws(() => normalizeLockTools(["bad"]), LockfileError);
  });

  it("serializeLockfile normalizes nested schema key order", () => {
    const lockfile = buildLockfile([
      buildLockServer({
        name: "demo",
        url: "https://mcp.example.com/mcp",
        tools: [
          {
            name: "search",
            inputSchema: { type: "object", properties: { z: { type: "string" }, a: { type: "string" } } },
          },
        ],
      }),
    ]);
    const text = serializeLockfile(lockfile);
    const parsed = parseLockfile(JSON.parse(text));
    const schema = parsed.servers[0]?.tools[0]?.inputSchema as { properties?: Record<string, unknown> };
    assert.deepEqual(Object.keys(schema.properties ?? {}), ["a", "z"]);
  });

  it("LOCK-PUB-001: round-trips publisher metadata", () => {
    const lockfile = buildLockfile(
      [
        buildLockServer({
          name: "demo",
          url: "https://mcp.example.com/mcp",
          tools: [{ name: "search", inputSchema: { type: "object" } }],
        }),
      ],
      {
        publisher: {
          monitoringUrl: "https://driftguard.org/api/watches/w1/status",
          compatibilityReceiptUrl: "https://driftguard.org/api/drift/events/e1/receipt",
        },
      },
    );
    const parsed = parseLockfile(JSON.parse(serializeLockfile(lockfile)));
    assert.equal(parsed.publisher?.monitoringUrl, "https://driftguard.org/api/watches/w1/status");
    assert.equal(
      parsed.publisher?.compatibilityReceiptUrl,
      "https://driftguard.org/api/drift/events/e1/receipt",
    );
  });
});
