# DEVPLAN Tracker Pack Development Plan

_Last updated: 2026-05-08_

## Purpose

The DEVPLAN Tracker Pack is a standalone, dependency-free tracker that can be installed into any software repository to keep a human-readable plan (`devplan/DEVPLAN.md`) and machine-readable state (`devplan/DEVPLAN-STATE.json`) aligned.

## Current objective

Ship a production-quality repository pack with a safe installer, robust CLI, validation, reports, release-readiness checks, documentation, examples, tests, and CI.

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

## Must add soon after release

### docs.examples

Document usage, governance, agent workflow rules, CI, migration, blocked connector scripts, release process, and include SaaS, mobile app, and client website examples.

## Update rule

Any pull request that starts, completes, blocks, defers, supersedes, adds, removes, or materially changes tracked work must update `devplan/DEVPLAN-STATE.json` in the same pull request. Completed work must include evidence.
