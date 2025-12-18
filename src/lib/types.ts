export interface Repository {
  id: string; // UUID
  name: string; // Repo name (from directory)
  path: string; // Absolute path to repo
  remoteUrl?: string; // Git remote URL
  addedAt: string; // ISO timestamp
  lastAccessed: string; // ISO timestamp
  type?: "turborepo" | "nx" | "lerna" | "workspace" | "standard";
}

export interface Worktree {
  path: string; // Relative path from repo root
  head?: string; // Git HEAD hash
  branch?: string; // refs/heads/branch-name
  bare?: boolean; // Is bare repo
  detached?: boolean; // Detached HEAD
  commitMessage?: string; // Commit message of HEAD
}

export interface RegistryFile {
  repositories: Repository[];
}
