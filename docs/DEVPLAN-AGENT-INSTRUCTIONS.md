# DEVPLAN Agent Instructions

Agents must treat `DEVPLAN-STATE.json` as the source of truth for tracked work.

## Required PR behavior

In the same PR as code or documentation work, update state when you:

- start tracked work: set the item to `in_progress`;
- complete tracked work: set it to `done` and add evidence;
- discover a blocker: set it to `blocked` and add a note explaining the blocker;
- postpone work: set it to `deferred` with a note;
- replace work: set it to `superseded` with a note referencing the replacement;
- create new tracked work: add an item with a title, priority, status, success conditions, and `updated_at`.

## Evidence rule

A `done` item must include evidence such as a test command, review note, deployment link, or manual verification note.

## Validation rule

Before reporting completion, run:

```bash
node scripts/devplan.mjs validate
node scripts/devplan.mjs readiness
```
