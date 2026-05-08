# Release Instructions

1. Run `npm test`.
2. Run `node scripts/devplan.mjs validate`.
3. Run `node scripts/devplan.mjs readiness` and resolve any release-critical open or blocked items.
4. Update `CHANGELOG.md` with the release date and notable changes.
5. Tag the release, for example `git tag v1.0.0`.
6. Publish or attach the repository pack using your normal release process.
