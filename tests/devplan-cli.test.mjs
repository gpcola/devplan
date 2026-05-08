import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(repoRoot, "scripts/devplan.mjs");
const installer = path.join(repoRoot, "install.mjs");

function run(args, options = {}) {
  return spawnSync(process.execPath, args, {
    cwd: options.cwd || repoRoot,
    encoding: "utf8",
    env: { ...process.env, ...options.env }
  });
}

async function fixture() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "devplan-test-"));
  const statePath = path.join(dir, "DEVPLAN-STATE.json");
  const planPath = path.join(dir, "DEVPLAN.md");
  await writeFile(statePath, JSON.stringify({
    schema_version: 1,
    project: { name: "Test Project", repo: "test/repo", canonical_branch: "main", updated_at: "2026-05-08T00:00:00.000Z" },
    rules: { update_state_when_work_done: true, valid_statuses: ["planned", "in_progress", "done", "blocked", "deferred", "superseded"], release_critical_priorities: ["release-critical-now"], protected_surfaces: [] },
    milestones: [{ id: "launch", title: "Launch", status: "planned", items: ["launch.plan"] }],
    items: [{ id: "launch.plan", title: "Plan launch", status: "planned", priority: "release-critical-now", owner: "qa", evidence: [], success_conditions: ["Plan exists."], notes: [], updated_at: "2026-05-08T00:00:00.000Z" }]
  }, null, 2));
  await writeFile(planPath, "# Test Project DEVPLAN\n\n### launch.plan\n\nPlan launch.\n");
  return { dir, statePath, planPath };
}

test("validate accepts a valid state and plan", async () => {
  const { statePath, planPath } = await fixture();
  const result = run([cli, "validate", "--state", statePath, "--plan", planPath]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PASS: state JSON parses/);
});

test("validate rejects unknown milestone item references", async () => {
  const { statePath, planPath } = await fixture();
  const state = JSON.parse(await readFile(statePath, "utf8"));
  state.milestones[0].items.push("missing.item");
  await writeFile(statePath, JSON.stringify(state, null, 2));
  const result = run([cli, "validate", "--state", statePath, "--plan", planPath]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown item missing\.item/);
});

test("mutating commands add, link, update, and remove items", async () => {
  const { statePath, planPath } = await fixture();
  let result = run([cli, "add-milestone", "--state", statePath, "--id", "test-ms", "--title", "Test milestone"]);
  assert.equal(result.status, 0, result.stderr);
  result = run([cli, "add-item", "--state", statePath, "--id", "test.item", "--title", "Test item", "--milestone", "test-ms", "--success", "Test success"]);
  assert.equal(result.status, 0, result.stderr);
  await writeFile(planPath, `${await readFile(planPath, "utf8")}\n### test.item\n\nTest item.\n`);
  result = run([cli, "update", "--state", statePath, "--id", "test.item", "--status", "done", "--note", "Completed", "--evidence", "manual test"]);
  assert.equal(result.status, 0, result.stderr);
  result = run([cli, "validate", "--state", statePath, "--plan", planPath]);
  assert.equal(result.status, 0, result.stderr);
  result = run([cli, "remove-item", "--state", statePath, "--id", "test.item"]);
  assert.equal(result.status, 0, result.stderr);
});

test("readiness returns non-zero when release-critical items are open", async () => {
  const { statePath } = await fixture();
  const result = run([cli, "readiness", "--state", statePath]);
  assert.equal(result.status, 2);
  assert.match(result.stdout, /readiness=not-ready/);
});

test("report writes markdown output", async () => {
  const { dir, statePath } = await fixture();
  const output = path.join(dir, "report.md");
  const result = run([cli, "report", "--state", statePath, "--output", output]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(await readFile(output, "utf8"), /# DEVPLAN Report/);
});

test("init refuses to overwrite without force", async () => {
  const { dir } = await fixture();
  const result = run([cli, "init", "--state", path.join(dir, "DEVPLAN-STATE.json"), "--plan", path.join(dir, "DEVPLAN.md"), "--name", "No overwrite"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /exists/);
});

test("installer skips existing files and preserves existing scripts", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "devplan-install-"));
  await writeFile(path.join(dir, "package.json"), JSON.stringify({ name: "target", scripts: { test: "node --test", "devplan:status": "custom" } }, null, 2));
  await writeFile(path.join(dir, "DEVPLAN.md"), "existing");
  const result = run([installer, "--target", dir]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(await readFile(path.join(dir, "DEVPLAN.md"), "utf8"), "existing");
  const packageJson = JSON.parse(await readFile(path.join(dir, "package.json"), "utf8"));
  assert.equal(packageJson.scripts["devplan:status"], "custom");
  assert.ok(packageJson.scripts["devplan:validate"]);
  assert.ok(existsSync(path.join(dir, "scripts/devplan.mjs")));
});
