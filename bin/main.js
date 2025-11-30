#!/usr/bin/env node

import { spawn } from "child_process";
import { join } from "path";

const cliPath = join(import.meta.dirname, "../cli/index.ts");

const child = spawn("npx", ["tsx", cliPath, ...process.argv.slice(2)], {
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
