# DEVPLAN Tracker Pack

A dependency-free DEVPLAN tracker for any software repository. Installed project tracker files live under `devplan/` by default so they do not clutter the repository root.

## Requirements

- Node.js 20 or newer; Node.js 22 LTS is recommended.
- No runtime dependencies and no external services.

## Default installed structure

```text
devplan/
  DEVPLAN.md
  DEVPLAN-STATE.json
  devplan.config.json
  schemas/devplan-state.schema.json
  docs/USAGE.md
  docs/GOVERNANCE.md
  docs/AGENT-INSTRUCTIONS.md
  docs/CI.md
  docs/MIGRATION.md
  reports/.gitkeep
```

The CLI defaults to `--state devplan/DEVPLAN-STATE.json`, `--plan devplan/DEVPLAN.md`, and `--config devplan/devplan.config.json`.

## Quick start

```bash
node scripts/devplan.mjs validate
node scripts/devplan.mjs status
node scripts/devplan.mjs next
node scripts/devplan.mjs report --output devplan/reports/DEVPLAN-REPORT.md
node scripts/devplan.mjs readiness
```

## Install into another repository

```bash
node install.mjs --target /path/to/repo
```

The installer creates `devplan/`, copies templates, creates `devplan/reports/.gitkeep`, merges `package.json` scripts, and updates `.gitignore` with generated/local files only. It preserves existing `devplan` files unless `--force` is provided.

Options:

- `--root-files` installs legacy root-level `DEVPLAN.md` and `DEVPLAN-STATE.json` files.
- `--local-only` adds ignore rules for all installed tracker files.
- `--force` overwrites existing tracker files and scripts.

## Migration

Legacy root files are still detected. If root `DEVPLAN.md` and `DEVPLAN-STATE.json` exist and `devplan/` does not, commands warn:

```text
Using legacy root DEVPLAN files. Run devplan-tracker migrate to move them to /devplan.
```

Move legacy files with:

```bash
node scripts/devplan.mjs migrate
```

## Commands

- `status` prints project, branch, status counts, and milestones.
- `validate` checks JSON parsing, schema version, metadata, statuses, unique IDs, milestone references, required item fields, and `devplan/DEVPLAN.md` references.
- `next` lists the highest-priority open work.
- `report` emits a Markdown report.
- `readiness` exits successfully only when no release-critical items are blocked or open.
- `migrate` moves legacy root tracker files into `devplan/`.

See `devplan/docs/USAGE.md`, `devplan/docs/GOVERNANCE.md`, `devplan/docs/AGENT-INSTRUCTIONS.md`, `devplan/docs/CI.md`, and `devplan/docs/MIGRATION.md`.
