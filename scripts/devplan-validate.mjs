#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
const cli = path.join(path.dirname(fileURLToPath(import.meta.url)), "devplan.mjs");
const result = spawnSync(process.execPath, [cli, "validate", ...process.argv.slice(2)], { stdio: "inherit" });
process.exit(result.status ?? 1);
