# DEVPLAN Governance

## Source-of-truth layers

DEVPLAN deliberately has three levels:

1. `devplan/ROADMAP.md` is the human-readable status and roadmap layer.
2. `devplan/DEVPLAN.md` is the narrative planning layer.
3. `devplan/DEVPLAN-STATE.json` is the canonical machine-readable state used by CLI, CI, and agents.

If these files disagree, update all affected files in the same PR. Treat `DEVPLAN-STATE.json` as canonical for exact item status until validation passes.

## Item governance

- Keep item IDs stable after review because docs, commits, reports, and roadmap entries may reference them.
- Prefer small items with observable success conditions.
- Use `release-critical-now` only for work that blocks release readiness.
- Mark work `blocked` only when the next action requires an external decision, dependency, credential, or unavailable system.
- Use `deferred` for intentionally postponed work and `superseded` for work replaced by another approach.
- Do not delete completed history unless the project explicitly wants a compact state file.

## Roadmap governance

Update `devplan/ROADMAP.md` when any of these change:

- visible status or milestone sequence;
- expected timescale;
- blocker/risk state;
- rough agent effort, such as expected Codex runs or Claude Code quota-heavy sessions;
- confidence level;
- recommended next action.

Roadmap timescales and effort estimates are planning estimates only. They should be honest, ballpark figures based on current repo complexity and known external blockers, not precise delivery promises.

## Documentation governance

The README should explain the package and point readers to the right file. `devplan/docs/USAGE.md` should explain daily use. `devplan/docs/AGENT-INSTRUCTIONS.md` should tell agents exactly which files to update during implementation. Keep release, migration, CI, and examples concise enough to be useful during a live repo session.
