# DEVPLAN Tracker Pack

A dependency-free DEVPLAN tracker for any software repository. It keeps a human-readable `DEVPLAN.md` and machine-readable `DEVPLAN-STATE.json` aligned so humans, CI, and AI agents can see what is planned, blocked, done, and release-critical.

## Requirements

- Node.js 20 or newer; Node.js 22 LTS is recommended.
- No runtime dependencies and no external services.

## Quick start

```bash
node scripts/devplan.mjs validate
node scripts/devplan.mjs status
node scripts/devplan.mjs next
node scripts/devplan.mjs report --output /tmp/devplan-report.md
node scripts/devplan.mjs readiness
```

## Install into another repository

```bash
node install.mjs --target /path/to/repo
```

The installer skips existing files unless `--force` is provided. If the target has a `package.json`, scripts from `package-scripts.json` are merged without removing existing scripts. If no `package.json` exists, the installer prints manual script instructions.

## Commands

- `status` prints project, branch, status counts, and milestones.
- `validate` checks JSON parsing, schema version, metadata, statuses, unique IDs, milestone references, required item fields, and `DEVPLAN.md` references.
- `next` lists the highest-priority open work.
- `report` emits a Markdown report.
- `readiness` exits successfully only when no release-critical items are blocked or open.
- `list` filters tracked items.
- `add-milestone`, `add-item`, `update`, `remove-item`, `link-item`, and `protect` mutate state safely.
- `init` creates a new state and plan, refusing to overwrite unless `--force` is passed.

## Agent rule

Any PR that changes tracked work must update `DEVPLAN-STATE.json` in the same PR. Completed work needs evidence and success conditions must remain testable.

## More documentation

See `docs/DEVPLAN-USAGE.md`, `docs/DEVPLAN-GOVERNANCE.md`, `docs/DEVPLAN-AGENT-INSTRUCTIONS.md`, `docs/DEVPLAN-CI.md`, and `docs/DEVPLAN-MIGRATION.md`.
