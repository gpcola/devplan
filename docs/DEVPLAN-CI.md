# DEVPLAN CI

Use `workflows/devplan-check.yml` as a GitHub Actions template. It checks out the repository, installs Node 22, runs `npm test`, and validates DEVPLAN state.

For repositories without npm tests, keep the validation step and replace `npm test` with the local project test command.
