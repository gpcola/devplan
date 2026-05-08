# DEVPLAN Tracker

A dependency-free DEVPLAN tracker for any software repository. It keeps a quick human roadmap, a narrative development plan, and machine-readable state aligned so humans, CI, and AI agents can see what is planned, blocked, done, release-critical, and likely to require significant automation effort.

Most readers should start with `devplan/ROADMAP.md`. It gives a visual marker-based status list, roadmap lanes, ballpark timescales, and rough Codex / Claude Code effort estimates. Use `devplan/DEVPLAN-STATE.json` only when exact machine state is needed.

## Which file should I read?

| File | Audience | Purpose |
| --- | --- | --- |
| `devplan/ROADMAP.md` | Humans, maintainers, stakeholders | Quick status, visual markers, roadmap, timescales, and rough agent effort. |
| `devplan/DEVPLAN.md` | Maintainers and agents | Narrative plan explaining why each tracked work item exists. |
| `devplan/DEVPLAN-STATE.json` | CLI, CI, agents | Canonical machine-readable state. |
| `devplan/reports/` | Reviewers and release managers | Generated snapshots from the CLI report command. |

## Requirements

- Node.js 18 or newer; Node.js 22 LTS is recommended.
- No runtime dependencies and no external services.

## Quick start in this repo

```bash
node scripts/devplan.mjs validate
node scripts/devplan.mjs status
node scripts/devplan.mjs next
node scripts/devplan.mjs report --output /tmp/devplan-report.md
node scripts/devplan.mjs readiness
```

The default layout is:

```text
devplan/
  ROADMAP.md
  DEVPLAN.md
  DEVPLAN-STATE.json
  devplan.config.json
  docs/
  reports/
  schemas/
```

## Install into another repository

From a checkout of this package:

```bash
node install.mjs --target /path/to/repo
```

From GitHub once this repository is pushed:

```bash
npx github:gpcola/devplan init
```

After npm publication:

```bash
npx @1lg/devplan-tracker init
```

The installer skips existing files unless `--force` is provided. If the target has a `package.json`, scripts from `package-scripts.json` are merged without removing existing scripts. If no `package.json` exists, the installer prints manual script instructions.

## Human roadmap

`devplan/ROADMAP.md` is the low-friction project view. It uses simple status markers, a delivery table, a Mermaid roadmap, confidence notes, and effort estimates such as “1 Codex run” or “1-2 Claude Code quota-heavy sessions.”

Update this file whenever a change affects visible status, sequence, timing, blockers, or the likely amount of agent work. It is intentionally approximate; do not treat timescales or quota estimates as contractual.

## Commands

- `init` installs the tracker into `devplan/` by default.
- `migrate` moves legacy root `DEVPLAN.md` and `DEVPLAN-STATE.json` files into `devplan/`.
- `status` prints project, branch, status counts, and milestones.
- `validate` checks JSON parsing, schema version, metadata, statuses, unique IDs, milestone references, required item fields, and `devplan/DEVPLAN.md` references.
- `next` lists the highest-priority open work.
- `report` emits a Markdown report.
- `readiness` exits successfully only when no release-critical items are blocked or open.
- `list` filters tracked items.
- `add-milestone`, `add-item`, `update`, `remove-item`, `link-item`, and `protect` mutate state safely.

## Installer options

- `--target <path>` installs into another repository.
- `--force` overwrites existing tracker files and package scripts.
- `--root-files` uses the legacy root-level layout.
- `--local-only` adds installed tracker files to `.gitignore` for local-only use.

## Agent rule

Any PR that changes tracked work must update `devplan/DEVPLAN-STATE.json` in the same PR. If the change affects human-readable status, timing, sequence, blockers, or estimated effort, update `devplan/ROADMAP.md` too. Completed work needs evidence and success conditions must remain testable.

## More documentation

See `devplan/ROADMAP.md`, `devplan/docs/USAGE.md`, `devplan/docs/GOVERNANCE.md`, `devplan/docs/AGENT-INSTRUCTIONS.md`, `devplan/docs/CI.md`, and `devplan/docs/MIGRATION.md`.
