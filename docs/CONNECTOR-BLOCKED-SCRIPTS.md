# Connector-Blocked Scripts

Some execution environments block package-manager scripts, network calls, or external connectors. DEVPLAN commands intentionally use Node built-ins only, so they can run without installing dependencies.

If a connector blocks `npm run` scripts, call the files directly:

```bash
node scripts/devplan.mjs validate
node scripts/devplan.mjs status
node scripts/devplan.mjs readiness
```

If a target repository cannot use `package.json`, copy the pack files and document these direct commands in the project's contributor guide.
