#!/usr/bin/env node
/** DIST-001 — validate GitHub Marketplace listing prerequisites for user-facing actions. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

/** Actions published to Marketplace — exclude internal setup-driftguard. */
const MARKETPLACE_ACTIONS = [
  "drift-diff",
  "drift-coverage-preview",
  "drift-coverage",
];

function readYamlField(content, key) {
  const re = new RegExp(`^${key}:\\s*(.+)$`, "m");
  const match = content.match(re);
  return match?.[1]?.trim() ?? "";
}

for (const slug of MARKETPLACE_ACTIONS) {
  const dir = path.join(root, ".github/actions", slug);
  const actionYml = path.join(dir, "action.yml");
  const readme = path.join(dir, "README.md");

  if (!fs.existsSync(actionYml)) {
    errors.push(`${slug}: missing action.yml`);
    continue;
  }
  if (!fs.existsSync(readme)) {
    errors.push(`${slug}: missing README.md`);
  }

  const yml = fs.readFileSync(actionYml, "utf8");
  for (const field of ["name", "description"]) {
    if (!readYamlField(yml, field)) {
      errors.push(`${slug}: action.yml missing ${field}`);
    }
  }
  if (!/branding:\s*\n\s*icon:/m.test(yml)) {
    errors.push(`${slug}: action.yml missing branding.icon`);
  }
  if (!/branding:\s*\n[\s\S]*?\n\s*color:/m.test(yml)) {
    errors.push(`${slug}: action.yml missing branding.color`);
  }
}

const listingCopy = path.join(root, "docs/marketplace/LISTING-COPY.md");
if (!fs.existsSync(listingCopy)) {
  errors.push("docs/marketplace/LISTING-COPY.md missing (publisher listing copy)");
}

const starter = path.join(root, "examples/workflows/driftguard-starter.yml");
if (!fs.existsSync(starter)) {
  errors.push("examples/workflows/driftguard-starter.yml missing");
}

const ciDoc = path.join(root, "docs/CI.md");
if (!fs.existsSync(ciDoc)) {
  errors.push("docs/CI.md missing");
}

if (errors.length) {
  console.error("check-marketplace-readiness failed:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(`Marketplace readiness OK (${MARKETPLACE_ACTIONS.length} actions)`);
