import { spawn } from "child_process";
import { mkdir, access, readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

function extractGitHubUsername(url: string): string {
  // Handle SSH format: git@github.com:username/repo.git
  const sshMatch = url.match(/git@github\.com:([^/]+)\//);
  if (sshMatch) return sshMatch[1];

  // Handle HTTPS format: https://github.com/username/repo.git
  const httpsMatch = url.match(/github\.com\/([^/]+)\//);
  if (httpsMatch) return httpsMatch[1];

  // Fallback to system username
  return process.env.USER || "user";
}

export async function cloneRepository(
  url: string,
  targetDir: string,
  onProgress: (line: string) => void
): Promise<string> {
  // Extract GitHub username from URL
  const username = extractGitHubUsername(url);
  const baseDir = join(homedir(), "GitHub", username);
  const fullPath = join(baseDir, targetDir);

  // Check if directory already exists
  try {
    await access(join(fullPath, ".bare"));
    throw new Error(`Repository already exists at ${fullPath}`);
  } catch (error: unknown) {
    // If error is not ENOENT (file not found), rethrow
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code !== "ENOENT"
    ) {
      throw error;
    }
    // Otherwise directory doesn't exist, continue with clone
  }

  // Ensure target directory exists
  await mkdir(fullPath, { recursive: true });

  return new Promise((resolve, reject) => {
    const clone = spawn("git", ["clone", "--bare", url, ".bare"], {
      cwd: fullPath,
    });

    clone.stdout?.on("data", (data) => {
      const lines = data.toString().split("\n");
      lines.forEach((line: string) => {
        if (line.trim()) onProgress(line.trim());
      });
    });

    clone.stderr?.on("data", (data) => {
      const lines = data.toString().split("\n");
      lines.forEach((line: string) => {
        if (line.trim()) onProgress(line.trim());
      });
    });

    clone.on("error", reject);

    clone.on("exit", async (code) => {
      if (code === 0) {
        try {
          // Create .git file pointing to .bare
          const { writeFile } = await import("fs/promises");
          await writeFile(join(fullPath, ".git"), "gitdir: ./.bare\n");
          onProgress("Created .git file");

          // Configure remote fetch for origin
          const config = spawn(
            "git",
            [
              "config",
              "remote.origin.fetch",
              "+refs/heads/*:refs/remotes/origin/*",
            ],
            { cwd: fullPath }
          );

          config.on("exit", async (configCode) => {
            if (configCode === 0) {
              onProgress("Configured remote fetch");

              // Create main worktree
              const worktree = spawn(
                "git",
                ["worktree", "add", "__main__", "main"],
                {
                  cwd: fullPath,
                }
              );

              worktree.on("exit", (wtCode) => {
                if (wtCode === 0) {
                  onProgress("Created __main__ worktree");
                  resolve(fullPath);
                } else {
                  // Try master if main doesn't exist
                  const worktreeMaster = spawn(
                    "git",
                    ["worktree", "add", "__main__", "master"],
                    { cwd: fullPath }
                  );

                  worktreeMaster.on("exit", (masterCode) => {
                    if (masterCode === 0) {
                      onProgress("Created __main__ worktree (master)");
                      resolve(fullPath);
                    } else {
                      reject(new Error("Failed to create worktree"));
                    }
                  });
                }
              });
            } else {
              reject(new Error("Failed to configure git"));
            }
          });
        } catch (error) {
          reject(error);
        }
      } else {
        reject(new Error(`Git clone failed with code ${code}`));
      }
    });
  });
}

export async function detectRepositoryType(
  path: string
): Promise<"turborepo" | "nx" | "lerna" | "workspace" | "standard"> {
  try {
    // Check for turborepo
    await access(join(path, "__main__", "turbo.json"));
    return "turborepo";
  } catch {}

  try {
    // Check for nx
    await access(join(path, "__main__", "nx.json"));
    return "nx";
  } catch {}

  try {
    // Check for lerna
    await access(join(path, "__main__", "lerna.json"));
    return "lerna";
  } catch {}

  try {
    // Check for workspace (pnpm, npm, yarn)
    const packageJson = await readFile(
      join(path, "__main__", "package.json"),
      "utf-8"
    );
    const pkg = JSON.parse(packageJson);
    if (pkg.workspaces || pkg.pnpm?.workspaces) {
      return "workspace";
    }
  } catch {}

  return "standard";
}

export async function getRemoteUrl(path: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    const git = spawn("git", ["remote", "get-url", "origin"], { cwd: path });
    let url = "";

    git.stdout?.on("data", (data) => {
      url += data.toString();
    });

    git.on("exit", (code) => {
      if (code === 0) {
        resolve(url.trim());
      } else {
        resolve(undefined);
      }
    });
  });
}

export async function listWorktrees(
  repoPath: string
): Promise<import("./types").Worktree[]> {
  return new Promise((resolve, reject) => {
    const git = spawn("git", ["worktree", "list", "--porcelain"], {
      cwd: repoPath,
    });
    let output = "";

    git.stdout?.on("data", (data) => {
      output += data.toString();
    });

    git.on("exit", (code) => {
      if (code === 0) {
        const worktrees: import("./types").Worktree[] = [];
        const entries = output.split("\n\n").filter(Boolean);

        for (const entry of entries) {
          const lines = entry.split("\n");
          const worktree: Partial<import("./types").Worktree> = {};

          for (const line of lines) {
            if (line.startsWith("worktree ")) {
              worktree.path = line.slice(9);
            } else if (line.startsWith("HEAD ")) {
              worktree.head = line.slice(5);
            } else if (line.startsWith("branch ")) {
              worktree.branch = line.slice(7);
            } else if (line === "bare") {
              worktree.bare = true;
            } else if (line === "detached") {
              worktree.detached = true;
            }
          }

          if (worktree.path) {
            worktrees.push(worktree as import("./types").Worktree);
          }
        }

        resolve(worktrees);
      } else {
        reject(new Error(`Failed to list worktrees: exit code ${code}`));
      }
    });

    git.on("error", reject);
  });
}

export async function listBranches(repoPath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const git = spawn("git", ["branch", "-a", "--format=%(refname:short)"], {
      cwd: repoPath,
    });
    let output = "";

    git.stdout?.on("data", (data) => {
      output += data.toString();
    });

    git.on("exit", (code) => {
      if (code === 0) {
        const branches = output
          .split("\n")
          .filter(Boolean)
          .map((b) => b.trim())
          .filter((b) => !b.startsWith("origin/HEAD"));
        resolve(branches);
      } else {
        reject(new Error(`Failed to list branches: exit code ${code}`));
      }
    });

    git.on("error", reject);
  });
}

export async function updateMainWorktree(repoPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const mainPath = join(repoPath, "__main__");

    // Pull latest changes from origin/main explicitly
    const pull = spawn("git", ["pull", "origin", "main"], { cwd: mainPath });
    let stdout = "";
    let stderr = "";

    pull.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    pull.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    pull.on("exit", (code) => {
      const output = stdout + stderr;

      // Exit code 1 with "Already up to date" is fine
      const isAlreadyUpToDate =
        output.includes("Already up to date") ||
        output.includes("Already up-to-date");

      if (code === 0 || isAlreadyUpToDate) {
        resolve();
      } else {
        // Provide more helpful error message
        const errorMsg =
          stderr.trim() ||
          stdout.trim() ||
          `Failed to pull in __main__: exit code ${code}`;
        reject(new Error(errorMsg));
      }
    });

    pull.on("error", reject);
  });
}

export async function installDependencies(repoPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const mainPath = join(repoPath, "__main__");

    // Install dependencies
    const install = spawn("npm", ["install"], { cwd: mainPath });

    install.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Failed to install dependencies: exit code ${code}`));
      }
    });

    install.on("error", reject);
  });
}

export async function addWorktree(
  repoPath: string,
  worktreeName: string,
  branch?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If no branch specified, create new branch from current HEAD (main)
    // git worktree add <path> creates a new branch with the same name as the directory
    const args = branch
      ? ["worktree", "add", worktreeName, branch]
      : ["worktree", "add", "-b", worktreeName, worktreeName, "main"];

    const git = spawn("git", args, { cwd: repoPath });

    git.on("exit", (code) => {
      if (code === 0) {
        resolve(join(repoPath, worktreeName));
      } else {
        reject(new Error(`Failed to add worktree: exit code ${code}`));
      }
    });

    git.stderr?.on("data", (data) => {
      const message = data.toString();
      if (message.toLowerCase().includes("fatal")) {
        reject(new Error(message));
      }
    });

    git.on("error", reject);
  });
}

export async function removeWorktree(
  repoPath: string,
  worktreeName: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const git = spawn("git", ["worktree", "remove", worktreeName, "--force"], {
      cwd: repoPath,
    });

    git.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Failed to remove worktree: exit code ${code}`));
      }
    });

    git.stderr?.on("data", (data) => {
      const message = data.toString();
      if (message.toLowerCase().includes("fatal")) {
        reject(new Error(message));
      }
    });

    git.on("error", reject);
  });
}
