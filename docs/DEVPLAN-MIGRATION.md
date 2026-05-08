# DEVPLAN Migration

1. Copy the pack into the target repository with `node install.mjs --target /path/to/repo`.
2. Edit `DEVPLAN-STATE.json` project metadata.
3. Replace sample milestones and items with project-specific work.
4. Mirror key item IDs in `DEVPLAN.md`.
5. Run `node scripts/devplan.mjs validate`.
6. Commit `DEVPLAN.md`, `DEVPLAN-STATE.json`, scripts, docs, schema, and workflow together.

Use `--force` only after reviewing file differences because it overwrites target files managed by this pack.
