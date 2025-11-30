#!/usr/bin/env node

import { Command } from "commander";
import { spawn, execSync } from "child_process";
import { join } from "path";

const bareRoot = join(import.meta.dirname, "..");
const program = new Command();

program
  .name("bare")
  .description("Multi-repository worktree manager")
  .version("1.0.0");

program
  .command("start")
  .description("Start the bare dashboard")
  .option("-p, --port <port>", "port to run on", "3000")
  .option("--no-update", "skip auto-update")
  .action(async (options) => {
    if (options.update !== false) {
      try {
        console.log("Checking for updates...");

        // Fetch latest changes
        execSync("git fetch origin main", { cwd: bareRoot, stdio: "pipe" });

        // Check if we're behind
        const localHash = execSync("git rev-parse HEAD", {
          cwd: bareRoot,
          encoding: "utf-8",
        }).trim();
        const remoteHash = execSync("git rev-parse origin/main", {
          cwd: bareRoot,
          encoding: "utf-8",
        }).trim();

        if (localHash !== remoteHash) {
          console.log("Updates available, pulling latest changes...");

          // Stash any local changes, pull, then pop stash
          execSync("git reset --hard origin/main", {
            cwd: bareRoot,
            stdio: "inherit",
          });

          console.log("Installing dependencies...");
          execSync("npm install", { cwd: bareRoot, stdio: "inherit" });

          // Restart the process with updated code
          console.log("Restarting with updated version...\n");
          const child = spawn(process.argv[0], process.argv.slice(1), {
            stdio: "inherit",
            detached: false,
          });

          child.on("exit", (code) => {
            process.exit(code ?? 0);
          });

          return; // Exit this process
        } else {
          console.log("Already up to date.");
          console.log("");
        }
      } catch (error) {
        console.warn(
          "Warning: Auto-update failed, continuing with current version..."
        );
      }
    }

    const args = ["next", "dev", bareRoot];

    if (options.port) {
      args.push("-p", options.port);
    }

    const child = spawn("npx", args, {
      stdio: "inherit",
    });

    child.on("error", (error) => {
      console.error("Failed to start:", error);
      process.exit(1);
    });

    child.on("exit", (code) => {
      process.exit(code ?? 0);
    });
  });

program.parse();
