import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

const CONFIG_DIR = join(homedir(), ".bare-config");
const CONFIG_FILE = join(CONFIG_DIR, "worktree-config.json");

export interface WorktreeConfig {
  symlink?: string[];
  copy?: string[];
}

interface ConfigStore {
  [repoPath: string]: WorktreeConfig;
}

async function readConfigStore(): Promise<ConfigStore> {
  try {
    await mkdir(CONFIG_DIR, { recursive: true });
    const content = await readFile(CONFIG_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function writeConfigStore(store: ConfigStore): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_FILE, JSON.stringify(store, null, 2));
}

export async function readWorktreeConfig(
  repoPath: string
): Promise<WorktreeConfig> {
  const store = await readConfigStore();
  return store[repoPath] || {};
}

export async function writeWorktreeConfig(
  repoPath: string,
  config: WorktreeConfig
): Promise<void> {
  const store = await readConfigStore();
  store[repoPath] = config;
  await writeConfigStore(store);
}
