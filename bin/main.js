#!/usr/bin/env node

import { spawn } from "child_process";
import { join } from "path";

const cli = join(import.meta.dirname, "../cli/index.ts");
const tsx = join(import.meta.dirname, "../node_modules/.bin/tsx");

const child = spawn(tsx, [cli, ...process.argv.slice(2)], {
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
