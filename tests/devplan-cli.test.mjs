import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
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

async function fixture({ legacy = false } = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "devplan-test-"));
  const base = legacy ? dir : path.join(dir, "devplan");
  await mkdir(base, { recursive: true });
  const statePath = path.join(base, "DEVPLAN-STATE.json");
  const planPath = path.join(base, "DEVPLAN.md");
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

test("validate accepts default devplan state and plan paths", async () => {
  const { dir } = await fixture();
  const result = run([cli, "validate"], { cwd: dir });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PASS: state JSON parses/);
});

test("validate rejects unknown milestone item references", async () => {
  const { dir, statePath } = await fixture();
  const state = JSON.parse(await readFile(statePath, "utf8"));
  state.milestones[0].items.push("missing.item");
  await writeFile(statePath, JSON.stringify(state, null, 2));
  const result = run([cli, "validate"], { cwd: dir });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown item missing\.item/);
});

test("mutating commands add, link, update, and remove items", async () => {
  const { dir } = await fixture();
  let result = run([cli, "add-milestone", "--id", "test-ms", "--title", "Test milestone"], { cwd: dir });
  assert.equal(result.status, 0, result.stderr);
  result = run([cli, "add-item", "--id", "test.item", "--title", "Test item", "--milestone", "test-ms", "--success", "Test success"], { cwd: dir });
  assert.equal(result.status, 0, result.stderr);
  result = run([cli, "update", "--id", "test.item", "--status", "done", "--note", "Completed", "--evidence", "manual test"], { cwd: dir });
  assert.equal(result.status, 0, result.stderr);
  result = run([cli, "validate"], { cwd: dir });
  assert.equal(result.status, 0, result.stderr);
  result = run([cli, "remove-item", "--id", "test.item"], { cwd: dir });
  assert.equal(result.status, 0, result.stderr);
});

test("readiness returns non-zero when release-critical items are open", async () => {
  const { dir } = await fixture();
  const result = run([cli, "readiness"], { cwd: dir });
  assert.equal(result.status, 2);
  assert.match(result.stdout, /readiness=not-ready/);
});

test("report writes markdown output", async () => {
  const { dir } = await fixture();
  const output = path.join(dir, "devplan/reports/report.md");
  const result = run([cli, "report", "--output", output], { cwd: dir });
  assert.equal(result.status, 0, result.stderr);
  assert.match(await readFile(output, "utf8"), /# DEVPLAN Report/);
});

test("init refuses to overwrite without force", async () => {
  const { dir } = await fixture();
  const result = run([cli, "init", "--name", "No overwrite"], { cwd: dir });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /exists/);
});

test("installer creates devplan directory, preserves files, and updates scripts/gitignore", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "devplan-install-"));
  await writeFile(path.join(dir, "package.json"), JSON.stringify({ name: "target", scripts: { test: "node --test", "devplan:status": "custom" } }, null, 2));
  await mkdir(path.join(dir, "devplan"), { recursive: true });
  await writeFile(path.join(dir, "devplan/DEVPLAN.md"), "existing");
  const result = run([installer, "--target", dir]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(await readFile(path.join(dir, "devplan/DEVPLAN.md"), "utf8"), "existing");
  const packageJson = JSON.parse(await readFile(path.join(dir, "package.json"), "utf8"));
  assert.equal(packageJson.scripts["devplan:status"], "custom");
  assert.ok(packageJson.scripts["devplan:validate"]);
  assert.ok(existsSync(path.join(dir, "devplan/devplan.config.json")));
  assert.ok(existsSync(path.join(dir, "devplan/reports/.gitkeep")));
  assert.match(await readFile(path.join(dir, ".gitignore"), "utf8"), /devplan\/reports\//);
});

test("legacy root files are detected with migration warning", async () => {
  const { dir } = await fixture({ legacy: true });
  const result = run([cli, "status"], { cwd: dir });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /Using legacy root DEVPLAN files/);
});

test("migrate dry-run previews legacy moves without changing files", async () => {
  const { dir } = await fixture({ legacy: true });
  await mkdir(path.join(dir, "schemas"), { recursive: true });
  await writeFile(path.join(dir, "schemas/devplan-state.schema.json"), "{}\n");
  await writeFile(path.join(dir, "package.json"), JSON.stringify({ name: "target", scripts: {} }, null, 2));
  const result = run([cli, "migrate", "--dry-run"], { cwd: dir });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /dry_run:move=DEVPLAN.md->devplan\/DEVPLAN.md/);
  assert.ok(existsSync(path.join(dir, "DEVPLAN.md")));
  assert.ok(!existsSync(path.join(dir, "devplan/DEVPLAN.md")));
});
