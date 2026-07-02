import type { JsonSchema } from "./types.js";
import { stableStringify, type McpToolSnapshot } from "./mcp.js";

export class LockfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LockfileError";
  }
}

export const LOCKFILE_VERSION = 1 as const;
export const DEFAULT_LOCKFILE_PATH = "driftguard-lock.json";
export const LOCKFILE_GENERATOR = "@drift-guard/driftguard";

export interface McpLockTool {
  name: string;
  description?: string;
  inputSchema?: JsonSchema;
}

export interface McpLockServer {
  name: string;
  transport: "streamable-http";
  url: string;
  tools: McpLockTool[];
}

export interface McpLockfilePublisher {
  monitoringUrl?: string;
  compatibilityReceiptUrl?: string;
}

export interface McpLockfileV1 {
  lockfileVersion: typeof LOCKFILE_VERSION;
  generator: string;
  generatedAt: string;
  servers: McpLockServer[];
  publisher?: McpLockfilePublisher;
}

function slugServerName(key: string): string {
  let slug = "";
  let pendingDash = false;
  for (const ch of key.toLowerCase()) {
    const isAlnum = (ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9");
    if (isAlnum) {
      slug += ch;
      pendingDash = false;
    } else if (slug.length > 0 && !pendingDash) {
      slug += "-";
      pendingDash = true;
    }
  }
  while (slug.startsWith("-")) slug = slug.slice(1);
  while (slug.endsWith("-")) slug = slug.slice(0, -1);
  return slug.slice(0, 80);
}

function normalizeSchema(schema: unknown): JsonSchema | undefined {
  if (schema === undefined || schema === null) return undefined;
  if (typeof schema !== "object") {
    throw new LockfileError("tool inputSchema must be an object");
  }
  return JSON.parse(stableStringify(schema)) as JsonSchema;
}

export function normalizeLockTool(raw: unknown): McpLockTool {
  if (!raw || typeof raw !== "object") {
    throw new LockfileError("malformed tool entry");
  }
  const tool = raw as Record<string, unknown>;
  const name = typeof tool.name === "string" ? tool.name.trim() : "";
  if (!name) {
    throw new LockfileError("tool missing name");
  }
  const description = typeof tool.description === "string" ? tool.description : undefined;
  const schemaRaw = tool.inputSchema ?? tool.input_schema;
  const inputSchema = schemaRaw !== undefined ? normalizeSchema(schemaRaw) : undefined;
  return { name, ...(description !== undefined ? { description } : {}), ...(inputSchema ? { inputSchema } : {}) };
}

export function normalizeLockTools(tools: unknown[]): McpLockTool[] {
  if (!Array.isArray(tools)) {
    throw new LockfileError("tools must be an array");
  }
  return tools.map(normalizeLockTool).sort((a, b) => a.name.localeCompare(b.name));
}

export function toolsFromProbe(tools: McpToolSnapshot[]): McpLockTool[] {
  return normalizeLockTools(
    tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  );
}

export function listMcpJsonHttpServers(mcpJson: unknown): Array<{ name: string; url: string }> {
  if (!mcpJson || typeof mcpJson !== "object") {
    throw new LockfileError("mcp.json must be an object");
  }
  const root = mcpJson as Record<string, unknown>;
  const servers =
    (root.mcpServers as Record<string, { url?: string }> | undefined) ??
    (root.servers as Record<string, { url?: string }> | undefined);
  if (!servers || typeof servers !== "object") {
    throw new LockfileError("mcp.json missing mcpServers");
  }

  const out: Array<{ name: string; url: string }> = [];
  for (const [key, cfg] of Object.entries(servers)) {
    if (!cfg || typeof cfg !== "object") continue;
    const url = typeof cfg.url === "string" ? cfg.url.trim() : "";
    if (!url.startsWith("http")) continue;
    out.push({ name: slugServerName(key) || "mcp-server", url });
  }
  if (!out.length) {
    throw new LockfileError("mcp.json has no HTTP MCP servers with url");
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export function buildLockServer(input: {
  name: string;
  url: string;
  tools: unknown[];
}): McpLockServer {
  const url = input.url.trim();
  if (!url.startsWith("http")) {
    throw new LockfileError(`server '${input.name}' url must be http(s)`);
  }
  return {
    name: input.name,
    transport: "streamable-http",
    url,
    tools: normalizeLockTools(input.tools),
  };
}

function normalizePublisher(raw: unknown): McpLockfilePublisher | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const doc = raw as Record<string, unknown>;
  const publisher: McpLockfilePublisher = {};
  if (typeof doc.monitoringUrl === "string" && doc.monitoringUrl.trim()) {
    publisher.monitoringUrl = doc.monitoringUrl.trim();
  }
  if (typeof doc.compatibilityReceiptUrl === "string" && doc.compatibilityReceiptUrl.trim()) {
    publisher.compatibilityReceiptUrl = doc.compatibilityReceiptUrl.trim();
  }
  return Object.keys(publisher).length ? publisher : undefined;
}

export function buildLockfile(
  servers: McpLockServer[],
  opts?: { generator?: string; generatedAt?: string; publisher?: McpLockfilePublisher },
): McpLockfileV1 {
  if (!servers.length) {
    throw new LockfileError("lockfile requires at least one server");
  }
  const lockfile: McpLockfileV1 = {
    lockfileVersion: LOCKFILE_VERSION,
    generator: opts?.generator ?? LOCKFILE_GENERATOR,
    generatedAt: opts?.generatedAt ?? new Date().toISOString(),
    servers: servers
      .map((server) => ({
        ...server,
        url: server.url.trim(),
        tools: normalizeLockTools(server.tools),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
  if (opts?.publisher) lockfile.publisher = opts.publisher;
  return lockfile;
}

export function parseLockfile(raw: unknown): McpLockfileV1 {
  if (!raw || typeof raw !== "object") {
    throw new LockfileError("lockfile must be a JSON object");
  }
  const doc = raw as Record<string, unknown>;
  if (doc.lockfileVersion !== LOCKFILE_VERSION) {
    throw new LockfileError(`unsupported lockfileVersion (expected ${LOCKFILE_VERSION})`);
  }
  if (!Array.isArray(doc.servers) || !doc.servers.length) {
    throw new LockfileError("lockfile missing servers");
  }
  const servers = doc.servers.map((server, index) => {
    if (!server || typeof server !== "object") {
      throw new LockfileError(`server[${index}] is malformed`);
    }
    const entry = server as Record<string, unknown>;
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    const url = typeof entry.url === "string" ? entry.url.trim() : "";
    if (!name || !url) {
      throw new LockfileError(`server[${index}] missing name or url`);
    }
    if (entry.transport !== "streamable-http") {
      throw new LockfileError(`server '${name}' must use streamable-http transport`);
    }
    return buildLockServer({
      name,
      url,
      tools: Array.isArray(entry.tools) ? entry.tools : [],
    });
  });
  return {
    ...buildLockfile(servers, {
      generator: typeof doc.generator === "string" ? doc.generator : LOCKFILE_GENERATOR,
      generatedAt: typeof doc.generatedAt === "string" ? doc.generatedAt : new Date(0).toISOString(),
      publisher: normalizePublisher(doc.publisher),
    }),
  };
}

export function serializeLockfile(lockfile: McpLockfileV1): string {
  const normalized = buildLockfile(lockfile.servers, {
    generator: lockfile.generator,
    generatedAt: lockfile.generatedAt,
    publisher: lockfile.publisher,
  });
  return `${JSON.stringify(normalized, null, 2)}\n`;
}
