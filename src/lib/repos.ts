import { readFile, writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import type { Repository, RegistryFile } from "./types";

const REGISTRY_DIR = join(homedir(), ".bare-bones");
const REGISTRY_PATH = join(REGISTRY_DIR, "repos.json");

export async function ensureRegistry(): Promise<void> {
  try {
    await mkdir(REGISTRY_DIR, { recursive: true });
    try {
      await readFile(REGISTRY_PATH, "utf-8");
    } catch {
      // File doesn't exist, create it
      await writeFile(
        REGISTRY_PATH,
        JSON.stringify({ repositories: [] }, null, 2)
      );
    }
  } catch (error) {
    throw new Error(`Failed to ensure registry: ${error}`);
  }
}

export async function readRegistry(): Promise<RegistryFile> {
  await ensureRegistry();
  try {
    const content = await readFile(REGISTRY_PATH, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read registry: ${error}`);
  }
}

export async function writeRegistry(registry: RegistryFile): Promise<void> {
  try {
    await writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2));
  } catch (error) {
    throw new Error(`Failed to write registry: ${error}`);
  }
}

export async function getRepositories(): Promise<Repository[]> {
  const registry = await readRegistry();
  return registry.repositories;
}

export async function getRepository(id: string): Promise<Repository | null> {
  const repos = await getRepositories();
  return repos.find((repo) => repo.id === id) || null;
}

export async function addRepository(
  repo: Omit<Repository, "id" | "addedAt" | "lastSynced">
): Promise<Repository> {
  const registry = await readRegistry();

  // Check if repo already exists by path
  const existing = registry.repositories.find((r) => r.path === repo.path);
  if (existing) {
    throw new Error(`Repository already exists: ${repo.path}`);
  }

  const newRepo: Repository = {
    ...repo,
    id: crypto.randomUUID(),
    addedAt: new Date().toISOString(),
    lastSynced: new Date().toISOString(),
  };

  registry.repositories.push(newRepo);
  await writeRegistry(registry);

  return newRepo;
}

export async function removeRepository(id: string): Promise<void> {
  const registry = await readRegistry();
  const index = registry.repositories.findIndex((repo) => repo.id === id);

  if (index === -1) {
    throw new Error(`Repository not found: ${id}`);
  }

  const repo = registry.repositories[index];

  // Delete the directory from disk
  try {
    await rm(repo.path, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Failed to delete directory ${repo.path}:`, error);
    // Continue with removing from registry even if directory deletion fails
  }

  registry.repositories.splice(index, 1);
  await writeRegistry(registry);
}

export async function updateRepository(
  id: string,
  updates: Partial<Omit<Repository, "id" | "addedAt">>
): Promise<Repository> {
  const registry = await readRegistry();
  const index = registry.repositories.findIndex((repo) => repo.id === id);

  if (index === -1) {
    throw new Error(`Repository not found: ${id}`);
  }

  const updatedRepo: Repository = {
    ...registry.repositories[index],
    ...updates,
    lastSynced: new Date().toISOString(),
  };

  registry.repositories[index] = updatedRepo;
  await writeRegistry(registry);

  return updatedRepo;
}
