#!/usr/bin/env node

import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) out[key] = true;
    else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const target = path.resolve(args.target || process.cwd());
const force = Boolean(args.force);
const packRoot = path.dirname(fileURLToPath(import.meta.url));

const files = [
  "DEVPLAN.md",
  "DEVPLAN-STATE.json",
  "manifest.json",
  "package-scripts.json",
  "scripts/devplan.mjs",
  "scripts/devplan-status.mjs",
  "scripts/devplan-validate.mjs",
  "scripts/devplan-update.mjs",
  "scripts/devplan-report.mjs",
  "schemas/devplan-state.schema.json",
  "docs/DEVPLAN-USAGE.md",
  "docs/DEVPLAN-GOVERNANCE.md",
  "docs/DEVPLAN-AGENT-INSTRUCTIONS.md",
  "docs/DEVPLAN-CI.md",
  "docs/DEVPLAN-MIGRATION.md",
  "docs/CONNECTOR-BLOCKED-SCRIPTS.md",
  "workflows/devplan-check.yml",
  "examples/example.DEVPLAN-STATE.json",
  "examples/saas.DEVPLAN-STATE.json",
  "examples/mobile-app.DEVPLAN-STATE.json",
  "examples/client-website.DEVPLAN-STATE.json"
];

async function copyPackFile(relativePath) {
  const from = path.join(packRoot, relativePath);
  const to = path.join(target, relativePath);
  if (existsSync(to) && !force) {
    console.log(`skip_existing=${relativePath}`);
    return;
  }
  await mkdir(path.dirname(to), { recursive: true });
  await copyFile(from, to);
  console.log(`${existsSync(to) ? "installed" : "installed"}=${relativePath}`);
}

async function updatePackageJson() {
  const packagePath = path.join(target, "package.json");
  const snippet = JSON.parse(await readFile(path.join(packRoot, "package-scripts.json"), "utf8"));
  if (!existsSync(packagePath)) {
    console.log("package_json=missing");
    console.log("manual_install=copy the files above, then add these scripts if your toolchain supports scripts:");
    for (const [name, command] of Object.entries(snippet.scripts)) console.log(`  ${name}: ${command}`);
    return;
  }

  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  packageJson.scripts ??= {};
  for (const [name, command] of Object.entries(snippet.scripts)) {
    if (packageJson.scripts[name] && !force) {
      console.log(`script_skip_existing=${name}`);
      continue;
    }
    packageJson.scripts[name] = command;
    console.log(`script_installed=${name}`);
  }
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

try {
  console.log(`target=${target}`);
  for (const file of files) await copyPackFile(file);
  await updatePackageJson();
  console.log("done=true");
  console.log("next=node scripts/devplan.mjs validate && node scripts/devplan.mjs status");
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}
