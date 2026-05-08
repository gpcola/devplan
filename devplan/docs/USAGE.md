# DEVPLAN Usage

Start with `devplan/ROADMAP.md` when you need a readable project view. It shows simple status markers, a roadmap, ballpark timescales, confidence notes, and rough agent effort. Use `devplan/DEVPLAN.md` for the narrative plan and `devplan/DEVPLAN-STATE.json` for exact machine-readable state.

Run commands from the repository root.

```bash
node scripts/devplan.mjs status
node scripts/devplan.mjs next --limit 10
node scripts/devplan.mjs list --status blocked
node scripts/devplan.mjs add-milestone --id launch --title "Launch"
node scripts/devplan.mjs add-item --id auth.login --title "Login" --milestone launch --success "Users can sign in"
node scripts/devplan.mjs update --id auth.login --status done --note "Implemented" --evidence "npm test"
node scripts/devplan.mjs report --output devplan/reports/DEVPLAN-REPORT.md
```

## Recommended reading order

1. `devplan/ROADMAP.md` — quick human status, sequence, estimated timescales, and effort markers.
2. `devplan/DEVPLAN.md` — fuller narrative plan with item IDs.
3. `devplan/DEVPLAN-STATE.json` — canonical machine-readable state for CLI, CI, and agents.
4. `devplan/reports/DEVPLAN-REPORT.md` — generated review snapshot when produced by the report command.

## Statuses

Statuses are configured in `devplan/DEVPLAN-STATE.json` under `rules.valid_statuses`. Default statuses are `planned`, `in_progress`, `done`, `blocked`, `deferred`, and `superseded`.

## Human roadmap markers

Use these markers consistently in `devplan/ROADMAP.md`:

| Marker | Meaning |
| --- | --- |
| 🟢 Done | Complete and evidenced. |
| 🔵 In progress | Currently being worked. |
| 🟡 Planned next | Next sensible work. |
| 🟠 At risk / blocked | Needs an external decision, credential, dependency, or unavailable system. |
| ⚪ Later / polish | Useful but not release-blocking. |
| 🤖 Agent effort | Rough Codex / Claude Code workload estimate. |

## Effort estimates

The roadmap uses approximate effort bands, not guarantees:

| Size | Typical automation estimate |
| --- | --- |
| XS | Less than one Codex run. |
| S | One focused Codex run. |
| M | Two to three Codex runs, or up to one Claude Code quota-heavy session. |
| L | Four to six Codex runs, or one to two Claude Code quota-heavy sessions. |
| XL | Needs its own milestone before work starts. |

Update the roadmap when a change affects visible status, ordering, timing, blockers, or likely automation effort.
