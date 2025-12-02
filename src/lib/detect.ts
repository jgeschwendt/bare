import { access } from "fs/promises";
import { join } from "path";

export type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

export async function detectPackageManager(
  repoPath: string
): Promise<PackageManager> {
  const mainPath = join(repoPath, "__main__");

  try {
    // Check for pnpm-lock.yaml
    await access(join(mainPath, "pnpm-lock.yaml"));
    return "pnpm";
  } catch {}

  try {
    // Check for yarn.lock
    await access(join(mainPath, "yarn.lock"));
    return "yarn";
  } catch {}

  try {
    // Check for bun.lockb
    await access(join(mainPath, "bun.lockb"));
    return "bun";
  } catch {}

  try {
    // Check for package-lock.json
    await access(join(mainPath, "package-lock.json"));
    return "npm";
  } catch {}

  // Default to pnpm if no lock file found
  return "pnpm";
}
