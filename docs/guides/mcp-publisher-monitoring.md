# MCP publisher monitoring

Ship contract trust signals with your MCP server so downstream agent teams can verify catalog health without private credentials.

## Who this is for

You operate an MCP server consumed by external agents or customers. You want a **public status badge** and lockfile metadata — not payment rails or marketplace settlement.

## Checklist

1. **Commit a DriftGuard lockfile** in your repo (`driftguard-lock.json` or path in your contract manifest).
2. **Run MCP conformance in CI** — `driftguard lock verify` against your pinned catalog (see [MCP lockfile workstream](https://github.com/Drift-Guard/driftguard/blob/main/docs/guides/agent-mcp.md)).
3. **Register a hosted watch** on your own MCP endpoint (same URL you ship in `mcp.json`).
4. **Enable public status** so buyers can poll `GET /api/watches/{id}/status` without your API key.
5. **Add publisher metadata** to the lockfile:

```json
{
  "lockfileVersion": 1,
  "publisher": {
    "monitoringUrl": "https://driftguard.org/api/watches/{watchId}/status",
    "compatibilityReceiptUrl": "https://driftguard.org/api/drift/events/{eventId}/receipt"
  },
  "servers": []
}
```

Replace `{watchId}` with your watch id after creation. Set `compatibilityReceiptUrl` after your first drift event generates a receipt buyers can verify.

6. **Link the status URL in README** — badge or markdown link for downstream teams.
7. **Wire internal alerts** — Slack webhook on the watch for breaking drift on your own catalog.

## Console: Publisher mode

When adding an MCP watch in the console wizard, choose **I'm monitoring my own MCP server for downstream users**. This enables `publicStatus` and surfaces a lockfile snippet via `GET /api/watches/{id}/publisher-lockfile`.

## Hosted playbook

Full publisher checklist (webhooks, receipts, conformance): [driftguard.org/docs/guides/mcp-publisher-monitoring](https://driftguard.org/docs/guides/mcp-publisher-monitoring).

## Boundaries

- Contract trust only — no wallet, escrow, or seller billing instructions.
- Public status omits endpoint URLs and secrets; only drift band, health, and incident summary.

## Related

- [Agent MCP guide](agent-mcp.md)
- [Automation ingress](automation-ingress.md) — buyer-side webhook validate
- Hosted trial: [driftguard.org/start](https://driftguard.org/start)
