#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const cli = path.join(path.dirname(fileURLToPath(import.meta.url)), "scripts", "devplan.mjs");
const result = spawnSync(process.execPath, [cli, "init", ...process.argv.slice(2)], { stdio: "inherit" });
process.exit(result.status ?? 1);
