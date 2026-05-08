#!/usr/bin/env node

import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SUPPORTED_SCHEMA_VERSION = 1;
const DEFAULT_STATUSES = ["planned", "in_progress", "done", "blocked", "deferred", "superseded"];
const DEFAULT_PRIORITIES = ["release-critical-now", "must-add-soon-after-release", "later-polish", "maintenance"];
const DEFAULT_RELEASE_CRITICAL = ["release-critical-now"];
const DEFAULT_STATE_PATH = "devplan/DEVPLAN-STATE.json";
const DEFAULT_PLAN_PATH = "devplan/DEVPLAN.md";
const DEFAULT_CONFIG_PATH = "devplan/devplan.config.json";
const LEGACY_STATE_PATH = "DEVPLAN-STATE.json";
const LEGACY_PLAN_PATH = "DEVPLAN.md";
const LEGACY_WARNING = "Using legacy root DEVPLAN files. Run devplan-tracker migrate to move them to /devplan.";
const TERMINAL_STATUSES = new Set(["done", "deferred", "superseded"]);
const OPEN_STATUSES = new Set(["planned", "in_progress", "blocked"]);
const CLI_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACK_ROOT = path.resolve(CLI_DIR, "..");

function usage() {
  console.log(`DEVPLAN tracker

Usage:
  node scripts/devplan.mjs <command> [options]

Commands:
  status
  validate [--state devplan/DEVPLAN-STATE.json] [--plan devplan/DEVPLAN.md] [--config devplan/devplan.config.json]
  next [--limit 5]
  report [--output devplan/reports/DEVPLAN-REPORT.md]
  readiness
  list [--status planned] [--priority release-critical-now] [--milestone launch]
  add-milestone --id <id> --title <title> [--status planned]
  add-item --id <id> --title <title> --success <text> [--priority release-critical-now] [--milestone <id>] [--status planned]
  update --id <id> [--status <status>] [--note <text>] [--evidence <text>] [--owner <name>] [--priority <value>] [--title <title>] [--success <text>]
  remove-item --id <id>
  link-item --id <id> --milestone <id>
  protect --surface <command-or-file>
  init --name <project> [--repo owner/repo] [--branch main] [--force]
  migrate [--dry-run] [--keep-root-stub] [--force]

Global options:
  --state <file>   State file path (default devplan/DEVPLAN-STATE.json)
  --plan <file>    Plan file path (default devplan/DEVPLAN.md)
  --config <file>  Config file path (default devplan/devplan.config.json)
  --help           Show this help
`);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      out._.push(arg);
      continue;
    }
    const [rawKey, inlineValue] = arg.slice(2).split(/=(.*)/s, 2);
    if (inlineValue !== undefined) {
      out[rawKey] = inlineValue;
      continue;
    }
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) out[rawKey] = true;
    else {
      out[rawKey] = next;
      i += 1;
    }
  }
  return out;
}

function usesDefaultDevplanPaths(args) {
  return !args.state && !args.plan && !process.env.DEVPLAN_STATE_PATH && !process.env.DEVPLAN_PLAN_PATH;
}

function shouldUseLegacyRoot(args) {
  return usesDefaultDevplanPaths(args) && !existsSync("devplan") && existsSync(LEGACY_STATE_PATH) && existsSync(LEGACY_PLAN_PATH);
}

function paths(args) {
  if (shouldUseLegacyRoot(args)) {
    console.error(LEGACY_WARNING);
    return {
      statePath: LEGACY_STATE_PATH,
      planPath: LEGACY_PLAN_PATH,
      configPath: args.config || process.env.DEVPLAN_CONFIG_PATH || DEFAULT_CONFIG_PATH,
      legacy: true
    };
  }
  return {
    statePath: args.state || process.env.DEVPLAN_STATE_PATH || DEFAULT_STATE_PATH,
    planPath: args.plan || process.env.DEVPLAN_PLAN_PATH || DEFAULT_PLAN_PATH,
    configPath: args.config || process.env.DEVPLAN_CONFIG_PATH || DEFAULT_CONFIG_PATH,
    legacy: false
  };
}

function now() {
  return new Date().toISOString();
}

function die(message, code = 1) {
  console.error(`ERROR: ${message}`);
  process.exitCode = code;
}

function ensureId(value, label = "id") {
  if (!value || typeof value !== "string") throw new Error(`${label} is required`);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(value)) throw new Error(`${label} must use letters, numbers, '.', '_', ':', or '-'`);
}

function ensureStatus(state, status) {
  const statuses = validStatuses(state);
  if (!statuses.has(status)) throw new Error(`invalid status '${status}'. Valid statuses: ${[...statuses].join(", ")}`);
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [String(value)];
}

async function readJson(filePath, label) {
  let raw;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") throw new Error(`${label} not found at ${filePath}`);
    throw error;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${label} JSON parse failed: ${error.message}`);
  }
}

async function loadState(args) {
  const { statePath } = paths(args);
  return readJson(statePath, "state");
}

async function saveState(state, args) {
  const { statePath } = paths(args);
  state.project ??= {};
  state.project.updated_at = now();
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

function validStatuses(state) {
  return new Set(state.rules?.valid_statuses?.length ? state.rules.valid_statuses : DEFAULT_STATUSES);
}

function releaseCriticalPriorities(state) {
  return new Set(state.rules?.release_critical_priorities?.length ? state.rules.release_critical_priorities : DEFAULT_RELEASE_CRITICAL);
}

function priorityRank(priority) {
  const index = DEFAULT_PRIORITIES.indexOf(priority);
  return index === -1 ? 99 : index;
}

function statusRank(status) {
  const order = ["blocked", "in_progress", "planned", "done", "deferred", "superseded"];
  const index = order.indexOf(status);
  return index === -1 ? 99 : index;
}

function byPriorityThenStatus(a, b) {
  return priorityRank(a.priority) - priorityRank(b.priority)
    || statusRank(a.status) - statusRank(b.status)
    || String(a.id).localeCompare(String(b.id));
}

function itemMap(state) {
  return new Map((state.items ?? []).map((item) => [item.id, item]));
}

function recomputeMilestones(state) {
  const items = itemMap(state);
  for (const milestone of state.milestones ?? []) {
    milestone.items ??= [];
    const linked = milestone.items.map((id) => items.get(id)).filter(Boolean);
    if (linked.length === 0) {
      milestone.status ||= "planned";
    } else if (linked.some((item) => item.status === "blocked")) milestone.status = "blocked";
    else if (linked.every((item) => TERMINAL_STATUSES.has(item.status))) milestone.status = "done";
    else if (linked.some((item) => item.status === "in_progress")) milestone.status = "in_progress";
    else milestone.status = "planned";
  }
}

function statusCounts(items) {
  const counts = new Map();
  for (const item of items) counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
  return counts;
}

function printStatus(state) {
  const items = state.items ?? [];
  const counts = statusCounts(items);
  console.log(`project=${state.project?.name ?? "unknown"}`);
  console.log(`repo=${state.project?.repo ?? "unknown"}`);
  console.log(`branch=${state.project?.canonical_branch ?? "unknown"}`);
  console.log(`updated_at=${state.project?.updated_at ?? "unknown"}`);
  console.log("status_counts:");
  for (const status of validStatuses(state)) console.log(`- ${status}: ${counts.get(status) ?? 0}`);
  console.log("milestones:");
  for (const milestone of state.milestones ?? []) {
    console.log(`- ${milestone.id}: ${milestone.status} - ${milestone.title}`);
  }
}

async function validateStateFile(args) {
  const { statePath, planPath } = paths(args);
  const messages = [];
  let state;
  const pass = (message) => messages.push({ ok: true, message });
  const fail = (message) => messages.push({ ok: false, message });

  try {
    state = await readJson(statePath, "state");
    pass("state JSON parses");
  } catch (error) {
    fail(error.message);
    printValidation(messages);
    return { ok: false, state: null };
  }

  if (state.schema_version === SUPPORTED_SCHEMA_VERSION) pass(`schema_version ${SUPPORTED_SCHEMA_VERSION} supported`);
  else fail(`schema_version must be ${SUPPORTED_SCHEMA_VERSION}`);

  if (state.project && typeof state.project === "object") pass("project metadata object present");
  else fail("project metadata missing");
  for (const field of ["name", "repo", "canonical_branch", "updated_at"]) {
    if (typeof state.project?.[field] === "string" && state.project[field].trim()) pass(`project.${field} present`);
    else fail(`project.${field} missing`);
  }

  if (Array.isArray(state.rules?.valid_statuses) && state.rules.valid_statuses.length > 0) pass("valid_statuses configured");
  else fail("rules.valid_statuses missing");
  const statuses = validStatuses(state);
  for (const status of statuses) {
    if (typeof status === "string" && status.trim()) pass(`status '${status}' is usable`);
    else fail("valid_statuses contains an empty value");
  }

  if (Array.isArray(state.items)) pass("items array present");
  else fail("items array missing");
  if (Array.isArray(state.milestones)) pass("milestones array present");
  else fail("milestones array missing");

  const ids = new Set();
  for (const item of state.items ?? []) {
    if (typeof item.id === "string" && item.id.trim()) {
      if (ids.has(item.id)) fail(`duplicate item id ${item.id}`);
      else {
        ids.add(item.id);
        pass(`item ${item.id} id unique`);
      }
    } else fail("item missing id");

    const itemLabel = item.id || "<missing-id>";
    if (typeof item.title === "string" && item.title.trim()) pass(`${itemLabel} title present`);
    else fail(`${itemLabel} missing title`);
    if (statuses.has(item.status)) pass(`${itemLabel} status valid`);
    else fail(`${itemLabel} invalid status ${item.status}`);
    if (typeof item.priority === "string" && item.priority.trim()) pass(`${itemLabel} priority present`);
    else fail(`${itemLabel} missing priority`);
    if (Array.isArray(item.success_conditions) && item.success_conditions.length > 0 && item.success_conditions.every((entry) => typeof entry === "string" && entry.trim())) pass(`${itemLabel} success_conditions present`);
    else fail(`${itemLabel} missing success_conditions`);
    if (typeof item.updated_at === "string" && item.updated_at.trim()) pass(`${itemLabel} updated_at present`);
    else fail(`${itemLabel} missing updated_at`);
  }

  for (const milestone of state.milestones ?? []) {
    const label = milestone.id || "<missing-milestone-id>";
    if (typeof milestone.id === "string" && milestone.id.trim()) pass(`milestone ${label} id present`);
    else fail("milestone missing id");
    if (typeof milestone.title === "string" && milestone.title.trim()) pass(`milestone ${label} title present`);
    else fail(`milestone ${label} missing title`);
    if (statuses.has(milestone.status)) pass(`milestone ${label} status valid`);
    else fail(`milestone ${label} invalid status ${milestone.status}`);
    if (Array.isArray(milestone.items)) pass(`milestone ${label} items array present`);
    else fail(`milestone ${label} items array missing`);
    for (const itemId of milestone.items ?? []) {
      if (ids.has(itemId)) pass(`milestone ${label} references known item ${itemId}`);
      else fail(`milestone ${label} references unknown item ${itemId}`);
    }
  }

  if (!existsSync(planPath)) fail(`${planPath} not found`);
  else {
    const plan = await readFile(planPath, "utf8");
    pass(`${planPath} present`);
    for (const id of ids) {
      if (plan.includes(id)) pass(`DEVPLAN.md references ${id}`);
      else fail(`DEVPLAN.md does not reference ${id}`);
    }
  }

  printValidation(messages);
  return { ok: messages.every((message) => message.ok), state };
}

function printValidation(messages) {
  for (const message of messages) console[message.ok ? "log" : "error"](`${message.ok ? "PASS" : "FAIL"}: ${message.message}`);
}

function listItems(state, args, { onlyOpen = false } = {}) {
  let items = [...(state.items ?? [])];
  if (onlyOpen) items = items.filter((item) => OPEN_STATUSES.has(item.status));
  if (args.status) items = items.filter((item) => item.status === args.status);
  if (args.priority) items = items.filter((item) => item.priority === args.priority);
  if (args.milestone) {
    const milestone = (state.milestones ?? []).find((candidate) => candidate.id === args.milestone);
    const allowed = new Set(milestone?.items ?? []);
    items = items.filter((item) => allowed.has(item.id));
  }
  items.sort(byPriorityThenStatus);
  const limit = Number(args.limit || 0);
  if (limit > 0) items = items.slice(0, limit);
  for (const item of items) console.log(`${item.id}\t${item.status}\t${item.priority}\t${item.title}`);
  if (items.length === 0) console.log("No matching items.");
}

function markdownReport(state) {
  const items = [...(state.items ?? [])].sort(byPriorityThenStatus);
  const counts = statusCounts(items);
  const critical = releaseCriticalPriorities(state);
  const blockedCritical = items.filter((item) => critical.has(item.priority) && item.status === "blocked");
  const openCritical = items.filter((item) => critical.has(item.priority) && OPEN_STATUSES.has(item.status));
  const lines = [
    `# DEVPLAN Report`,
    "",
    `Generated: ${now()}`,
    "",
    `Project: ${state.project?.name ?? "unknown"}`,
    `Repository: ${state.project?.repo ?? "unknown"}`,
    `Branch: ${state.project?.canonical_branch ?? "unknown"}`,
    `State updated: ${state.project?.updated_at ?? "unknown"}`,
    "",
    "## Status counts",
    ""
  ];
  for (const status of validStatuses(state)) lines.push(`- ${status}: ${counts.get(status) ?? 0}`);
  lines.push("", "## Release readiness", "", blockedCritical.length || openCritical.length ? "Result: NOT READY" : "Result: READY");
  lines.push(`- Blocked release-critical items: ${blockedCritical.length}`);
  lines.push(`- Open release-critical items: ${openCritical.length}`);
  lines.push("", "## Milestones", "");
  for (const milestone of state.milestones ?? []) lines.push(`- **${milestone.id}** (${milestone.status}): ${milestone.title}`);
  lines.push("", "## Items", "");
  for (const item of items) {
    lines.push(`### ${item.id}`);
    lines.push("");
    lines.push(`- Title: ${item.title}`);
    lines.push(`- Status: ${item.status}`);
    lines.push(`- Priority: ${item.priority}`);
    lines.push(`- Owner: ${item.owner ?? "unassigned"}`);
    lines.push(`- Updated: ${item.updated_at ?? "unknown"}`);
    if (item.success_conditions?.length) {
      lines.push(`- Success conditions:`);
      for (const condition of item.success_conditions) lines.push(`  - ${condition}`);
    }
    if (item.evidence?.length) {
      lines.push(`- Evidence:`);
      for (const evidence of item.evidence) lines.push(`  - ${evidence}`);
    }
    if (item.notes?.length) {
      lines.push(`- Notes:`);
      for (const note of item.notes) lines.push(`  - ${typeof note === "string" ? note : `${note.at}: ${note.text}`}`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

async function report(state, args) {
  const output = markdownReport(state);
  if (args.output) {
    await mkdir(path.dirname(path.resolve(args.output)), { recursive: true });
    await writeFile(args.output, output);
    console.log(`Wrote ${args.output}`);
  } else console.log(output.trimEnd());
}

function readiness(state) {
  const critical = releaseCriticalPriorities(state);
  const items = state.items ?? [];
  const blocked = items.filter((item) => critical.has(item.priority) && item.status === "blocked");
  const open = items.filter((item) => critical.has(item.priority) && OPEN_STATUSES.has(item.status));
  const ready = blocked.length === 0 && open.length === 0;
  console.log(`readiness=${ready ? "ready" : "not-ready"}`);
  console.log(`blocked_release_critical=${blocked.length}`);
  console.log(`open_release_critical=${open.length}`);
  for (const item of [...blocked, ...open].sort(byPriorityThenStatus)) console.log(`- ${item.id}\t${item.status}\t${item.priority}\t${item.title}`);
  if (!ready) process.exitCode = 2;
}

async function addMilestone(state, args) {
  ensureId(args.id);
  if (!args.title) throw new Error("add-milestone requires --title");
  const status = args.status || "planned";
  ensureStatus(state, status);
  state.milestones ??= [];
  if (state.milestones.some((milestone) => milestone.id === args.id)) throw new Error(`milestone ${args.id} already exists`);
  state.milestones.push({ id: args.id, title: args.title, status, items: [] });
  await saveState(state, args);
  console.log(`added_milestone=${args.id}`);
}

async function ensurePlanReference(args, item) {
  const { planPath } = paths(args);
  if (!existsSync(planPath)) return;
  const plan = await readFile(planPath, "utf8");
  if (plan.includes(item.id)) return;
  const section = `\n## Newly tracked work\n\n### ${item.id}\n\n${item.title}\n`;
  await writeFile(planPath, `${plan.trimEnd()}${section}`);
}

async function addItem(state, args) {
  ensureId(args.id);
  if (!args.title) throw new Error("add-item requires --title");
  const status = args.status || "planned";
  ensureStatus(state, status);
  state.items ??= [];
  if (state.items.some((item) => item.id === args.id)) throw new Error(`item ${args.id} already exists`);
  const successes = asArray(args.success);
  if (successes.length === 0) throw new Error("add-item requires --success");
  const item = {
    id: args.id,
    title: args.title,
    status,
    priority: args.priority || "release-critical-now",
    owner: args.owner || "unassigned",
    evidence: [],
    success_conditions: successes,
    notes: [],
    updated_at: now()
  };
  state.items.push(item);
  if (args.milestone) linkItemInMemory(state, args.id, args.milestone);
  recomputeMilestones(state);
  await ensurePlanReference(args, item);
  await saveState(state, args);
  console.log(`added_item=${args.id}`);
}

function linkItemInMemory(state, itemId, milestoneId) {
  const item = (state.items ?? []).find((candidate) => candidate.id === itemId);
  if (!item) throw new Error(`item ${itemId} not found`);
  const milestone = (state.milestones ?? []).find((candidate) => candidate.id === milestoneId);
  if (!milestone) throw new Error(`milestone ${milestoneId} not found`);
  milestone.items ??= [];
  if (!milestone.items.includes(itemId)) milestone.items.push(itemId);
}

async function updateItem(state, args) {
  ensureId(args.id);
  const item = (state.items ?? []).find((candidate) => candidate.id === args.id);
  if (!item) throw new Error(`item ${args.id} not found`);
  if (args.status) {
    ensureStatus(state, args.status);
    item.status = args.status;
  }
  if (args.priority) item.priority = args.priority;
  if (args.owner) item.owner = args.owner;
  if (args.title) item.title = args.title;
  if (args.success) item.success_conditions = [...(item.success_conditions ?? []), ...asArray(args.success)];
  if (args.note) item.notes = [...(item.notes ?? []), { at: now(), text: args.note }];
  if (args.evidence) item.evidence = [...(item.evidence ?? []), args.evidence];
  item.updated_at = now();
  recomputeMilestones(state);
  await saveState(state, args);
  console.log(`updated_item=${args.id}`);
}

async function removeItem(state, args) {
  ensureId(args.id);
  const before = state.items?.length ?? 0;
  state.items = (state.items ?? []).filter((item) => item.id !== args.id);
  if (state.items.length === before) throw new Error(`item ${args.id} not found`);
  for (const milestone of state.milestones ?? []) milestone.items = (milestone.items ?? []).filter((id) => id !== args.id);
  recomputeMilestones(state);
  await saveState(state, args);
  console.log(`removed_item=${args.id}`);
}

async function linkItem(state, args) {
  ensureId(args.id);
  ensureId(args.milestone, "milestone");
  linkItemInMemory(state, args.id, args.milestone);
  recomputeMilestones(state);
  await saveState(state, args);
  console.log(`linked_item=${args.id}`);
}

async function protect(state, args) {
  if (!args.surface || typeof args.surface !== "string") throw new Error("protect requires --surface");
  state.rules ??= {};
  state.rules.protected_surfaces ??= [];
  if (!state.rules.protected_surfaces.includes(args.surface)) state.rules.protected_surfaces.push(args.surface);
  await saveState(state, args);
  console.log(`protected_surface=${args.surface}`);
}


async function writeConfig(configPath) {
  await mkdir(path.dirname(configPath), { recursive: true });
  const config = {
    schema_version: SUPPORTED_SCHEMA_VERSION,
    state: DEFAULT_STATE_PATH,
    plan: DEFAULT_PLAN_PATH,
    reports_dir: "devplan/reports",
    schema: "devplan/schemas/devplan-state.schema.json"
  };
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

async function updatePackageScripts(root = process.cwd(), { dryRun = false } = {}) {
  const packagePath = path.join(root, "package.json");
  if (!existsSync(packagePath)) return ["package_json=missing"];
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  const scripts = {
    devplan: "node scripts/devplan.mjs",
    "devplan:status": "node scripts/devplan-status.mjs",
    "devplan:validate": "node scripts/devplan-validate.mjs",
    "devplan:next": "node scripts/devplan.mjs next",
    "devplan:report": "node scripts/devplan-report.mjs",
    "devplan:readiness": "node scripts/devplan.mjs readiness",
    "devplan:migrate": "node scripts/devplan.mjs migrate"
  };
  packageJson.scripts ??= {};
  const changed = [];
  for (const [name, command] of Object.entries(scripts)) {
    if (packageJson.scripts[name] !== command) {
      packageJson.scripts[name] = command;
      changed.push(`script=${name}`);
    }
  }
  if (changed.length && !dryRun) await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  return changed;
}

async function updateGitignore(root = process.cwd(), { localOnly = false, dryRun = false } = {}) {
  const gitignorePath = path.join(root, ".gitignore");
  const baseBlock = `# DEVPLAN tracker generated/local files\ndevplan/reports/\n.devplan/\n.devplan-cache/\n*.devplan.backup.json\n!devplan/reports/\ndevplan/reports/*\n!devplan/reports/.gitkeep`;
  const localBlock = `# DEVPLAN tracker local-only files\ndevplan/\nDEVPLAN.md\nDEVPLAN-STATE.json\nschemas/devplan-state.schema.json`;
  const required = localOnly ? `${baseBlock}\n${localBlock}` : baseBlock;
  const current = existsSync(gitignorePath) ? await readFile(gitignorePath, "utf8") : "";
  let next = current;
  for (const line of required.split("\n")) {
    if (!next.split(/\r?\n/).includes(line)) next += `${next.endsWith("\n") || next.length === 0 ? "" : "\n"}${line}\n`;
  }
  if (next !== current && !dryRun) await writeFile(gitignorePath, next);
  return next !== current;
}

async function moveFile(source, destination, { dryRun = false, force = false } = {}) {
  if (!existsSync(source)) return `missing=${source}`;
  if (existsSync(destination) && !force) throw new Error(`${destination} exists; use --force to overwrite`);
  if (!dryRun) {
    await mkdir(path.dirname(destination), { recursive: true });
    if (existsSync(destination) && force) await rm(destination, { force: true });
    await rename(source, destination);
  }
  return `move=${source}->${destination}`;
}

async function migrate(args) {
  const dryRun = Boolean(args["dry-run"]);
  const force = Boolean(args.force);
  const keepRootStub = Boolean(args["keep-root-stub"]);
  const actions = [];
  actions.push(await moveFile(LEGACY_PLAN_PATH, DEFAULT_PLAN_PATH, { dryRun, force }));
  actions.push(await moveFile(LEGACY_STATE_PATH, DEFAULT_STATE_PATH, { dryRun, force }));
  actions.push(await moveFile("schemas/devplan-state.schema.json", "devplan/schemas/devplan-state.schema.json", { dryRun, force }));
  if (!dryRun) {
    await writeConfig(DEFAULT_CONFIG_PATH);
    await mkdir("devplan/reports", { recursive: true });
    await writeFile("devplan/reports/.gitkeep", "");
    if (keepRootStub) {
      await writeFile(LEGACY_PLAN_PATH, "# DEVPLAN moved\n\nSee `devplan/DEVPLAN.md`.\n");
      await writeFile(LEGACY_STATE_PATH, `${JSON.stringify({ moved_to: DEFAULT_STATE_PATH }, null, 2)}\n`);
    }
  }
  actions.push(...await updatePackageScripts(process.cwd(), { dryRun }));
  if (await updateGitignore(process.cwd(), { dryRun })) actions.push("gitignore=updated");
  for (const action of actions) console.log(`${dryRun ? "dry_run:" : ""}${action}`);
}

async function init(args) {
  if (!args.name) throw new Error("init requires --name");
  const { statePath, planPath } = paths(args);
  const force = Boolean(args.force);
  if (!force && existsSync(statePath)) throw new Error(`${statePath} exists; use --force to overwrite`);
  if (!force && existsSync(planPath)) throw new Error(`${planPath} exists; use --force to overwrite`);
  const branch = args.branch || "main";
  const repo = args.repo || "unknown/unknown";
  const state = {
    schema_version: SUPPORTED_SCHEMA_VERSION,
    project: { name: args.name, repo, canonical_branch: branch, updated_at: now() },
    rules: { update_state_when_work_done: true, valid_statuses: DEFAULT_STATUSES, release_critical_priorities: DEFAULT_RELEASE_CRITICAL, protected_surfaces: [] },
    milestones: [{ id: "launch", title: "Launch readiness", status: "planned", items: ["launch.plan"] }],
    items: [{ id: "launch.plan", title: "Define launch plan", status: "planned", priority: "release-critical-now", owner: "unassigned", evidence: [], success_conditions: ["Launch plan is documented and reviewed."], notes: [], updated_at: now() }]
  };
  await mkdir(path.dirname(statePath), { recursive: true });
  await mkdir(path.dirname(planPath), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
  await writeFile(planPath, `# ${args.name} Development Plan\n\n_Last updated: ${new Date().toISOString().slice(0, 10)}_\n\n## Purpose\n\nTrack project milestones and implementation work.\n\n## Release-critical now\n\n### launch.plan\n\nDefine the launch plan.\n\n## Update rule\n\nUpdate DEVPLAN-STATE.json in the same PR as tracked work changes.\n`);
  await writeConfig(paths(args).configPath);
  await mkdir("devplan/reports", { recursive: true });
  await writeFile("devplan/reports/.gitkeep", "");
  console.log(`initialized_state=${statePath}`);
  console.log(`initialized_plan=${planPath}`);
}

async function main(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv;
  const args = parseArgs(rest);
  if (!command || command === "help" || args.help) {
    usage();
    return;
  }

  try {
    if (command === "init") return await init(args);
    if (command === "migrate") return await migrate(args);
    if (command === "validate") {
      const result = await validateStateFile(args);
      if (!result.ok) process.exitCode = 1;
      return;
    }

    const state = await loadState(args);
    switch (command) {
      case "status":
        printStatus(state);
        break;
      case "next":
        listItems(state, { ...args, limit: args.limit || 5 }, { onlyOpen: true });
        break;
      case "list":
        listItems(state, args);
        break;
      case "report":
        await report(state, args);
        break;
      case "readiness":
        readiness(state);
        break;
      case "add-milestone":
        await addMilestone(state, args);
        break;
      case "add-item":
        await addItem(state, args);
        break;
      case "update":
        await updateItem(state, args);
        break;
      case "remove-item":
        await removeItem(state, args);
        break;
      case "link-item":
        await linkItem(state, args);
        break;
      case "protect":
        await protect(state, args);
        break;
      default:
        throw new Error(`unknown command '${command}'`);
    }
  } catch (error) {
    die(error.message);
  }
}

await main();
