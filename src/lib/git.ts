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
    if (error && typeof error === "object" && "code" in error && error.code !== "ENOENT") {
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
            ["config", "remote.origin.fetch", "+refs/heads/*:refs/remotes/origin/*"],
            { cwd: fullPath }
          );

          config.on("exit", async (configCode) => {
            if (configCode === 0) {
              onProgress("Configured remote fetch");

              // Create main worktree
              const worktree = spawn("git", ["worktree", "add", "__main__", "main"], {
                cwd: fullPath,
              });

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
