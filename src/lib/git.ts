import { execa } from "execa";
import { mkdir, access, readFile, symlink, copyFile, readdir, stat, rm, writeFile } from "fs/promises";
import { join, basename } from "path";
import { homedir } from "os";
import { detectPackageManager, type PackageManager } from "./detect";
import { readWorktreeConfig } from "./worktree-config";

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

  // Clone the repository
  const clone = execa("git", ["clone", "--bare", url, ".bare"], { cwd: fullPath });

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

  await clone;

  // Create .git file pointing to .bare
  await writeFile(join(fullPath, ".git"), "gitdir: ./.bare\n");
  onProgress("Created .git file");

  // Configure remote fetch for origin
  await execa("git", ["config", "remote.origin.fetch", "+refs/heads/*:refs/remotes/origin/*"], { cwd: fullPath });
  onProgress("Configured remote fetch");

  // Create main worktree (try main first, fallback to master)
  try {
    await execa("git", ["worktree", "add", "__main__", "main"], { cwd: fullPath });
    onProgress("Created __main__ worktree");
  } catch {
    // Try master if main doesn't exist
    await execa("git", ["worktree", "add", "__main__", "master"], { cwd: fullPath });
    onProgress("Created __main__ worktree (master)");
  }

  return fullPath;
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
  try {
    const { stdout } = await execa("git", ["remote", "get-url", "origin"], { cwd: path });
    return stdout;
  } catch {
    return undefined;
  }
}

export async function listWorktrees(
  repoPath: string
): Promise<import("./types").Worktree[]> {
  const { stdout } = await execa("git", ["worktree", "list", "--porcelain"], { cwd: repoPath });

  const worktrees: import("./types").Worktree[] = [];
  const entries = stdout.split("\n\n").filter(Boolean);

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

  return worktrees;
}

export async function listBranches(repoPath: string): Promise<string[]> {
  const { stdout } = await execa("git", ["branch", "-a", "--format=%(refname:short)"], { cwd: repoPath });

  return stdout
    .split("\n")
    .filter(Boolean)
    .map((b) => b.trim())
    .filter((b) => !b.startsWith("origin/HEAD"));
}

export interface Remote {
  name: string;
  url: string;
}

export async function listRemotes(repoPath: string): Promise<Remote[]> {
  const { stdout } = await execa("git", ["remote", "-v"], { cwd: repoPath });

  const remotes: Remote[] = [];
  const lines = stdout.split("\n").filter((l) => l.trim().length > 0);

  // Parse output: "origin  https://... (fetch)"
  const seen = new Set<string>();
  for (const line of lines) {
    const match = line.match(/^(\S+)\s+(\S+)\s+\(fetch\)/);
    if (match && !seen.has(match[1])) {
      seen.add(match[1]);
      remotes.push({ name: match[1], url: match[2] });
    }
  }

  return remotes;
}

export async function addRemote(
  repoPath: string,
  name: string,
  url: string
): Promise<void> {
  await execa("git", ["remote", "add", name, url], { cwd: repoPath });
}

export async function removeRemote(repoPath: string, name: string): Promise<void> {
  await execa("git", ["remote", "remove", name], { cwd: repoPath });
}

export async function updateMainWorktree(
  repoPath: string,
  upstreamRemote: string = "origin"
): Promise<void> {
  const mainPath = join(repoPath, "__main__");

  try {
    await execa("git", ["pull", upstreamRemote, "main"], { cwd: mainPath });
  } catch (error: any) {
    // Exit code 1 with "Already up to date" is fine
    const output = error.stdout + error.stderr;
    const isAlreadyUpToDate =
      output.includes("Already up to date") ||
      output.includes("Already up-to-date");

    if (!isAlreadyUpToDate) {
      throw new Error(error.stderr || error.stdout || error.message);
    }
  }
}

export async function installDependencies(
  repoPath: string,
  packageManager?: PackageManager
): Promise<void> {
  const mainPath = join(repoPath, "__main__");

  // Detect package manager if not provided
  const pm = packageManager || (await detectPackageManager(repoPath));

  // Install dependencies
  await execa(pm, ["install"], { cwd: mainPath });
}

export async function addWorktree(
  repoPath: string,
  worktreeName: string,
  branch?: string,
  upstreamRemote: string = "origin"
): Promise<string> {
  let args: string[];

  if (branch) {
    // Use specified branch
    args = ["worktree", "add", worktreeName, branch];
  } else {
    // Check if branch already exists
    const branches = await listBranches(repoPath);
    const branchExists = branches.some(
      (b) => b === worktreeName || b === `${upstreamRemote}/${worktreeName}`
    );

    // Base branch from upstream remote
    const baseBranch = `${upstreamRemote}/main`;

    if (branchExists) {
      // Branch exists, use -B to force create/reset it from upstream/main
      args = ["worktree", "add", "-B", worktreeName, worktreeName, baseBranch];
    } else {
      // Branch doesn't exist, create it from upstream/main
      args = ["worktree", "add", "-b", worktreeName, worktreeName, baseBranch];
    }
  }

  await execa("git", args, { cwd: repoPath });
  return join(repoPath, worktreeName);
}

export async function removeWorktree(
  repoPath: string,
  worktreeName: string
): Promise<void> {
  // Step 1: Remove the worktree
  await execa("git", ["worktree", "remove", worktreeName, "--force"], { cwd: repoPath });

  // Step 2: Delete the branch (ignore errors - branch might not exist or might be checked out elsewhere)
  try {
    await execa("git", ["branch", "-D", worktreeName], { cwd: repoPath });
  } catch {
    // Ignore branch deletion errors
  }
}

async function copyRecursive(src: string, dest: string): Promise<void> {
  const srcStat = await stat(src);

  if (srcStat.isDirectory()) {
    await mkdir(dest, { recursive: true });
    const entries = await readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);

      if (entry.isDirectory()) {
        await copyRecursive(srcPath, destPath);
      } else {
        await copyFile(srcPath, destPath);
      }
    }
  } else {
    await copyFile(src, dest);
  }
}

export async function setupWorktreeFiles(
  repoPath: string,
  worktreeName: string
): Promise<void> {
  const config = await readWorktreeConfig(repoPath);
  const mainPath = join(repoPath, "__main__");
  const worktreePath = join(repoPath, worktreeName);

  // Process symlinks
  if (config.symlink && config.symlink.length > 0) {
    for (const pattern of config.symlink) {
      const sourcePath = join(mainPath, pattern);
      const targetPath = join(worktreePath, pattern);

      try {
        await access(sourcePath);
        // Remove target if it exists
        try {
          await access(targetPath);
          await rm(targetPath, { recursive: true, force: true });
        } catch {
          // Target doesn't exist, that's fine
        }

        // Create parent directory if needed
        const targetDir = join(targetPath, "..");
        await mkdir(targetDir, { recursive: true });

        // Create symlink
        await symlink(sourcePath, targetPath);
      } catch (err) {
        // File doesn't exist in __main__, skip
        console.warn(`Symlink skipped (source not found): ${pattern}`);
      }
    }
  }

  // Process copies
  if (config.copy && config.copy.length > 0) {
    for (const pattern of config.copy) {
      const sourcePath = join(mainPath, pattern);
      const targetPath = join(worktreePath, pattern);

      try {
        await access(sourcePath);

        // Create parent directory if needed
        const targetDir = join(targetPath, "..");
        await mkdir(targetDir, { recursive: true });

        // Copy file or directory
        await copyRecursive(sourcePath, targetPath);
      } catch (err) {
        // File doesn't exist in __main__, skip
        console.warn(`Copy skipped (source not found): ${pattern}`);
      }
    }
  }
}

export async function installWorktreeDependencies(
  repoPath: string,
  worktreeName: string
): Promise<void> {
  const worktreePath = join(repoPath, worktreeName);

  // Detect package manager
  const packageManager = await detectPackageManager(repoPath);

  // Just do a fresh install from warm store (for timing comparison)
  await execa(packageManager, ["install"], { cwd: worktreePath });
}
