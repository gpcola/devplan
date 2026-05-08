# DEVPLAN Tracker Pack Development Plan

_Last updated: 2026-05-08_

## Purpose

The DEVPLAN Tracker Pack is a standalone, dependency-free tracker that can be installed into any software repository to keep three planning layers aligned:

- `devplan/ROADMAP.md` — quick human-readable roadmap with visual markers, timescales, confidence, and rough agent effort.
- `devplan/DEVPLAN.md` — narrative planning context and tracked item references.
- `devplan/DEVPLAN-STATE.json` — canonical machine-readable state for CLI, CI, and AI agents.

## Current objective

Ship a production-quality repository pack with a safe installer, robust CLI, validation, reports, release-readiness checks, documentation, examples, tests, CI, and a readable roadmap that humans can understand without parsing JSON.

## Release-critical now

### repo.structure

Create the package metadata, license, manifest, schema, scripts, docs, examples, workflow, tests, and remove the source archive after it has been expanded.

### cli.commands

Implement `status`, `validate`, `next`, `report`, `readiness`, `list`, `add-milestone`, `add-item`, `update`, `remove-item`, `link-item`, `protect`, and `init` with Node built-ins only.

### installer.safety

Install safely into a target repository without overwriting existing files unless `--force` is provided, and merge package scripts when `package.json` exists.

### validation.coverage

Validate JSON parsing, supported schema versions, project metadata, status values, unique item IDs, milestone references, required item fields, and DEVPLAN item references.

### ci.tests

Run automated tests and DEVPLAN validation in CI.

### layout.devplan-default

Use `devplan/` as the default installed tracker layout. Commands should work without explicit `--state` and `--plan` flags, while legacy root-file projects should receive a migration warning.

### docs.readable-roadmap

Add a human-readable roadmap layer with easy-to-identify markers, graphical roadmap elements, ballpark timescales, confidence notes, and rough Codex / Claude Code effort estimates.

### release.npm-distribution

Verify the installable distribution path. The documented GitHub and npm install commands must point to the real repository and package. If npm authentication or package naming is still unresolved, record that as a human-gated blocker rather than a coding task.

### validation.install-smoke

Run a clean install smoke test in a throwaway repository after the distribution path is confirmed. The test should verify that tracker installation is safe, default commands run, and the readable roadmap layer is included or intentionally documented.

## Must add soon after release

### docs.examples

Document usage, governance, agent workflow rules, CI, migration, blocked connector scripts, release process, and include SaaS, mobile app, and client website examples.

## Later polish

### cli.roadmap-report

Add CLI support to emit or refresh a human-readable roadmap/report section from `DEVPLAN-STATE.json`, preserving the marker, timescale, confidence, and effort conventions established in `devplan/ROADMAP.md`.

## Update rule

Any pull request that starts, completes, blocks, defers, supersedes, adds, removes, or materially changes tracked work must update `devplan/DEVPLAN-STATE.json` in the same pull request. If the visible project status, sequence, timing, blocker state, or rough automation effort changes, update `devplan/ROADMAP.md` in the same pull request as well. Completed work must include evidence.
