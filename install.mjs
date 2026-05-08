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
const rootFiles = Boolean(args["root-files"]);
const localOnly = Boolean(args["local-only"]);
const packRoot = path.dirname(fileURLToPath(import.meta.url));

const defaultFiles = [
  ["devplan/DEVPLAN.md", "devplan/DEVPLAN.md"],
  ["devplan/DEVPLAN-STATE.json", "devplan/DEVPLAN-STATE.json"],
  ["devplan/devplan.config.json", "devplan/devplan.config.json"],
  ["devplan/schemas/devplan-state.schema.json", "devplan/schemas/devplan-state.schema.json"],
  ["devplan/docs/USAGE.md", "devplan/docs/USAGE.md"],
  ["devplan/docs/GOVERNANCE.md", "devplan/docs/GOVERNANCE.md"],
  ["devplan/docs/AGENT-INSTRUCTIONS.md", "devplan/docs/AGENT-INSTRUCTIONS.md"],
  ["devplan/docs/CI.md", "devplan/docs/CI.md"],
  ["devplan/docs/MIGRATION.md", "devplan/docs/MIGRATION.md"]
];

const rootFilesMap = [
  ["devplan/DEVPLAN.md", "DEVPLAN.md"],
  ["devplan/DEVPLAN-STATE.json", "DEVPLAN-STATE.json"],
  ["devplan/devplan.config.json", "devplan.config.json"],
  ["devplan/schemas/devplan-state.schema.json", "schemas/devplan-state.schema.json"],
  ["devplan/docs/USAGE.md", "docs/DEVPLAN-USAGE.md"],
  ["devplan/docs/GOVERNANCE.md", "docs/DEVPLAN-GOVERNANCE.md"],
  ["devplan/docs/AGENT-INSTRUCTIONS.md", "docs/DEVPLAN-AGENT-INSTRUCTIONS.md"],
  ["devplan/docs/CI.md", "docs/DEVPLAN-CI.md"],
  ["devplan/docs/MIGRATION.md", "docs/DEVPLAN-MIGRATION.md"]
];

const scriptFiles = [
  ["scripts/devplan.mjs", "scripts/devplan.mjs"],
  ["scripts/devplan-status.mjs", "scripts/devplan-status.mjs"],
  ["scripts/devplan-validate.mjs", "scripts/devplan-validate.mjs"],
  ["scripts/devplan-update.mjs", "scripts/devplan-update.mjs"],
  ["scripts/devplan-report.mjs", "scripts/devplan-report.mjs"]
];

async function copyPackFile(source, destination) {
  const from = path.join(packRoot, source);
  const to = path.join(target, destination);
  if (existsSync(to) && !force) {
    console.log(`skip_existing=${destination}`);
    return;
  }
  await mkdir(path.dirname(to), { recursive: true });
  await copyFile(from, to);
  console.log(`installed=${destination}`);
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

async function updateGitignore() {
  const gitignorePath = path.join(target, ".gitignore");
  const generated = [
    "# DEVPLAN tracker generated/local files",
    "devplan/reports/",
    ".devplan/",
    ".devplan-cache/",
    "*.devplan.backup.json",
    "!devplan/reports/",
    "devplan/reports/*",
    "!devplan/reports/.gitkeep"
  ];
  const local = rootFiles
    ? ["# DEVPLAN tracker local-only files", "DEVPLAN.md", "DEVPLAN-STATE.json", "devplan.config.json", "schemas/devplan-state.schema.json", "docs/DEVPLAN-USAGE.md", "docs/DEVPLAN-GOVERNANCE.md", "docs/DEVPLAN-AGENT-INSTRUCTIONS.md", "docs/DEVPLAN-CI.md", "docs/DEVPLAN-MIGRATION.md"]
    : ["# DEVPLAN tracker local-only files", "devplan/"];
  const lines = localOnly ? [...generated, ...local] : generated;
  const current = existsSync(gitignorePath) ? await readFile(gitignorePath, "utf8") : "";
  let next = current;
  for (const line of lines) {
    if (!next.split(/\r?\n/).includes(line)) next += `${next.endsWith("\n") || next.length === 0 ? "" : "\n"}${line}\n`;
  }
  if (next !== current) await writeFile(gitignorePath, next);
  console.log("gitignore=updated");
}

try {
  console.log(`target=${target}`);
  const files = [...(rootFiles ? rootFilesMap : defaultFiles), ...scriptFiles];
  if (!rootFiles) await mkdir(path.join(target, "devplan"), { recursive: true });
  for (const [source, destination] of files) await copyPackFile(source, destination);
  if (!rootFiles) {
    await mkdir(path.join(target, "devplan/reports"), { recursive: true });
    await writeFile(path.join(target, "devplan/reports/.gitkeep"), "");
    console.log("installed=devplan/reports/.gitkeep");
  }
  await updatePackageJson();
  await updateGitignore();
  console.log("done=true");
  console.log("next=node scripts/devplan.mjs validate && node scripts/devplan.mjs status");
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}
