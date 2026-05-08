# DEVPLAN Agent Instructions

Agents must treat `devplan/DEVPLAN-STATE.json` as the source of truth for tracked work. Agents must also keep `devplan/ROADMAP.md` useful for humans when status, timing, blockers, sequence, or effort estimates change.

## Required PR behavior

In the same PR as code or documentation work, update state when you:

- start tracked work: set the item to `in_progress`;
- complete tracked work: set it to `done` and add evidence;
- discover a blocker: set it to `blocked` and add a note explaining the blocker;
- postpone work: set it to `deferred` with a note;
- replace work: set it to `superseded` with a note referencing the replacement;
- create new tracked work: add an item with a title, priority, status, success conditions, and `updated_at`.

## Roadmap update rule

Update `devplan/ROADMAP.md` in the same PR when the work changes any human-facing planning information:

- status marker, milestone order, or next action;
- ballpark delivery timescale;
- risk or blocker description;
- rough effort estimate, including Codex run count or Claude Code quota-heavy session estimate;
- confidence level.

Use the existing marker and effort scale from `devplan/ROADMAP.md`. Do not invent precise delivery dates when the repo only supports a ballpark range. If an external dependency such as npm login, API keys, CI availability, or unavailable local services blocks completion, mark it as a blocker rather than spending more automated runs.

## Evidence rule

A `done` item must include evidence such as a test command, review note, deployment link, or manual verification note.

## Validation rule

Before reporting completion, run:

```bash
node scripts/devplan.mjs validate
node scripts/devplan.mjs readiness
```

If environment limits prevent validation, report that explicitly and say which commands were not run.
