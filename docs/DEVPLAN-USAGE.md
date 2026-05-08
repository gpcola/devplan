# DEVPLAN Usage

Use `DEVPLAN.md` for readable planning context and `DEVPLAN-STATE.json` for exact state. Run commands from the repository root.

```bash
node scripts/devplan.mjs status
node scripts/devplan.mjs next --limit 10
node scripts/devplan.mjs list --status blocked
node scripts/devplan.mjs add-milestone --id launch --title "Launch"
node scripts/devplan.mjs add-item --id auth.login --title "Login" --milestone launch --success "Users can sign in"
node scripts/devplan.mjs update --id auth.login --status done --note "Implemented" --evidence "npm test"
node scripts/devplan.mjs report --output docs/DEVPLAN-REPORT.md
```

Statuses are configured in `rules.valid_statuses`. Default statuses are `planned`, `in_progress`, `done`, `blocked`, `deferred`, and `superseded`.
