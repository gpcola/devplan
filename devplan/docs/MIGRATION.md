# DEVPLAN Migration

DEVPLAN Tracker now installs project tracker files under `devplan/` by default.

## Install a new tracker

1. Run `node install.mjs --target /path/to/repo`.
2. Edit `devplan/DEVPLAN-STATE.json` project metadata.
3. Replace sample milestones and items with project-specific work.
4. Mirror key item IDs in `devplan/DEVPLAN.md`.
5. Run `node scripts/devplan.mjs validate`.

## Migrate legacy root files

If `DEVPLAN.md` and `DEVPLAN-STATE.json` are in the repository root and `devplan/` does not exist, commands keep working and print a migration warning.

Run:

```bash
node scripts/devplan.mjs migrate
```

Migration moves:

- `DEVPLAN.md` to `devplan/DEVPLAN.md`
- `DEVPLAN-STATE.json` to `devplan/DEVPLAN-STATE.json`
- `schemas/devplan-state.schema.json` to `devplan/schemas/devplan-state.schema.json` when present

It also creates `devplan/devplan.config.json`, `devplan/reports/.gitkeep`, updates package scripts, and updates `.gitignore`. Use `--dry-run` to preview and `--keep-root-stub` only when a transition stub is needed.
